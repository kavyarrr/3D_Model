// ============================================
// GEMINI API CONFIGURATION
// ============================================
// 
// To use Gemini API, replace 'YOUR_API_KEY_HERE' with your actual API key below
// 
// How to get your Gemini API key:
// 1. Go to: https://makersuite.google.com/app/apikey
// 2. Sign in with your Google account
// 3. Click "Create API Key"
// 4. Copy the key and paste it below
//
// ============================================

const GEMINI_CONFIG = {
    apiKey: 'AIzaSyD_49KKvYe0hRcr7ejIf9EJslPpr3kAmfQ',  // ⬅️ PUT YOUR API KEY HERE
    // Using the correct endpoint for Gemini 2.0 Flash Experimental
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp',
    
    // Alternative: If you have Gemini API locally or using different endpoint
    // apiUrl: 'http://localhost:8080/generateContent',  // For local setup
};

// Export for use in scripts.js
export { GEMINI_CONFIG };

