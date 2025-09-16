import kagglehub
import pandas as pd
import numpy as np
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self):
        self.dataset_path = None
        self.processed_data = None
        
    def download_kaggle_dataset(self):
        """Download the Bitext customer support dataset from Kaggle"""
        try:
            logger.info("Downloading Kaggle dataset...")
            path = kagglehub.dataset_download("bitext/bitext-gen-ai-chatbot-customer-support-dataset")
            self.dataset_path = path
            logger.info(f"Dataset downloaded to: {path}")
            return path
        except Exception as e:
            logger.error(f"Failed to download dataset: {str(e)}")
            raise
    
    def process_dataset(self, dataset_path):
        """Process the downloaded dataset for training"""
        try:
            logger.info("Processing dataset...")
            
            # Find CSV files in the dataset directory
            csv_files = []
            for root, dirs, files in os.walk(dataset_path):
                for file in files:
                    if file.endswith('.csv'):
                        csv_files.append(os.path.join(root, file))
            
            if not csv_files:
                raise ValueError("No CSV files found in dataset")
            
            # Load the main dataset file
            df = pd.read_csv(csv_files[0])
            logger.info(f"Loaded dataset with {len(df)} rows")
            
            # Process the data based on expected columns
            # Typical columns: instruction, response, category, etc.
            processed_data = self._clean_and_prepare_data(df)
            
            self.processed_data = processed_data
            return processed_data
            
        except Exception as e:
            logger.error(f"Failed to process dataset: {str(e)}")
            raise
    
    def _clean_and_prepare_data(self, df):
        """Clean and prepare the data for training"""
        try:
            # Check available columns
            logger.info(f"Dataset columns: {df.columns.tolist()}")
            
            # Common column names in customer support datasets
            text_columns = ['instruction', 'input', 'question', 'query', 'text']
            response_columns = ['response', 'output', 'answer', 'reply']
            category_columns = ['category', 'intent', 'label', 'class']
            
            # Find the appropriate columns
            text_col = None
            response_col = None
            category_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if any(tc in col_lower for tc in text_columns) and text_col is None:
                    text_col = col
                elif any(rc in col_lower for rc in response_columns) and response_col is None:
                    response_col = col
                elif any(cc in col_lower for cc in category_columns) and category_col is None:
                    category_col = col
            
            if not text_col or not response_col:
                # Use first two columns as fallback
                text_col = df.columns[0]
                response_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]
            
            logger.info(f"Using columns - Text: {text_col}, Response: {response_col}, Category: {category_col}")
            
            # Clean the data
            df = df.dropna(subset=[text_col, response_col])
            df[text_col] = df[text_col].astype(str).str.strip()
            df[response_col] = df[response_col].astype(str).str.strip()
            
            # Remove empty strings
            df = df[df[text_col] != '']
            df = df[df[response_col] != '']
            
            # Prepare training data
            training_data = {
                'inputs': df[text_col].tolist(),
                'targets': df[response_col].tolist(),
                'categories': df[category_col].tolist() if category_col else None
            }
            
            # Split into train/validation sets
            train_inputs, val_inputs, train_targets, val_targets = train_test_split(
                training_data['inputs'], 
                training_data['targets'], 
                test_size=0.2, 
                random_state=42
            )
            
            processed_data = {
                'train': {
                    'inputs': train_inputs,
                    'targets': train_targets
                },
                'validation': {
                    'inputs': val_inputs,
                    'targets': val_targets
                },
                'full_data': training_data,
                'dataset_info': {
                    'total_samples': len(df),
                    'train_samples': len(train_inputs),
                    'val_samples': len(val_inputs),
                    'text_column': text_col,
                    'response_column': response_col,
                    'category_column': category_col
                }
            }
            
            logger.info(f"Data processed successfully: {processed_data['dataset_info']}")
            return processed_data
            
        except Exception as e:
            logger.error(f"Failed to clean and prepare data: {str(e)}")
            raise
    
    def get_sample_data(self, n=5):
        """Get sample data for testing"""
        if self.processed_data:
            train_data = self.processed_data['train']
            samples = []
            for i in range(min(n, len(train_data['inputs']))):
                samples.append({
                    'input': train_data['inputs'][i],
                    'target': train_data['targets'][i]
                })
            return samples
        return []
