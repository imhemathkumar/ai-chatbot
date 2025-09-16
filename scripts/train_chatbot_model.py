#!/usr/bin/env python3
"""
Script to train the chatbot model with enhanced NLP techniques
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from chatbot_model import ChatbotModel
from data_processor import DataProcessor
import json
import logging
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_processed_data():
    """Load processed dataset from file"""
    data_file = os.path.join(os.path.dirname(__file__), '..', 'backend', 'data', 'processed_dataset.json')
    
    if os.path.exists(data_file):
        logger.info(f"📂 Loading processed data from: {data_file}")
        with open(data_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        logger.info("📥 No processed data found. Processing dataset...")
        processor = DataProcessor()
        dataset_path = processor.download_kaggle_dataset()
        return processor.process_dataset(dataset_path)

def main():
    """Train the chatbot model"""
    try:
        logger.info("🤖 Starting chatbot model training...")
        
        # Load processed data
        processed_data = load_processed_data()
        
        # Initialize model
        logger.info("🧠 Initializing chatbot model...")
        chatbot = ChatbotModel()
        
        # Start training
        logger.info("🏋️ Training model...")
        start_time = time.time()
        
        training_results = chatbot.train(processed_data)
        
        training_time = time.time() - start_time
        
        # Display results
        logger.info("✅ Training completed!")
        logger.info(f"⏱️  Training time: {training_time:.2f} seconds")
        logger.info(f"📊 Training accuracy: {training_results['accuracy']:.4f}")
        logger.info(f"📚 Training samples: {training_results['training_samples']}")
        logger.info(f"🔤 Vocabulary size: {training_results['vocabulary_size']}")
        
        # Test the model with sample inputs
        logger.info("🧪 Testing model with sample inputs...")
        test_inputs = [
            "Hello, I need help with my account",
            "How can I reset my password?",
            "What are your business hours?",
            "I want to cancel my subscription",
            "How do I contact customer support?"
        ]
        
        for i, test_input in enumerate(test_inputs, 1):
            response = chatbot.generate_response(test_input)
            logger.info(f"  Test {i}:")
            logger.info(f"    Input: {test_input}")
            logger.info(f"    Response: {response}")
        
        logger.info("🎉 Model training and testing completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Model training failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
