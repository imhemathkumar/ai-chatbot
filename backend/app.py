from flask import Flask, request, jsonify, session
from flask_cors import CORS
import os
import logging
from datetime import datetime, timedelta
import json
import time
from functools import wraps
import uuid

# Import our custom modules
from chatbot_model import ChatbotModel
from enhanced_model import EnhancedChatbotModel
from data_processor import DataProcessor

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize chatbot models
basic_chatbot = ChatbotModel()
enhanced_chatbot = EnhancedChatbotModel()
data_processor = DataProcessor()

# In-memory storage for rate limiting and chat sessions
rate_limit_storage = {}
chat_sessions = {}

def rate_limit(max_requests=10, window_minutes=1):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr
            current_time = datetime.now()
            
            # Clean old entries
            if client_ip in rate_limit_storage:
                rate_limit_storage[client_ip] = [
                    req_time for req_time in rate_limit_storage[client_ip]
                    if current_time - req_time < timedelta(minutes=window_minutes)
                ]
            else:
                rate_limit_storage[client_ip] = []
            
            # Check rate limit
            if len(rate_limit_storage[client_ip]) >= max_requests:
                return jsonify({
                    'status': 'error',
                    'message': 'Rate limit exceeded. Please try again later.',
                    'retry_after': window_minutes * 60
                }), 429
            
            # Add current request
            rate_limit_storage[client_ip].append(current_time)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_json(*required_fields):
    """Validate JSON request decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({
                    'status': 'error',
                    'message': 'Request must be JSON'
                }), 400
            
            data = request.get_json()
            if not data:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid JSON data'
                }), 400
            
            # Check required fields
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'models': {
            'basic_model_loaded': basic_chatbot.is_model_loaded(),
            'enhanced_model_loaded': enhanced_chatbot.is_trained
        },
        'version': '1.0.0'
    })

@app.route('/api/train', methods=['POST'])
@rate_limit(max_requests=2, window_minutes=10)  # Limit training requests
def train_model():
    """Train the chatbot model with Kaggle dataset"""
    try:
        data = request.get_json() or {}
        model_type = data.get('model_type', 'basic')  # 'basic' or 'enhanced'
        
        logger.info(f"Starting {model_type} model training...")
        
        # Download and process dataset
        dataset_path = data_processor.download_kaggle_dataset()
        processed_data = data_processor.process_dataset(dataset_path)
        
        # Train the selected model
        if model_type == 'enhanced':
            training_results = enhanced_chatbot.train_enhanced(processed_data)
        else:
            training_results = basic_chatbot.train(processed_data)
        
        return jsonify({
            'status': 'success',
            'message': f'{model_type.capitalize()} model trained successfully',
            'model_type': model_type,
            'results': training_results,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Training failed: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/chat', methods=['POST'])
@rate_limit(max_requests=30, window_minutes=1)
@validate_json('message')
def chat():
    """Handle chat messages with session management"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        model_type = data.get('model_type', 'basic')
        session_id = data.get('session_id') or str(uuid.uuid4())
        
        if not user_message:
            return jsonify({
                'status': 'error',
                'message': 'Message cannot be empty'
            }), 400
        
        if len(user_message) > 1000:
            return jsonify({
                'status': 'error',
                'message': 'Message too long (max 1000 characters)'
            }), 400
        
        # Initialize session if not exists
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                'created_at': datetime.now(),
                'messages': [],
                'model_type': model_type
            }
        
        # Generate response using the selected model
        start_time = time.time()
        
        if model_type == 'enhanced' and enhanced_chatbot.is_trained:
            response = enhanced_chatbot.generate_enhanced_response(user_message)
        elif basic_chatbot.is_model_loaded():
            response = basic_chatbot.generate_response(user_message)
        else:
            response = "I'm not trained yet. Please train me first using the /api/train endpoint."
        
        response_time = time.time() - start_time
        
        # Store conversation in session
        conversation_entry = {
            'timestamp': datetime.now().isoformat(),
            'user_message': user_message,
            'bot_response': response,
            'model_type': model_type,
            'response_time': response_time
        }
        
        chat_sessions[session_id]['messages'].append(conversation_entry)
        
        # Keep only last 50 messages per session
        if len(chat_sessions[session_id]['messages']) > 50:
            chat_sessions[session_id]['messages'] = chat_sessions[session_id]['messages'][-50:]
        
        return jsonify({
            'status': 'success',
            'response': response,
            'session_id': session_id,
            'model_type': model_type,
            'response_time': round(response_time, 3),
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Chat error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/model-status', methods=['GET'])
def model_status():
    """Get current model status"""
    basic_info = basic_chatbot.get_model_info() if basic_chatbot.is_model_loaded() else {}
    
    return jsonify({
        'models': {
            'basic': {
                'loaded': basic_chatbot.is_model_loaded(),
                'info': basic_info,
                'training_history': basic_chatbot.get_training_history()
            },
            'enhanced': {
                'loaded': enhanced_chatbot.is_trained,
                'info': {
                    'trained_at': datetime.now().isoformat() if enhanced_chatbot.is_trained else None
                }
            }
        },
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/chat/history/<session_id>', methods=['GET'])
def get_chat_history(session_id):
    """Get chat history for a session"""
    if session_id not in chat_sessions:
        return jsonify({
            'status': 'error',
            'message': 'Session not found'
        }), 404
    
    session_data = chat_sessions[session_id]
    limit = request.args.get('limit', 20, type=int)
    
    return jsonify({
        'status': 'success',
        'session_id': session_id,
        'created_at': session_data['created_at'].isoformat(),
        'model_type': session_data['model_type'],
        'messages': session_data['messages'][-limit:],
        'total_messages': len(session_data['messages'])
    })

@app.route('/api/chat/clear/<session_id>', methods=['DELETE'])
def clear_chat_history(session_id):
    """Clear chat history for a session"""
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return jsonify({
            'status': 'success',
            'message': 'Chat history cleared'
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Session not found'
        }), 404

@app.route('/api/models', methods=['GET'])
def get_available_models():
    """Get information about available models"""
    return jsonify({
        'status': 'success',
        'models': {
            'basic': {
                'name': 'Basic Chatbot',
                'description': 'TF-IDF based similarity matching with cosine similarity',
                'features': ['Fast response', 'Simple training', 'Good for basic queries'],
                'loaded': basic_chatbot.is_model_loaded()
            },
            'enhanced': {
                'name': 'Enhanced Chatbot',
                'description': 'Advanced NLP with intent classification and enhanced preprocessing',
                'features': ['Intent recognition', 'Advanced preprocessing', 'Better context understanding'],
                'loaded': enhanced_chatbot.is_trained
            }
        }
    })

@app.route('/api/compare', methods=['POST'])
@validate_json('message')
def compare_models():
    """Compare responses from both models"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({
                'status': 'error',
                'message': 'Message cannot be empty'
            }), 400
        
        responses = {}
        
        # Get response from basic model
        if basic_chatbot.is_model_loaded():
            start_time = time.time()
            basic_response = basic_chatbot.generate_response(user_message)
            basic_time = time.time() - start_time
            
            responses['basic'] = {
                'response': basic_response,
                'response_time': round(basic_time, 3),
                'available': True
            }
        else:
            responses['basic'] = {
                'response': 'Model not trained',
                'response_time': 0,
                'available': False
            }
        
        # Get response from enhanced model
        if enhanced_chatbot.is_trained:
            start_time = time.time()
            enhanced_response = enhanced_chatbot.generate_enhanced_response(user_message)
            enhanced_time = time.time() - start_time
            
            responses['enhanced'] = {
                'response': enhanced_response,
                'response_time': round(enhanced_time, 3),
                'available': True
            }
        else:
            responses['enhanced'] = {
                'response': 'Model not trained',
                'response_time': 0,
                'available': False
            }
        
        return jsonify({
            'status': 'success',
            'message': user_message,
            'responses': responses,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Model comparison error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Comparison failed: {str(e)}'
        }), 500

@app.route('/api/dataset/info', methods=['GET'])
def get_dataset_info():
    """Get information about the processed dataset"""
    try:
        data_file = os.path.join('data', 'processed_dataset.json')
        
        if os.path.exists(data_file):
            with open(data_file, 'r', encoding='utf-8') as f:
                processed_data = json.load(f)
            
            dataset_info = processed_data.get('dataset_info', {})
            sample_data = data_processor.get_sample_data(5)
            
            return jsonify({
                'status': 'success',
                'dataset_available': True,
                'info': dataset_info,
                'samples': sample_data,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'status': 'success',
                'dataset_available': False,
                'message': 'Dataset not processed yet',
                'timestamp': datetime.now().isoformat()
            })
    
    except Exception as e:
        logger.error(f"Dataset info error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to get dataset info: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found',
        'timestamp': datetime.now().isoformat()
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'status': 'error',
        'message': 'Method not allowed',
        'timestamp': datetime.now().isoformat()
    }), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error',
        'timestamp': datetime.now().isoformat()
    }), 500

def cleanup_old_sessions():
    """Clean up old chat sessions"""
    current_time = datetime.now()
    sessions_to_remove = []
    
    for session_id, session_data in chat_sessions.items():
        if current_time - session_data['created_at'] > timedelta(hours=24):
            sessions_to_remove.append(session_id)
    
    for session_id in sessions_to_remove:
        del chat_sessions[session_id]
    
    logger.info(f"Cleaned up {len(sessions_to_remove)} old sessions")

# Run cleanup on startup
cleanup_old_sessions()

if __name__ == '__main__':
    # Try to load existing models on startup
    if basic_chatbot.load_model():
        logger.info("✅ Basic model loaded on startup")
    else:
        logger.info("⚠️  No basic model found")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
