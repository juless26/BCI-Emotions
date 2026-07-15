# Deployment Checklist

## Files Ready for Netlify

All files are in `/outputs/`:

✅ **light-space.html** — Your BCI tool (updated to use Netlify functions)
✅ **netlify.toml** — Netlify configuration
✅ **netlify/functions/generate.js** — Serverless paint feature backend

## Quick Start

### Step 1: Go to Netlify
Visit https://app.netlify.com/

### Step 2: Deploy
- **Option A (Git)**: Create a repo, push these files, connect via "Import existing project"
- **Option B (Drag & Drop)**: Drag the `outputs` folder onto Netlify

### Step 3: Add Environment Variable
In Netlify Site Settings → Build & deploy → Environment:
```
Key: REPLICATE_API_TOKEN
Value: r8_YsTELgGRqqkN060q23bhouIOEJ4KzUC1H4YMZ
```

### Step 4: Done!
Your site is live. Test the Paint feature.

## What the Paint Feature Does Now

1. You describe imagery in the Paint tab
2. Adjustment the Realism slider (1-5)
3. Click "Paint Picture"
4. A Netlify function securely calls Replicate AI
5. Image appears in 20-60 seconds

Your API token is **never exposed** to the browser—it stays safe on Netlify's servers.

## File Structure
```
outputs/
├── light-space.html              (your BCI tool)
├── netlify.toml                  (Netlify config)
├── netlify/
│   └── functions/
│       └── generate.js           (image generation backend)
├── NETLIFY_SETUP.md              (detailed guide)
└── DEPLOYMENT_CHECKLIST.md       (this file)
```

## Next: Deploy!

Go to Netlify.com and deploy the `outputs` folder. That's it! ✨
