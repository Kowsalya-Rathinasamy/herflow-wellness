# HerFlow Deployment Guide

## Quick Deployment Options

Your HerFlow application is a static web app (HTML/CSS/JavaScript) that can be deployed to various hosting platforms for free.

---

## Option 1: GitHub Pages (Recommended - Free & Easy)

### Steps:

1. **Create a GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - HerFlow Wellness App"
   ```

2. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it: `herflow-wellness`
   - Don't initialize with README (you already have files)

3. **Push your code:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/herflow-wellness.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages:**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Source: Select "main" branch
   - Folder: Select "/ (root)"
   - Click "Save"

5. **Access your site:**
   - Your site will be live at: `https://YOUR_USERNAME.github.io/herflow-wellness/`
   - Wait 2-3 minutes for initial deployment

### Advantages:
- ✅ Free hosting
- ✅ Custom domain support
- ✅ HTTPS by default
- ✅ Easy updates (just push to GitHub)

---

## Option 2: Netlify (Free with Drag & Drop)

### Steps:

1. **Go to Netlify:**
   - Visit https://www.netlify.com/
   - Sign up for free account

2. **Deploy via drag & drop:**
   - Click "Add new site" → "Deploy manually"
   - Drag your entire project folder to the upload area
   - Wait for deployment (30 seconds)

3. **Your site is live!**
   - Netlify provides a URL like: `https://random-name-12345.netlify.app`
   - You can customize the subdomain in site settings

### Advantages:
- ✅ Instant deployment (no git required)
- ✅ Free SSL certificate
- ✅ Automatic HTTPS
- ✅ Easy to update (drag & drop again)

---

## Option 3: Vercel (Free with Git Integration)

### Steps:

1. **Push to GitHub** (follow Option 1, steps 1-3)

2. **Deploy to Vercel:**
   - Go to https://vercel.com/
   - Sign up with GitHub
   - Click "Add New Project"
   - Import your `herflow-wellness` repository
   - Click "Deploy"

3. **Your site is live!**
   - Vercel provides a URL like: `https://herflow-wellness.vercel.app`

### Advantages:
- ✅ Automatic deployments on git push
- ✅ Free SSL certificate
- ✅ Fast global CDN
- ✅ Preview deployments for branches

---

## Option 4: Cloudflare Pages (Free)

### Steps:

1. **Push to GitHub** (follow Option 1, steps 1-3)

2. **Deploy to Cloudflare Pages:**
   - Go to https://pages.cloudflare.com/
   - Sign up for free account
   - Click "Create a project"
   - Connect your GitHub account
   - Select `herflow-wellness` repository
   - Build settings:
     - Build command: (leave empty)
     - Build output directory: `/`
   - Click "Save and Deploy"

3. **Your site is live!**
   - Cloudflare provides a URL like: `https://herflow-wellness.pages.dev`

### Advantages:
- ✅ Cloudflare's global CDN
- ✅ Unlimited bandwidth
- ✅ Free SSL certificate
- ✅ DDoS protection

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All files are in the root directory
- [ ] `index.html` is in the root (not in a subfolder)
- [ ] All JavaScript files are in the `js/` folder
- [ ] No absolute file paths (use relative paths)
- [ ] Test locally by opening `index.html` in a browser

---

## Files to Deploy

Include these files/folders:
```
✅ index.html
✅ js/ (entire folder)
✅ .kiro/ (for submission requirements)
✅ package.json
✅ MANUAL_TESTING_GUIDE.md
✅ FINAL_CHECKPOINT_REPORT.md
```

Optional (can exclude to reduce size):
```
❌ node_modules/ (not needed for static hosting)
❌ .vscode/ (editor settings)
❌ *.test.js files (test files)
```

---

## Custom Domain (Optional)

All platforms support custom domains:

1. **Buy a domain** (e.g., from Namecheap, Google Domains)
2. **Add domain in hosting platform settings**
3. **Update DNS records** as instructed by the platform
4. **Wait for DNS propagation** (5 minutes to 48 hours)

---

## Testing Your Deployed Site

After deployment:

1. **Open the provided URL** in your browser
2. **Test all tabs:**
   - Dashboard (Home)
   - Mental Load Tracker
   - Wellness Hub
   - Planning (Calendar)
   - AI Companion

3. **Test Kiro Hooks:**
   - Open browser console (F12)
   - Schedule a wellness reminder
   - Check for "Kiro notification:" logs

4. **Test on mobile:**
   - Open the URL on your phone
   - Verify responsive design works

---

## Updating Your Deployed Site

### GitHub Pages / Vercel / Cloudflare:
```bash
# Make changes to your code
git add .
git commit -m "Update: description of changes"
git push
# Site updates automatically in 1-2 minutes
```

### Netlify (Drag & Drop):
- Drag your updated project folder to Netlify again
- It will replace the old version

---

## Troubleshooting

### Issue: Site shows 404 error
**Solution:** Ensure `index.html` is in the root directory, not in a subfolder

### Issue: JavaScript not working
**Solution:** Check browser console for errors. Ensure all file paths are relative (not absolute)

### Issue: Reminders not persisting
**Solution:** This is normal - localStorage is browser-specific. Each device has its own data.

### Issue: Calendar not showing dates
**Solution:** Check console for Calendar_Agent errors. The fallback should work even if API fails.

---

## Recommended: GitHub Pages

For your hackathon submission, I recommend **GitHub Pages** because:
- ✅ Free and reliable
- ✅ Easy to share the repository link
- ✅ Shows your code and live demo in one place
- ✅ Judges can see both the code and the running application

---

## Quick Start (GitHub Pages)

Run these commands in your project folder:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "HerFlow Wellness App - AIDLC Hackathon Submission"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/herflow-wellness.git
git branch -M main
git push -u origin main

# Enable GitHub Pages in repository settings
# Your site will be live at: https://YOUR_USERNAME.github.io/herflow-wellness/
```

---

## Need Help?

If you encounter issues:
1. Check the browser console for errors (F12)
2. Verify all files are uploaded correctly
3. Test locally first by opening `index.html`
4. Check the hosting platform's documentation

---

**Your HerFlow app is ready to deploy! Choose any option above and your wellness automation system will be live in minutes.**
