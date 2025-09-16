"""
Enhanced chatbot model with advanced NLP techniques
"""
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
import nltk
import re
import string
from collections import Counter
import logging

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger')

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer

logger = logging.getLogger(__name__)

class EnhancedChatbotModel:
    """Enhanced chatbot model with better NLP processing"""
    
    def __init__(self):
        self.vectorizer = None
        self.intent_classifier = None
        self.response_matcher = None
        self.stemmer = PorterStemmer()
        self.stop_words = set(stopwords.words('english'))
        self.intents_db = {}
        self.responses_db = []
        self.inputs_db = []
        self.is_trained = False
        
    def advanced_preprocess(self, text):
        """Advanced text preprocessing with NLP techniques"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        
        # Tokenize
        tokens = word_tokenize(text)
        
        # Remove stopwords and stem
        processed_tokens = []
        for token in tokens:
            if token not in self.stop_words and len(token) > 2:
                stemmed = self.stemmer.stem(token)
                processed_tokens.append(stemmed)
        
        return ' '.join(processed_tokens)
    
    def extract_intent_features(self, texts):
        """Extract features for intent classification"""
        # Keywords that might indicate different intents
        intent_keywords = {
            'greeting': ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
            'help': ['help', 'assist', 'support', 'problem', 'issue'],
            'account': ['account', 'profile', 'login', 'password', 'username'],
            'billing': ['bill', 'payment', 'charge', 'refund', 'subscription'],
            'technical': ['error', 'bug', 'not working', 'broken', 'fix'],
            'information': ['what', 'how', 'when', 'where', 'why', 'info']
        }
        
        features = []
        for text in texts:
            text_lower = text.lower()
            feature_vector = []
            
            # Intent keyword features
            for intent, keywords in intent_keywords.items():
                score = sum(1 for keyword in keywords if keyword in text_lower)
                feature_vector.append(score)
            
            # Length features
            feature_vector.append(len(text.split()))  # Word count
            feature_vector.append(len(text))  # Character count
            
            # Question features
            feature_vector.append(1 if '?' in text else 0)
            feature_vector.append(1 if text_lower.startswith(('what', 'how', 'when', 'where', 'why')) else 0)
            
            features.append(feature_vector)
        
        return np.array(features)
    
    def train_enhanced(self, processed_data):
        """Train the enhanced model"""
        try:
            logger.info("Training enhanced chatbot model...")
            
            train_data = processed_data['train']
            
            # Preprocess texts
            processed_inputs = [self.advanced_preprocess(inp) for inp in train_data['inputs']]
            self.inputs_db = processed_inputs
            self.responses_db = train_data['targets']
            
            # Create TF-IDF vectorizer with better parameters
            self.vectorizer = TfidfVectorizer(
                max_features=10000,
                ngram_range=(1, 3),
                min_df=2,
                max_df=0.95,
                stop_words='english',
                lowercase=True,
                sublinear_tf=True
            )
            
            # Fit vectorizer
            X_tfidf = self.vectorizer.fit_transform(processed_inputs)
            
            # Extract intent features
            X_intent = self.extract_intent_features(train_data['inputs'])
            
            # Combine features
            X_combined = np.hstack([X_tfidf.toarray(), X_intent])
            
            # Train intent classifier
            self.intent_classifier = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                max_depth=10
            )
            
            # Create pseudo-labels for intent classification
            y_intent = self._create_intent_labels(train_data['inputs'])
            self.intent_classifier.fit(X_combined, y_intent)
            
            # Train response matcher (using logistic regression for similarity scoring)
            self.response_matcher = LogisticRegression(random_state=42, max_iter=1000)
            
            # Create training pairs for response matching
            X_response, y_response = self._create_response_pairs(X_tfidf)
            self.response_matcher.fit(X_response, y_response)
            
            self.is_trained = True
            
            # Calculate accuracy
            train_accuracy = self.intent_classifier.score(X_combined, y_intent)
            
            logger.info(f"Enhanced model training completed. Accuracy: {train_accuracy:.4f}")
            
            return {
                'accuracy': train_accuracy,
                'training_samples': len(train_data['inputs']),
                'vocabulary_size': len(self.vectorizer.vocabulary_),
                'intent_classes': len(set(y_intent))
            }
            
        except Exception as e:
            logger.error(f"Enhanced training failed: {str(e)}")
            raise
    
    def _create_intent_labels(self, inputs):
        """Create pseudo-labels for intent classification"""
        labels = []
        for inp in inputs:
            inp_lower = inp.lower()
            
            if any(word in inp_lower for word in ['hello', 'hi', 'hey']):
                labels.append(0)  # greeting
            elif any(word in inp_lower for word in ['help', 'assist', 'support']):
                labels.append(1)  # help
            elif any(word in inp_lower for word in ['account', 'login', 'password']):
                labels.append(2)  # account
            elif any(word in inp_lower for word in ['bill', 'payment', 'charge']):
                labels.append(3)  # billing
            elif any(word in inp_lower for word in ['error', 'bug', 'broken']):
                labels.append(4)  # technical
            else:
                labels.append(5)  # general
        
        return np.array(labels)
    
    def _create_response_pairs(self, X_tfidf):
        """Create training pairs for response matching"""
        n_samples = X_tfidf.shape[0]
        
        # Positive pairs (input matches its response)
        X_pos = X_tfidf
        y_pos = np.ones(n_samples)
        
        # Negative pairs (input with random response)
        indices = np.random.permutation(n_samples)
        X_neg = X_tfidf[indices]
        y_neg = np.zeros(n_samples)
        
        # Combine positive and negative pairs
        X_response = np.vstack([X_pos, X_neg])
        y_response = np.hstack([y_pos, y_neg])
        
        return X_response, y_response
    
    def generate_enhanced_response(self, user_input):
        """Generate response using enhanced model"""
        if not self.is_trained:
            return "I'm still learning! Please train me first."
        
        try:
            # Preprocess input
            processed_input = self.advanced_preprocess(user_input)
            
            # Vectorize input
            user_tfidf = self.vectorizer.transform([processed_input])
            user_intent = self.extract_intent_features([user_input])
            user_combined = np.hstack([user_tfidf.toarray(), user_intent])
            
            # Predict intent
            intent_proba = self.intent_classifier.predict_proba(user_combined)[0]
            predicted_intent = np.argmax(intent_proba)
            intent_confidence = np.max(intent_proba)
            
            # Find best matching response using cosine similarity
            input_vectors = self.vectorizer.transform(self.inputs_db)
            similarities = cosine_similarity(user_tfidf, input_vectors).flatten()
            
            # Weight similarities by intent confidence
            weighted_similarities = similarities * (0.7 + 0.3 * intent_confidence)
            
            # Get top matches
            top_indices = np.argsort(weighted_similarities)[-3:][::-1]
            best_idx = top_indices[0]
            best_similarity = weighted_similarities[best_idx]
            
            # Response selection logic
            if best_similarity < 0.1:
                return self._get_fallback_response(predicted_intent)
            
            response = self.responses_db[best_idx]
            
            # Add context-aware modifications
            response = self._enhance_response(response, predicted_intent, intent_confidence)
            
            logger.info(f"Generated response - Intent: {predicted_intent}, Confidence: {intent_confidence:.3f}, Similarity: {best_similarity:.3f}")
            
            return response
            
        except Exception as e:
            logger.error(f"Enhanced response generation failed: {str(e)}")
            return "I'm experiencing some technical difficulties. Please try again."
    
    def _get_fallback_response(self, intent):
        """Get fallback response based on predicted intent"""
        fallback_responses = {
            0: "Hello! How can I help you today?",  # greeting
            1: "I'd be happy to help you. Could you please provide more details?",  # help
            2: "For account-related issues, please check your account settings or contact support.",  # account
            3: "For billing inquiries, please review your billing information or contact our billing department.",  # billing
            4: "I understand you're experiencing technical issues. Please try refreshing or contact technical support.",  # technical
            5: "I'm not sure I understand. Could you please rephrase your question?"  # general
        }
        return fallback_responses.get(intent, "I'm not sure how to help with that. Could you please be more specific?")
    
    def _enhance_response(self, response, intent, confidence):
        """Enhance response based on intent and confidence"""
        if confidence > 0.8:
            # High confidence - add confident language
            if intent == 0:  # greeting
                response = f"Hello! {response}"
            elif intent == 1:  # help
                response = f"I can definitely help with that. {response}"
        elif confidence < 0.5:
            # Low confidence - add uncertainty language
            response = f"I think this might help: {response}"
        
        return response
