# Troubleshooting Guide

## Common Issues

### Build/Compilation Errors

#### "Cannot find module" errors
```bash
# Clean and reinstall
rm -rf node_modules dist
npm install
npm run build
```

#### Canvas installation fails
Canvas requires system dependencies:
```bash
# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev \
  libjpeg-dev libgif-dev librsvg2-dev

# Then reinstall
npm rebuild canvas
```

---

### Asset Validation Errors

#### "No files found in assets/backgrounds"
1. Ensure you have at least one image in `assets/backgrounds/`
2. Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`
3. Check file permissions

#### "No font files found"
1. Add a `.ttf` or `.otf` font file to `assets/fonts/`
2. You can download free fonts from Google Fonts

---

### Video Rendering Issues

#### FFmpeg not found
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version
```

#### Video is black/corrupted
1. Check background image is valid and readable
2. Verify image dimensions (1080x1920 recommended)
3. Check FFmpeg logs in `logs/` directory

---

### Upload Failures

#### Instagram: "Temporary hosting not implemented"
Instagram requires a publicly accessible URL for videos. You need to:
1. Set up Cloudinary or AWS S3 (see SETUP.md)
2. Implement the upload method in `src/upload/instagram-uploader.ts`

#### Facebook: "Access token expired"
1. Generate a new long-lived token
2. Update `META_PAGE_ACCESS_TOKEN` secret

#### YouTube: "Invalid credentials"
1. Verify OAuth credentials are correct
2. Check that refresh token is still valid
3. Re-run the token generation script if needed

---

### State Management Issues

#### "Posts uploading multiple times"
1. Check `last_posted.json` in your Gist
2. Verify `GIST_ID` matches your Gist
3. Check GitHub token has `gist` scope

#### "State not updating"
1. Verify `GITHUB_TOKEN` has `gist` permission
2. Check if uploads are actually succeeding
3. Look for errors in logs

---

### GitHub Actions Issues

#### Workflow not running
1. Check if Actions are enabled for your repo
2. Verify the cron schedule syntax
3. Try triggering manually via "Run workflow"

#### FFmpeg/canvas errors in CI
The workflow should install required dependencies automatically. If not:
1. Check the "Install system dependencies" step
2. Verify Node.js version is 18+

---

## Debug Mode

Enable verbose logging:
```bash
LOG_LEVEL=debug npm start
```

Check logs:
```bash
cat logs/$(date +%Y-%m-%d).log
```

---

## Getting Help

1. Check logs in `logs/` directory
2. Run `npm run dry-run` to test without posting
3. Open an issue with:
   - Error message
   - Relevant log output (redact tokens!)
   - Node.js version (`node --version`)
   - OS version
