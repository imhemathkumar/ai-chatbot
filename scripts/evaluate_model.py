#!/usr/bin/env python3
"""
Script to evaluate the trained chatbot model
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from chatbot_model import ChatbotModel
from enhanced_model import EnhancedChatbotModel
import json
import logging
import numpy as np
from sklearn.metrics import accuracy_score, classification_report

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def evaluate_responses(model, test_cases):
    """Evaluate model responses on test cases"""
    logger.info("🧪 Evaluating model responses...")
    
    results = []
    for i, (input_text, expected_keywords) in enumerate(test_cases, 1):
        response = model.generate_response(input_text)
        
        # Simple keyword-based evaluation
        keyword_match = any(keyword.lower() in response.lower() for keyword in expected_keywords)
        
        results.append({
            'input': input_text,
            'response': response,
            'expected_keywords': expected_keywords,
            'keyword_match': keyword_match
        })
        
        logger.info(f"  Test {i}:")
        logger.info(f"    Input: {input_text}")
        logger.info(f"    Response: {response}")
        logger.info(f"    Expected keywords: {expected_keywords}")
        logger.info(f"    Match: {'✅' if keyword_match else '❌'}")
    
    accuracy = sum(r['keyword_match'] for r in results) / len(results)
    logger.info(f"📊 Response accuracy: {accuracy:.2%}")
    
    return results, accuracy

def main():
    """Evaluate the chatbot models"""
    try:
        logger.info("📈 Starting model evaluation...")
        
        # Load processed data
        data_file = os.path.join(os.path.dirname(__file__), '..', 'backend', 'data', 'processed_dataset.json')
        
        if not os.path.exists(data_file):
            logger.error("❌ No processed data found. Please run dataset processing first.")
            sys.exit(1)
        
        with open(data_file, 'r', encoding='utf-8') as f:
            processed_data = json.load(f)
        
        # Test cases for evaluation
        test_cases = [
            ("Hello, I need help", ["hello", "help", "assist"]),
            ("How do I reset my password?", ["password", "reset", "account"]),
            ("What are your business hours?", ["hours", "time", "open"]),
            ("I want to cancel my subscription", ["cancel", "subscription", "billing"]),
            ("The app is not working", ["error", "technical", "support"]),
            ("Thank you for your help", ["thank", "welcome", "glad"]),
            ("How much does it cost?", ["cost", "price", "billing"]),
            ("I can't log in to my account", ["login", "account", "password"])
        ]
        
        # Evaluate basic model
        logger.info("🤖 Evaluating basic chatbot model...")
        basic_model = ChatbotModel()
        
        if basic_model.load_model():
            logger.info("✅ Basic model loaded")
            basic_results, basic_accuracy = evaluate_responses(basic_model, test_cases)
        else:
            logger.info("⚠️  Training basic model...")
            basic_model.train(processed_data)
            basic_results, basic_accuracy = evaluate_responses(basic_model, test_cases)
        
        # Evaluate enhanced model
        logger.info("🧠 Evaluating enhanced chatbot model...")
        enhanced_model = EnhancedChatbotModel()
        
        logger.info("⚠️  Training enhanced model...")
        enhanced_model.train_enhanced(processed_data)
        enhanced_results, enhanced_accuracy = evaluate_responses(enhanced_model, test_cases)
        
        # Compare results
        logger.info("📊 Model Comparison:")
        logger.info(f"  Basic Model Accuracy: {basic_accuracy:.2%}")
        logger.info(f"  Enhanced Model Accuracy: {enhanced_accuracy:.2%}")
        logger.info(f"  Improvement: {(enhanced_accuracy - basic_accuracy):.2%}")
        
        # Save evaluation results
        evaluation_results = {
            'basic_model': {
                'accuracy': basic_accuracy,
                'results': basic_results
            },
            'enhanced_model': {
                'accuracy': enhanced_accuracy,
                'results': enhanced_results
            },
            'test_cases': test_cases
        }
        
        output_file = os.path.join(os.path.dirname(__file__), '..', 'backend', 'data', 'evaluation_results.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(evaluation_results, f, indent=2, ensure_ascii=False)
        
        logger.info(f"💾 Evaluation results saved to: {output_file}")
        logger.info("🎉 Model evaluation completed!")
        
    except Exception as e:
        logger.error(f"❌ Model evaluation failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
