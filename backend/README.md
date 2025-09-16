# AI Chatbot Backend

This Flask backend provides API endpoints for training and interacting with an AI chatbot using the Bitext customer support dataset from Kaggle.

## Setup

1. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

2. Set up Kaggle API credentials (optional, for automatic dataset download):
\`\`\`bash
# Place your kaggle.json file in ~/.kaggle/
# Or set environment variables:
export KAGGLE_USERNAME=your_username
export KAGGLE_KEY=your_api_key
\`\`\`

3. Run the server:
\`\`\`bash
python run.py
\`\`\`

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status and model information

### Train Model
- **POST** `/api/train`
- Downloads Kaggle dataset and trains the chatbot model
- Returns training results and metrics

### Chat
- **POST** `/api/chat`
- Send a message to the chatbot
- Request body: `{"message": "your message here"}`
- Returns chatbot response

### Model Status
- **GET** `/api/model-status`
- Returns current model status and training history

## Features

- Automatic Kaggle dataset download and processing
- TF-IDF vectorization for text similarity
- Cosine similarity matching for response generation
- Model persistence (save/load trained models)
- Comprehensive logging and error handling
- CORS enabled for frontend integration

## Dataset

Uses the "bitext-gen-ai-chatbot-customer-support-dataset" from Kaggle, which contains customer support conversations for training the chatbot.
