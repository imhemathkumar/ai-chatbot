import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import pickle
import os
import logging
from datetime import datetime
import re
import string

logger = logging.getLogger(__name__)

class ChatbotModel:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.responses_db = []
        self.inputs_db = []
        self.is_trained = False
        self.model_info = {}
        self.training_history = []
        
    def preprocess_text(self, text):
        """Preprocess text for better matching"""
        # Convert to lowercase
        text = text.lower()
        # Remove punctuation
        text = text.translate(str.maketrans('', '', string.punctuation))
        # Remove extra whitespace
        text = ' '.join(text.split())
        return text
    
    def train(self, processed_data):
        """Train the chatbot model"""
        try:
            logger.info("Starting model training...")
            
            train_data = processed_data['train']
            val_data = processed_data['validation']
            
            # Store the training data for similarity matching
            self.inputs_db = [self.preprocess_text(inp) for inp in train_data['inputs']]
            self.responses_db = train_data['targets']
            
            # Create TF-IDF vectorizer
            self.vectorizer = TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                ngram_range=(1, 2),
                lowercase=True
            )
            
            # Fit vectorizer on training inputs
            X_train = self.vectorizer.fit_transform(self.inputs_db)
            
            # Train a simple classifier for intent recognition (optional)
            self.model = MultinomialNB()
            
            # Create dummy labels for classification (can be improved with actual categories)
            y_train = np.arange(len(self.inputs_db)) % 10  # Simple grouping
            self.model.fit(X_train, y_train)
            
            # Calculate training metrics
            X_val = self.vectorizer.transform([self.preprocess_text(inp) for inp in val_data['inputs']])
            train_score = self.model.score(X_train, y_train)
            
            # Store model info
            self.model_info = {
                'training_samples': len(train_data['inputs']),
                'validation_samples': len(val_data['inputs']),
                'vocabulary_size': len(self.vectorizer.vocabulary_),
                'train_accuracy': train_score,
                'trained_at': datetime.now().isoformat()
            }
            
            # Store training history
            training_record = {
                'timestamp': datetime.now().isoformat(),
                'samples': len(train_data['inputs']),
                'accuracy': train_score,
                'status': 'completed'
            }
            self.training_history.append(training_record)
            
            self.is_trained = True
            logger.info(f"Model training completed. Accuracy: {train_score:.4f}")
            
            # Save model
            self.save_model()
            
            return {
                'accuracy': train_score,
                'training_samples': len(train_data['inputs']),
                'vocabulary_size': len(self.vectorizer.vocabulary_)
            }
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            training_record = {
                'timestamp': datetime.now().isoformat(),
                'status': 'failed',
                'error': str(e)
            }
            self.training_history.append(training_record)
            raise
    
    def generate_response(self, user_input):
        """Generate response for user input"""
        if not self.is_trained:
            return "I'm still learning! Please train me first."
        
        try:
            # Preprocess user input
            processed_input = self.preprocess_text(user_input)
            
            # Vectorize user input
            user_vector = self.vectorizer.transform([processed_input])
            
            # Calculate similarity with all training inputs
            input_vectors = self.vectorizer.transform(self.inputs_db)
            similarities = cosine_similarity(user_vector, input_vectors).flatten()
            
            # Find best match
            best_match_idx = np.argmax(similarities)
            best_similarity = similarities[best_match_idx]
            
            # If similarity is too low, provide a default response
            if best_similarity < 0.1:
                return "I'm not sure how to help with that. Could you please rephrase your question?"
            
            # Return the corresponding response
            response = self.responses_db[best_match_idx]
            
            # Add some personality to the response
            if best_similarity > 0.8:
                confidence = "high"
            elif best_similarity > 0.5:
                confidence = "medium"
            else:
                confidence = "low"
            
            logger.info(f"Generated response with {confidence} confidence ({best_similarity:.3f})")
            
            return response
            
        except Exception as e:
            logger.error(f"Response generation failed: {str(e)}")
            return "I'm experiencing some technical difficulties. Please try again."
    
    def is_model_loaded(self):
        """Check if model is loaded and ready"""
        return self.is_trained and self.model is not None and self.vectorizer is not None
    
    def get_model_info(self):
        """Get model information"""
        return self.model_info
    
    def get_training_history(self):
        """Get training history"""
        return self.training_history
    
    def save_model(self):
        """Save the trained model"""
        try:
            os.makedirs('models', exist_ok=True)
            
            model_data = {
                'model': self.model,
                'vectorizer': self.vectorizer,
                'inputs_db': self.inputs_db,
                'responses_db': self.responses_db,
                'model_info': self.model_info,
                'training_history': self.training_history
            }
            
            with open('models/chatbot_model.pkl', 'wb') as f:
                pickle.dump(model_data, f)
            
            logger.info("Model saved successfully")
            
        except Exception as e:
            logger.error(f"Failed to save model: {str(e)}")
    
    def load_model(self):
        """Load a previously trained model"""
        try:
            if os.path.exists('models/chatbot_model.pkl'):
                with open('models/chatbot_model.pkl', 'rb') as f:
                    model_data = pickle.load(f)
                
                self.model = model_data['model']
                self.vectorizer = model_data['vectorizer']
                self.inputs_db = model_data['inputs_db']
                self.responses_db = model_data['responses_db']
                self.model_info = model_data.get('model_info', {})
                self.training_history = model_data.get('training_history', [])
                self.is_trained = True
                
                logger.info("Model loaded successfully")
                return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
        
        return False
