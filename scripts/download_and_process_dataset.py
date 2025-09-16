#!/usr/bin/env python3
"""
Script to download and process the Kaggle dataset for chatbot training
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from data_processor import DataProcessor
import json
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Download and process the Kaggle dataset"""
    try:
        logger.info("🚀 Starting dataset download and processing...")
        
        # Initialize data processor
        processor = DataProcessor()
        
        # Download dataset
        logger.info("📥 Downloading Kaggle dataset...")
        dataset_path = processor.download_kaggle_dataset()
        
        # Process dataset
        logger.info("🔄 Processing dataset...")
        processed_data = processor.process_dataset(dataset_path)
        
        # Save processed data
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'backend', 'data')
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(output_dir, 'processed_dataset.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(processed_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ Dataset processed and saved to: {output_file}")
        
        # Print dataset statistics
        info = processed_data['dataset_info']
        logger.info("📊 Dataset Statistics:")
        logger.info(f"  - Total samples: {info['total_samples']}")
        logger.info(f"  - Training samples: {info['train_samples']}")
        logger.info(f"  - Validation samples: {info['val_samples']}")
        logger.info(f"  - Text column: {info['text_column']}")
        logger.info(f"  - Response column: {info['response_column']}")
        
        # Show sample data
        logger.info("📝 Sample conversations:")
        samples = processor.get_sample_data(3)
        for i, sample in enumerate(samples, 1):
            logger.info(f"  Sample {i}:")
            logger.info(f"    Input: {sample['input'][:100]}...")
            logger.info(f"    Target: {sample['target'][:100]}...")
        
        logger.info("🎉 Dataset processing completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Dataset processing failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
