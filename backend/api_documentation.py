"""
API Documentation Generator for the Chatbot Backend
"""
from flask import Flask, jsonify, render_template_string

def generate_api_docs():
    """Generate API documentation"""
    
    docs = {
        "title": "AI Chatbot API Documentation",
        "version": "1.0.0",
        "base_url": "http://localhost:5000/api",
        "endpoints": [
            {
                "path": "/health",
                "method": "GET",
                "description": "Health check endpoint",
                "parameters": [],
                "response_example": {
                    "status": "healthy",
                    "timestamp": "2024-01-01T12:00:00",
                    "models": {
                        "basic_model_loaded": True,
                        "enhanced_model_loaded": False
                    },
                    "version": "1.0.0"
                }
            },
            {
                "path": "/train",
                "method": "POST",
                "description": "Train the chatbot model with Kaggle dataset",
                "parameters": [
                    {
                        "name": "model_type",
                        "type": "string",
                        "required": False,
                        "default": "basic",
                        "description": "Type of model to train ('basic' or 'enhanced')"
                    }
                ],
                "request_example": {
                    "model_type": "enhanced"
                },
                "response_example": {
                    "status": "success",
                    "message": "Enhanced model trained successfully",
                    "model_type": "enhanced",
                    "results": {
                        "accuracy": 0.85,
                        "training_samples": 1000,
                        "vocabulary_size": 5000
                    }
                }
            },
            {
                "path": "/chat",
                "method": "POST",
                "description": "Send a message to the chatbot",
                "parameters": [
                    {
                        "name": "message",
                        "type": "string",
                        "required": True,
                        "description": "User message to send to the chatbot"
                    },
                    {
                        "name": "model_type",
                        "type": "string",
                        "required": False,
                        "default": "basic",
                        "description": "Model to use for response ('basic' or 'enhanced')"
                    },
                    {
                        "name": "session_id",
                        "type": "string",
                        "required": False,
                        "description": "Session ID for conversation tracking"
                    }
                ],
                "request_example": {
                    "message": "Hello, I need help with my account",
                    "model_type": "enhanced",
                    "session_id": "abc123"
                },
                "response_example": {
                    "status": "success",
                    "response": "Hello! I'd be happy to help you with your account. What specific issue are you experiencing?",
                    "session_id": "abc123",
                    "model_type": "enhanced",
                    "response_time": 0.234
                }
            },
            {
                "path": "/model-status",
                "method": "GET",
                "description": "Get current model status and information",
                "parameters": [],
                "response_example": {
                    "models": {
                        "basic": {
                            "loaded": True,
                            "info": {
                                "training_samples": 1000,
                                "vocabulary_size": 5000
                            },
                            "training_history": []
                        },
                        "enhanced": {
                            "loaded": False,
                            "info": {}
                        }
                    }
                }
            },
            {
                "path": "/chat/history/<session_id>",
                "method": "GET",
                "description": "Get chat history for a specific session",
                "parameters": [
                    {
                        "name": "session_id",
                        "type": "string",
                        "required": True,
                        "description": "Session ID to retrieve history for"
                    },
                    {
                        "name": "limit",
                        "type": "integer",
                        "required": False,
                        "default": 20,
                        "description": "Maximum number of messages to return"
                    }
                ],
                "response_example": {
                    "status": "success",
                    "session_id": "abc123",
                    "messages": [],
                    "total_messages": 5
                }
            },
            {
                "path": "/models",
                "method": "GET",
                "description": "Get information about available models",
                "parameters": [],
                "response_example": {
                    "status": "success",
                    "models": {
                        "basic": {
                            "name": "Basic Chatbot",
                            "description": "TF-IDF based similarity matching",
                            "features": ["Fast response", "Simple training"],
                            "loaded": True
                        }
                    }
                }
            },
            {
                "path": "/compare",
                "method": "POST",
                "description": "Compare responses from both models",
                "parameters": [
                    {
                        "name": "message",
                        "type": "string",
                        "required": True,
                        "description": "Message to compare responses for"
                    }
                ],
                "request_example": {
                    "message": "How do I reset my password?"
                },
                "response_example": {
                    "status": "success",
                    "message": "How do I reset my password?",
                    "responses": {
                        "basic": {
                            "response": "To reset your password, go to settings...",
                            "response_time": 0.123,
                            "available": True
                        },
                        "enhanced": {
                            "response": "I can help you reset your password...",
                            "response_time": 0.234,
                            "available": True
                        }
                    }
                }
            }
        ],
        "error_codes": {
            "400": "Bad Request - Invalid input or missing required fields",
            "404": "Not Found - Endpoint or resource not found",
            "405": "Method Not Allowed - HTTP method not supported",
            "429": "Too Many Requests - Rate limit exceeded",
            "500": "Internal Server Error - Server error occurred"
        },
        "rate_limits": {
            "chat": "30 requests per minute",
            "train": "2 requests per 10 minutes",
            "other": "10 requests per minute"
        }
    }
    
    return docs

# HTML template for documentation
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>{{ docs.title }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .endpoint { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 5px; }
        .method { background: #007bff; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; }
        .path { font-family: monospace; font-size: 18px; margin: 10px 0; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .parameter { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 3px; }
        h1, h2, h3 { color: #333; }
    </style>
</head>
<body>
    <h1>{{ docs.title }}</h1>
    <p><strong>Version:</strong> {{ docs.version }}</p>
    <p><strong>Base URL:</strong> <code>{{ docs.base_url }}</code></p>
    
    <h2>Rate Limits</h2>
    <ul>
    {% for endpoint, limit in docs.rate_limits.items() %}
        <li><strong>{{ endpoint }}:</strong> {{ limit }}</li>
    {% endfor %}
    </ul>
    
    <h2>Endpoints</h2>
    {% for endpoint in docs.endpoints %}
    <div class="endpoint">
        <h3>
            <span class="method">{{ endpoint.method }}</span>
            <span class="path">{{ endpoint.path }}</span>
        </h3>
        <p>{{ endpoint.description }}</p>
        
        {% if endpoint.parameters %}
        <h4>Parameters</h4>
        {% for param in endpoint.parameters %}
        <div class="parameter">
            <strong>{{ param.name }}</strong> ({{ param.type }})
            {% if param.required %}<em>required</em>{% else %}<em>optional</em>{% endif %}
            {% if param.default %}<br><strong>Default:</strong> {{ param.default }}{% endif %}
            <br>{{ param.description }}
        </div>
        {% endfor %}
        {% endif %}
        
        {% if endpoint.request_example %}
        <h4>Request Example</h4>
        <pre>{{ endpoint.request_example | tojson(indent=2) }}</pre>
        {% endif %}
        
        <h4>Response Example</h4>
        <pre>{{ endpoint.response_example | tojson(indent=2) }}</pre>
    </div>
    {% endfor %}
    
    <h2>Error Codes</h2>
    <ul>
    {% for code, description in docs.error_codes.items() %}
        <li><strong>{{ code }}:</strong> {{ description }}</li>
    {% endfor %}
    </ul>
</body>
</html>
"""

def create_docs_app():
    """Create Flask app for serving documentation"""
    app = Flask(__name__)
    
    @app.route('/docs')
    def api_docs():
        docs = generate_api_docs()
        return render_template_string(HTML_TEMPLATE, docs=docs)
    
    @app.route('/docs/json')
    def api_docs_json():
        return jsonify(generate_api_docs())
    
    return app

if __name__ == '__main__':
    docs_app = create_docs_app()
    docs_app.run(debug=True, port=5001)
