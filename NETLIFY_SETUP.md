# Light Space - Netlify Deployment Guide

This guide walks you through deploying the Light Space BCI tool to Netlify with serverless image generation.

## What You Need

- Netlify account (you already have one ✓)
- Replicate API token (you already have this ✓)
- Git (or you can zip the folder)

## Step-by-Step Deployment

### 1. Prepare Your Local Files

Your project structure should look like:
```
outputs/
├── light-space.html
├── netlify.toml
└── netlify/
    └── functions/
        └── generate.js
```

### 2. Connect to Netlify

**Option A: Using Git (Recommended)**

1. Open Terminal/Command Prompt
2. Navigate to your outputs folder:
   ```bash
   cd /Users/julessherman/Library/Application\ Support/Claude/local-agent-mode-sessions/41fc09b0-6f82-40cf-ad29-c106da3ea409/1e998ea5-08e1-4fc6-889e-5ca4fca1adf3/local_c3261d37-7700-4bd6-9ef8-77e862c24b72/outputs
   ```

3. Initialize git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Light Space with Netlify functions"
   ```

4. Create a GitHub repo and push (or use any git provider)

5. Go to [Netlify.com](https://netlify.com)
6. Click "Add new site" → "Import an existing project"
7. Select your Git provider and repository

**Option B: Manual Upload (Simpler)**

1. Go to [Netlify.com](https://netlify.com)
2. Drag and drop your entire `outputs` folder into Netlify
3. Done! (Skip to Step 3)

### 3. Set Environment Variables

This is critical for the paint feature to work:

1. In Netlify, go to your site
2. Click **Site settings** → **Build & deploy** → **Environment**
3. Click **Edit variables**
4. Add a new variable:
   - **Key**: `REPLICATE_API_TOKEN`
   - **Value**: `r8_YsTELgGRqqkN060q23bhouIOEJ4KzUC1H4YMZ` (your token)
5. Save

### 4. Redeploy (if needed)

If you manually uploaded in Step 2, just wait—your site is live.

If you used Git, Netlify will automatically deploy when you push changes. To manually trigger:
1. Go to your Netlify site
2. Click **Deploys**
3. Click **Trigger deploy**

### 5. Test the Paint Feature

1. Open your Netlify site (e.g., `https://yoursite.netlify.app`)
2. Click the **Paint** tab
3. Type a description: "a serene lake at sunset with mountains"
4. Click **Paint Picture**
5. Wait 30-60 seconds (Replicate generates the image)
6. Your image appears!

### 6. Adjust Realism Slider

The **Realism** slider (1-5) controls the style:
- **1-2**: Impressionistic, painterly, artistic
- **3-4**: Balanced, mixed style
- **5**: Photorealistic, detailed

## Troubleshooting

**"Error: API token not configured"**
- Check that `REPLICATE_API_TOKEN` environment variable is set in Netlify
- Redeploy after adding the variable

**"Image generation timed out"**
- Replicate is processing. This can take 20-60 seconds.
- Check Netlify function logs: Site settings → Functions

**"No image appears"**
- Open browser console (F12 → Console tab) and check for errors
- Check Netlify function logs for backend errors

**CORS errors**
- netlify.toml headers should handle this, but if you see CORS errors, contact Netlify support

## Your Site URL

After deployment, your site will be at:
`https://[your-site-name].netlify.app`

You can customize the name in Netlify site settings.

## What's Happening Behind the Scenes

1. **Frontend** (light-space.html): Runs in your browser, handles emotions and UI
2. **Netlify Function** (generate.js): Runs on Netlify servers securely
   - Receives your text prompt
   - Calls Replicate API with your token (kept secret)
   - Returns generated image back to you
3. **Replicate API**: Generates the image using Stable Diffusion

Your API token is never exposed to the browser—it's safely kept on Netlify's servers.

## Next Steps

- Share your site with others
- Customize the site name/domain in Netlify
- Monitor function usage in Netlify analytics

---

Questions? Check [Netlify docs](https://docs.netlify.com/) or let me know!
