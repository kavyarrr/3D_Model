# 🚀 Quick Setup Guide

## Step 1: Get Your Gemini API Key

1. Visit: **https://makersuite.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key (it looks like: `AIzaSy...`)

## Step 2: Add Your API Key

Open the file `config.js` and find this line:

```javascript
const GEMINI_CONFIG = {
    apiKey: 'YOUR_API_KEY_HERE',  // ⬅️ PUT YOUR API KEY HERE
```

Replace `YOUR_API_KEY_HERE` with your actual API key, like this:

```javascript
const GEMINI_CONFIG = {
    apiKey: 'AIzaSy...your-actual-key-here...',  // ⬅️ PUT YOUR API KEY HERE
```

**Save the file!**

## Step 3: Start the Server

Open your terminal in the project folder and run:

```bash
# Option A: Using Python
python -m http.server 8000

# Option B: Using Node.js
npx http-server
```

## Step 4: Open in Browser

Go to: **http://localhost:8000**

## Step 5: Test It Out

1. Click "Upload Anatomy Diagram"
2. Select any image file (the demo uses a mock classifier)
3. The heart model will load
4. If your API key is set correctly, you'll see:
   - AI-generated labels appearing
5. If no API key:
   - Default labels will still work
   - You'll see 10 heart anatomy labels

## Features to Try

✅ **Click** on labeled parts in the 3D model  
✅ **Click** on items in the side panel  
✅ **Rotate** the 3D model with your mouse  
✅ **Zoom** in/out using buttons or scroll wheel  
✅ **Read** detailed descriptions of each heart part

## Troubleshooting

### "Failed to call Gemini API" Error
- Check that your API key is correct in `config.js`
- Make sure you haven't added quotes inside quotes
- Verify the key works at https://makersuite.google.com/app/apikey

### "CORS Error" or "Cross-Origin" Error
- Make sure you're using a local server (not opening the HTML directly)
- Use `python -m http.server` or `npx http-server`

### Labels Not Showing
- Open browser console (F12) to see errors
- Default labels should work even without API key
- Check that you're viewing the heart model (not liver or other organs)

### Page is Blank
- Make sure all files are in the same folder
- Check that `models/heart.glb` exists
- Verify server is running on correct port

## What Happens Under the Hood?

1. **API Call**: When heart model loads, it calls Gemini API
2. **AI Prompt**: Asks Gemini to generate heart anatomy labels
3. **Response Parsing**: Extracts labels, descriptions, and positions
4. **3D Rendering**: Creates sprite labels in the 3D scene
5. **Interaction**: Click handlers for labels and side panel
6. **Fallback**: If API fails, uses predefined labels

## File Structure

```
Your Project/
├── config.js          ← Add API key here!
├── index.html         ← Main page
├── scripts.js         ← 3D model & Gemini logic
├── styles.css         ← Styling
├── models/            ← 3D model files
│   └── heart.glb
└── README.md          ← Full documentation
```

## Need Help?

- Check browser console (F12) for error messages
- Verify your API key in `config.js`
- Make sure you're running a local server
- Read the full `README.md` for more details

**Happy coding! 🎓**

