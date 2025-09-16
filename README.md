# AI-Powered Chatbot with Holographic Interface

A modern, AI-powered chatbot application with a stunning holographic interface, built with Next.js frontend and Flask backend using advanced NLP techniques.

## Features

### Frontend
- 🎨 **Holographic UI**: Beautiful animated interface with holographic effects
- 🌈 **Dynamic Animations**: Floating particles, gradient backgrounds, and smooth transitions
- 🌓 **Dark/Light Mode**: Toggle between themes with persistent settings
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- ⚡ **Real-time Chat**: Instant messaging with typing indicators
- 🔄 **Connection Status**: Live backend connection monitoring
- 🎯 **Error Handling**: Comprehensive error boundaries and user feedback

### Backend
- 🤖 **Dual AI Models**: Basic TF-IDF and Enhanced NLP models
- 📊 **Advanced NLP**: Intent classification, stemming, and similarity matching
- 🔄 **Auto-training**: Kaggle dataset integration with automatic processing
- 📈 **Performance Metrics**: Response time tracking and accuracy monitoring
- 🛡️ **Rate Limiting**: Built-in protection against abuse
- 📝 **Session Management**: Persistent chat history and context
- 🔍 **Model Comparison**: Side-by-side response comparison

## Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.8+ and pip
- Kaggle API credentials (optional, for dataset download)

### Backend Setup

1. **Navigate to backend directory:**
   \`\`\`bash
   cd backend
   \`\`\`

2. **Install Python dependencies:**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. **Set up Kaggle credentials (optional):**
   \`\`\`bash
   # Place your kaggle.json in ~/.kaggle/ or set environment variables:
   export KAGGLE_USERNAME=your_username
   export KAGGLE_KEY=your_api_key
   \`\`\`

4. **Start the Flask server:**
   \`\`\`bash
   python run.py
   \`\`\`

   The backend will be available at \`http://localhost:5000\`

### Frontend Setup

1. **Install dependencies:**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

2. **Start the development server:**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

   The frontend will be available at \`http://localhost:3000\`

## Usage Guide

### First Time Setup

1. **Start both servers** (backend and frontend)
2. **Check connection status** in the left sidebar
3. **Train a model** using the "Train Model" button
4. **Start chatting** once the model is loaded

### Model Types

- **Basic Model**: Fast TF-IDF-based similarity matching
- **Enhanced Model**: Advanced NLP with intent classification

### API Endpoints

The backend provides comprehensive REST API endpoints:

- \`GET /api/health\` - Health check
- \`POST /api/train\` - Train models
- \`POST /api/chat\` - Send messages
- \`GET /api/model-status\` - Check model status
- \`GET /api/models\` - List available models
- \`POST /api/compare\` - Compare model responses

## Architecture

### Frontend Stack
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide Icons** - Beautiful icon library

### Backend Stack
- **Flask** - Python web framework
- **scikit-learn** - Machine learning library
- **NLTK** - Natural language processing
- **pandas** - Data manipulation
- **kagglehub** - Dataset integration

### Key Components

#### Frontend
- \`app/page.tsx\` - Main chat interface
- \`lib/api.ts\` - API service layer
- \`components/connection-status.tsx\` - Backend connection monitoring
- \`components/error-boundary.tsx\` - Error handling

#### Backend
- \`app.py\` - Main Flask application
- \`chatbot_model.py\` - Basic chatbot implementation
- \`enhanced_model.py\` - Advanced NLP model
- \`data_processor.py\` - Dataset processing utilities

## Customization

### Styling
The interface uses a sophisticated design system with:
- **Primary Color**: Cyan (#0891b2)
- **Accent Color**: Amber (#d97706)
- **Typography**: Work Sans (headings) + Open Sans (body)
- **Effects**: Holographic cards, floating particles, gradient animations

### API Configuration
Update \`.env.local\` to change the backend URL:
\`\`\`env
NEXT_PUBLIC_API_URL=http://your-backend-url/api
\`\`\`

## Troubleshooting

### Common Issues

1. **Backend not connecting**
   - Ensure Flask server is running on port 5000
   - Check firewall settings
   - Verify CORS configuration

2. **Model training fails**
   - Check Kaggle API credentials
   - Ensure sufficient disk space
   - Review backend logs for errors

3. **Slow responses**
   - Train the enhanced model for better performance
   - Check system resources
   - Consider model optimization

### Development Tips

- Use browser dev tools to monitor API calls
- Check Flask logs for backend debugging
- Enable dev mode for detailed error messages
- Use the connection status indicator for troubleshooting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Bitext** for the customer support dataset
- **Vercel** for the amazing development platform
- **Radix UI** for accessible components
- **Tailwind CSS** for the utility-first approach
