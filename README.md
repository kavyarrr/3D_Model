# VOID.V1: AI Anatomy Explorer 🚀

A HealthTech/EdTech platform that transforms textbook learning by making it 3D, interactive, and intelligent.

## Features

- 📸 **Vision AI**: Upload anatomy diagrams to detect organs
- 🎯 **3D Model Viewer**: Interactive 3D visualization with Three.js
- 🤖 **AI Labeling**: Gemini API integration for automatic anatomical labeling
- 💡 **Interactive Descriptions**: Click on labeled parts to learn more
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

### 1. Configure Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key
5. Open `config.js` and replace `YOUR_API_KEY_HERE` with your actual API key:

```javascript
const GEMINI_CONFIG = {
    apiKey: 'YOUR_ACTUAL_API_KEY_HERE',  // ⬅️ Put your API key here
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
};
```

### 2. Run the Application

Since this uses ES6 modules, you need to run a local server:

**Option A: Using Python**
```bash
python -m http.server 8000
```

**Option B: Using Node.js (http-server)**
```bash
npx http-server
```

Then open your browser to: `http://localhost:8000`

### 3. Test the Heart Labeling Feature

1. The demo currently loads the heart model by default
2. If you've configured your Gemini API key, it will generate labels using AI
3. If the API key is not configured or the API call fails, it will use predefined default labels
4. Click on any labeled part in the 3D model or in the side panel to see detailed descriptions

## Project Structure

```
3D_model/
├── index.html          # Main HTML file
├── scripts.js          # Three.js and Gemini API integration
├── styles.css          # Styling
├── config.js           # API configuration (API key goes here)
├── README.md           # This file
└── models/             # 3D model files (.glb format)
    ├── heart.glb
    ├── brain.glb
    ├── lung.glb
    └── ...
```

## Current Features

### Heart Model Labeling
- **AI-Generated Labels**: Uses Gemini API to generate anatomical labels
- **10+ Heart Parts**: Right Atrium, Left Ventricle, Aorta, Valves, etc.
- **Interactive Side Panel**: Click labels to view detailed descriptions
- **3D Sprites**: Labels rendered as 3D sprites in the scene

### Fallback System
If the Gemini API is unavailable:
- Uses predefined labels (10 essential heart parts)
- All functionality works without API
- No data collection or external dependencies required

## How It Works

### 1. Image Upload & Detection
- User uploads an anatomy diagram
- Mock ML classifier identifies the organ
- Corresponding 3D model is loaded

### 2. AI Label Generation
When a heart model is loaded:
- Gemini API is called with an anatomical prompt
- AI generates JSON with labels, descriptions, and positions
- Labels are parsed and added to the scene

### 3. Interactive Visualization
- **3D Labels**: Visible as sprites in the 3D scene
- **Side Panel**: Lists all anatomical parts with descriptions
- **Click Interaction**: Click labels or list items to highlight parts
- **Zoom & Rotate**: Use controls to explore the 3D model

## Troubleshooting

### API Key Issues
- Make sure you've replaced `YOUR_API_KEY_HERE` in `config.js`
- Verify your API key is valid at https://makersuite.google.com/app/apikey
- Check browser console for API errors

### CORS Errors
- The app uses a local HTTP server to avoid CORS issues
- Do NOT open HTML files directly (file://)
- Always use a local server (Python or Node.js)

### Labels Not Showing
- Check browser console for errors
- Verify Gemini API key is correctly configured
- The fallback system will show default labels if API fails

## Future Enhancements

- [ ] Multiple organ labeling (brain, liver, kidneys, etc.)
- [ ] Quiz generation using Gemini
- [ ] Chatbot integration for deeper queries
- [ ] Adaptive learning paths
- [ ] AR/VR support
- [ ] Collaborative study sessions

## Technologies Used

- **Three.js**: 3D graphics rendering
- **Google Gemini API**: AI-powered labeling
- **GLTFLoader**: 3D model loading
- **OrbitControls**: Camera controls
- **HTML5 Canvas**: Sprite-based labels

## License

MIT License - Feel free to use and modify for educational purposes.

## Contributing

This is a student project for HealthTech/EdTech. Contributions welcome!

---

**Note**: Make sure to keep your API key private. Never commit API keys to version control.

