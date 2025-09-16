#!/usr/bin/env python3
"""
Run script for the AI Chatbot Flask backend
"""
import os
import sys
from app import app, chatbot

def main():
    """Main function to run the Flask app"""
    print("🤖 Starting AI Chatbot Backend...")
    print("=" * 50)
    
    # Try to load existing model
    if chatbot.load_model():
        print("✅ Existing model loaded successfully!")
    else:
        print("⚠️  No existing model found. You'll need to train the model first.")
    
    print(f"🌐 Server will start on http://localhost:5000")
    print("📚 API Endpoints:")
    print("  - GET  /api/health       - Health check")
    print("  - POST /api/train        - Train the model")
    print("  - POST /api/chat         - Chat with the bot")
    print("  - GET  /api/model-status - Get model status")
    print("=" * 50)
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)

if __name__ == '__main__':
    main()
