# Setup Guide

This guide walks through setting up API credentials for all platforms.

## 1. GitHub Setup

### Create Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token"
3. Select scope: `gist`
4. Copy the token → save as `GITHUB_TOKEN`

### Create State Gist

1. Go to https://gist.github.com/
2. Create a new **secret** gist
3. Filename: `last_posted.json`
4. Content:
   ```json
   {
     "lastValue": 0,
     "lastDate": null,
     "contentType": "year-progress",
     "year": null
   }
   ```
5. Save the Gist ID from the URL → save as `GIST_ID`

---

## 2. Meta (Facebook/Instagram) Setup

### Prerequisites
- Facebook Business Page
- Instagram Business/Creator account linked to the Page

### Steps

1. Go to https://developers.facebook.com/
2. Create new app → Select "Business" type
3. Add "Instagram Graph API" product
4. Go to Tools → Graph API Explorer
5. Generate Page Access Token with permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_manage_posts`

6. Get your Instagram Business Account ID:
   ```bash
   curl "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_TOKEN"
   # Note the instagram_business_account.id from the response
   ```

7. Save credentials:
   - `META_PAGE_ACCESS_TOKEN` - Your page access token
   - `META_INSTAGRAM_ID` - Instagram Business Account ID
   - `META_PAGE_ID` - Facebook Page ID

> **Note**: For long-lived tokens, exchange your short-lived token:
> ```bash
> curl "https://graph.facebook.com/v21.0/oauth/access_token?\
> grant_type=fb_exchange_token&\
> client_id=APP_ID&\
> client_secret=APP_SECRET&\
> fb_exchange_token=SHORT_LIVED_TOKEN"
> ```

---

## 3. YouTube Setup

1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Add redirect URI: `http://localhost:3000/oauth2callback`
5. Download credentials

### Get Refresh Token

Create a temporary script to get your refresh token:

```javascript
// get-youtube-token.js
import { google } from 'googleapis';
import http from 'http';
import url from 'url';

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/oauth2callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
});

console.log('Visit this URL:', authUrl);

const server = http.createServer(async (req, res) => {
  const queryObject = url.parse(req.url, true).query;
  if (queryObject.code) {
    const { tokens } = await oauth2Client.getToken(queryObject.code);
    console.log('\nRefresh Token:', tokens.refresh_token);
    res.end('Done! Check your terminal.');
    server.close();
  }
});

server.listen(3000);
```

Run it:
```bash
npm install googleapis
node get-youtube-token.js
```

Save credentials:
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

---

## 4. Video Hosting (for Instagram)

Instagram requires a publicly accessible URL for video uploads. Choose one:

### Option A: Cloudinary (Recommended)

1. Sign up at https://cloudinary.com/
2. Get credentials from Dashboard
3. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### Option B: AWS S3

1. Create an S3 bucket with public access
2. Add to `.env`:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET=your_bucket_name
   AWS_REGION=us-east-1
   ```

---

## 5. GitHub Actions Secrets

Add all secrets to your repo:

1. Go to repo → Settings → Secrets and variables → Actions
2. Add each secret:

| Secret | Description |
|--------|-------------|
| `GIST_ID` | GitHub Gist ID for state |
| `META_PAGE_ACCESS_TOKEN` | Facebook/Instagram token |
| `META_INSTAGRAM_ID` | Instagram Business ID |
| `META_PAGE_ID` | Facebook Page ID |
| `YOUTUBE_CLIENT_ID` | YouTube OAuth Client ID |
| `YOUTUBE_CLIENT_SECRET` | YouTube OAuth Secret |
| `YOUTUBE_REFRESH_TOKEN` | YouTube Refresh Token |
| `CLOUDINARY_CLOUD_NAME` | (Optional) Cloudinary name |
| `CLOUDINARY_API_KEY` | (Optional) Cloudinary key |
| `CLOUDINARY_API_SECRET` | (Optional) Cloudinary secret |

Note: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

---

## 6. Add Assets

Add required files:

```bash
# Create directories
mkdir -p assets/{backgrounds,audio,fonts}

# Add your files
# - backgrounds: 1080x1920 images (jpg, png, webp)
# - audio: Short audio clips (mp3, wav)
# - fonts: TTF or OTF font file
```

Recommended sources for free assets:
- **Images**: Unsplash, Pexels, Pixabay
- **Audio**: Pixabay Music, YouTube Audio Library
- **Fonts**: Google Fonts

---

## Verification

Run a dry test:
```bash
npm run build
npm run dry-run
```

If successful, trigger a manual workflow run from GitHub Actions.
