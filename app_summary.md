# Complete Build Plan - Year Progress Video App

## 📋 Project Overview

Build a fully automated Node.js app that generates daily year progress videos and posts to Instagram Reels, Facebook Reels, and YouTube Shorts. Uses FFmpeg for rendering, GitHub Gist for state, and GitHub Actions for scheduling.

---

## 🗂️ Phase 1: Project Setup & Foundation (Day 1)

### Step 1.1: Initialize Project

```bash
# Create project structure
mkdir year-progress-app && cd year-progress-app
git init
npm init -y

# Install core dependencies
npm install \
  dotenv \
  canvas \
  fluent-ffmpeg \
  @octokit/rest \
  axios

# Install dev dependencies
npm install -D \
  eslint \
  prettier \
  nodemon
```

### Step 1.2: Create Project Structure

```bash
mkdir -p src/{render,upload,utils} config assets/{backgrounds,audio,fonts} logs videos
touch src/index.js .env.example .gitignore README.md
```

### Step 1.3: Setup .gitignore

```
# Dependencies
node_modules/

# Environment
.env
.env.local

# Generated content
videos/*.mp4
logs/*.log

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
temp/
```

### Step 1.4: Create .env.example

```bash
# GitHub State Management
GIST_ID=your_gist_id_here
GITHUB_TOKEN=your_github_token_here

# Meta/Facebook/Instagram
META_PAGE_ACCESS_TOKEN=your_meta_token_here
META_INSTAGRAM_ID=your_instagram_business_id
META_PAGE_ID=your_facebook_page_id

# YouTube
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token

# App Configuration
DRY_RUN=false
LOG_LEVEL=info
TIMEZONE=UTC
```

### Step 1.5: Create config/texts.json

```json
{
  "templates": [
    "2025 is XX% complete 🔥",
    "We're XX% through 2025! Time flies ⏰",
    "2025 Progress: XX% done ✨",
    "XX% of 2025 is already behind us 🚀",
    "Year 2025: XX% completed 💪",
    "The year is XX% over... make it count! 🎯"
  ]
}
```

---

## 🎨 Phase 2: Asset Collection (Day 1-2)

### Step 2.1: Gather Background Images

**Requirements:**

- 6 high-quality images (1080x1920, 9:16 aspect ratio)
- Free from copyright restrictions
- Visually appealing and diverse themes

**Sources:**

- Unsplash.com (free license)
- Pexels.com (free license)
- Pixabay.com (free license)

**Save as:**

```
assets/backgrounds/bg1.jpg
assets/backgrounds/bg2.jpg
assets/backgrounds/bg3.jpg
assets/backgrounds/bg4.jpg
assets/backgrounds/bg5.jpg
assets/backgrounds/bg6.jpg
```

### Step 2.2: Gather Audio Tracks

**Requirements:**

- 6 short audio tracks (3-10 seconds)
- Upbeat, motivational, or ambient
- Royalty-free

**Sources:**

- Pixabay Music (free license)
- YouTube Audio Library (free music)
- Free Music Archive

**Save as:**

```
assets/audio/audio1.mp3
assets/audio/audio2.mp3
assets/audio/audio3.mp3
assets/audio/audio4.mp3
assets/audio/audio5.mp3
assets/audio/audio6.mp3
```

### Step 2.3: Download Font

**Download a bold, modern font for text overlay:**

- Roboto Bold
- Montserrat Bold
- Open Sans Bold

**Save as:**

```
assets/fonts/primary-font.ttf
```

---

## 🛠️ Phase 3: Core Utilities (Day 2-3)

### Step 3.1: Create Logger (src/utils/logger.js)

```javascript
const fs = require("fs");
const path = require("path");

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || "info"];

function log(level, message, data = {}) {
  if (LOG_LEVELS[level] > currentLevel) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };

  const logString = JSON.stringify(logEntry);
  console.log(logString);

  // Also write to file
  const logFile = path.join(
    __dirname,
    "../../logs",
    `${new Date().toISOString().split("T")[0]}.log`
  );
  fs.appendFileSync(logFile, logString + "\n");
}

module.exports = {
  error: (msg, data) => log("error", msg, data),
  warn: (msg, data) => log("warn", msg, data),
  info: (msg, data) => log("info", msg, data),
  debug: (msg, data) => log("debug", msg, data),
};
```

### Step 3.2: Create Date Calculator (src/utils/date_calculator.js)

```javascript
function calculateYearProgress() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  const percent = Math.floor((dayOfYear / totalDays) * 100);

  return {
    year,
    percent,
    dayOfYear,
    totalDays,
    isLeapYear: totalDays === 366,
    date: now.toISOString(),
  };
}

module.exports = { calculateYearProgress };
```

### Step 3.3: Create Asset Picker (src/utils/asset_picker.js)

```javascript
const fs = require("fs");
const path = require("path");

function getRandomFile(directory) {
  const files = fs.readdirSync(directory).filter((f) => !f.startsWith("."));

  if (files.length === 0) {
    throw new Error(`No files found in ${directory}`);
  }

  const randomFile = files[Math.floor(Math.random() * files.length)];
  return path.join(directory, randomFile);
}

function getRandomText(textsPath, percent) {
  const textsData = JSON.parse(fs.readFileSync(textsPath, "utf-8"));
  const templates = textsData.templates;
  const randomTemplate =
    templates[Math.floor(Math.random() * templates.length)];
  return randomTemplate.replace("XX", percent);
}

function validateAssets() {
  const checks = [
    { path: "assets/backgrounds", min: 6, type: "background images" },
    { path: "assets/audio", min: 6, type: "audio files" },
    { path: "assets/fonts", min: 1, type: "font files" },
    { path: "config/texts.json", exists: true, type: "text templates" },
  ];

  const errors = [];

  checks.forEach((check) => {
    if (check.exists) {
      if (!fs.existsSync(check.path)) {
        errors.push(`Missing ${check.type}: ${check.path}`);
      }
    } else if (check.min) {
      const count = fs.existsSync(check.path)
        ? fs.readdirSync(check.path).filter((f) => !f.startsWith(".")).length
        : 0;

      if (count < check.min) {
        errors.push(
          `Need at least ${check.min} ${check.type}, found ${count} in ${check.path}`
        );
      }
    }
  });

  if (errors.length > 0) {
    throw new Error("Asset validation failed:\n" + errors.join("\n"));
  }
}

module.exports = {
  getRandomFile,
  getRandomText,
  validateAssets,
};
```

### Step 3.4: Create State Manager (src/utils/state_manager.js)

```javascript
const { Octokit } = require("@octokit/rest");
const logger = require("./logger");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const GIST_ID = process.env.GIST_ID;
const STATE_FILE = "last_posted.json";

async function getLastPosted() {
  try {
    const { data } = await octokit.gists.get({ gist_id: GIST_ID });

    if (!data.files[STATE_FILE]) {
      return { lastPercent: 0, lastDate: null };
    }

    const content = JSON.parse(data.files[STATE_FILE].content);
    logger.info("Retrieved last posted state", content);
    return content;
  } catch (error) {
    logger.error("Failed to get last posted state", { error: error.message });
    return { lastPercent: 0, lastDate: null };
  }
}

async function updateLastPosted(percent, year) {
  try {
    const newState = {
      lastPercent: percent,
      lastDate: new Date().toISOString(),
      year,
    };

    await octokit.gists.update({
      gist_id: GIST_ID,
      files: {
        [STATE_FILE]: {
          content: JSON.stringify(newState, null, 2),
        },
      },
    });

    logger.info("Updated last posted state", newState);
    return newState;
  } catch (error) {
    logger.error("Failed to update last posted state", {
      error: error.message,
    });
    throw error;
  }
}

async function shouldPost(currentPercent, currentYear) {
  const lastState = await getLastPosted();

  // Post if: different year OR different percentage
  const shouldUpdate =
    lastState.year !== currentYear || lastState.lastPercent !== currentPercent;

  logger.info("Checked if should post", {
    currentPercent,
    currentYear,
    lastPercent: lastState.lastPercent,
    lastYear: lastState.year,
    shouldPost: shouldUpdate,
  });

  return shouldUpdate;
}

module.exports = {
  getLastPosted,
  updateLastPosted,
  shouldPost,
};
```

---

## 🎬 Phase 4: Video Rendering (Day 3-4)

### Step 4.1: Create Canvas Renderer (src/render/canvas_renderer.js)

```javascript
const { createCanvas, registerFont, loadImage } = require("canvas");
const path = require("path");
const logger = require("../utils/logger");

// Register custom font
registerFont(path.join(__dirname, "../../assets/fonts/primary-font.ttf"), {
  family: "Primary",
});

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION = 5; // seconds

async function generateFrames(backgroundPath, text, percent, outputDir) {
  logger.info("Generating video frames", { backgroundPath, text, percent });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  const totalFrames = FPS * DURATION;
  const frames = [];

  // Load background image
  const bgImage = await loadImage(backgroundPath);

  for (let frame = 0; frame < totalFrames; frame++) {
    // Draw background
    ctx.drawImage(bgImage, 0, 0, WIDTH, HEIGHT);

    // Add dark overlay for text readability
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Animate progress bar
    const progress = (frame / totalFrames) * (percent / 100);
    drawProgressBar(ctx, progress);

    // Draw text
    drawText(ctx, text, frame, totalFrames);

    // Save frame
    const framePath = path.join(
      outputDir,
      `frame_${frame.toString().padStart(4, "0")}.png`
    );
    const buffer = canvas.toBuffer("image/png");
    require("fs").writeFileSync(framePath, buffer);
    frames.push(framePath);
  }

  logger.info("Frames generated", { count: frames.length });
  return frames;
}

function drawProgressBar(ctx, progress) {
  const barHeight = 40;
  const barY = HEIGHT - 400;
  const barPadding = 100;
  const barWidth = WIDTH - barPadding * 2;

  // Background bar
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(barPadding, barY, barWidth, barHeight);

  // Progress fill with gradient
  const gradient = ctx.createLinearGradient(
    barPadding,
    0,
    barPadding + barWidth * progress,
    0
  );
  gradient.addColorStop(0, "#00C9FF");
  gradient.addColorStop(1, "#92FE9D");

  ctx.fillStyle = gradient;
  ctx.fillRect(barPadding, barY, barWidth * progress, barHeight);

  // Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 3;
  ctx.strokeRect(barPadding, barY, barWidth, barHeight);
}

function drawText(ctx, text, frame, totalFrames) {
  // Fade in animation
  const fadeInDuration = FPS * 0.5; // 0.5 seconds
  let alpha = 1;
  if (frame < fadeInDuration) {
    alpha = frame / fadeInDuration;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  // Main text
  ctx.font = "bold 80px Primary";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Add text shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.fillText(text, WIDTH / 2, HEIGHT / 2);

  ctx.restore();
}

module.exports = { generateFrames };
```

### Step 4.2: Create FFmpeg Compiler (src/render/ffmpeg_compiler.js)

```javascript
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

async function compileVideo(framesDir, audioPath, outputPath) {
  logger.info("Compiling video", { framesDir, audioPath, outputPath });

  return new Promise((resolve, reject) => {
    ffmpeg()
      // Input: image sequence
      .input(path.join(framesDir, "frame_%04d.png"))
      .inputFPS(30)

      // Input: audio
      .input(audioPath)

      // Video settings
      .videoCodec("libx264")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-preset fast",
        "-crf 23",
        "-movflags +faststart",
      ])

      // Audio settings
      .audioCodec("aac")
      .audioBitrate("128k")

      // Duration: match video to audio or 5 seconds
      .duration(5)

      // Output
      .output(outputPath)

      // Event handlers
      .on("start", (cmd) => {
        logger.debug("FFmpeg command", { cmd });
      })
      .on("progress", (progress) => {
        logger.debug("Encoding progress", progress);
      })
      .on("end", () => {
        logger.info("Video compilation complete", { outputPath });
        // Clean up frames
        cleanupFrames(framesDir);
        resolve(outputPath);
      })
      .on("error", (err) => {
        logger.error("FFmpeg error", { error: err.message });
        cleanupFrames(framesDir);
        reject(err);
      })
      .run();
  });
}

function cleanupFrames(framesDir) {
  try {
    const files = fs.readdirSync(framesDir);
    files.forEach((file) => {
      if (file.startsWith("frame_") && file.endsWith(".png")) {
        fs.unlinkSync(path.join(framesDir, file));
      }
    });
    logger.info("Cleaned up frames", { dir: framesDir });
  } catch (error) {
    logger.warn("Failed to cleanup frames", { error: error.message });
  }
}

module.exports = { compileVideo };
```

### Step 4.3: Create Main Renderer (src/render/index.js)

```javascript
const path = require("path");
const fs = require("fs");
const { generateFrames } = require("./canvas_renderer");
const { compileVideo } = require("./ffmpeg_compiler");
const { getRandomFile, getRandomText } = require("../utils/asset_picker");
const logger = require("../utils/logger");

async function renderVideo(percent, year) {
  const timestamp = Date.now();
  const outputPath = path.join(
    __dirname,
    "../../videos",
    `progress_${year}_${percent}_${timestamp}.mp4`
  );
  const framesDir = path.join(__dirname, "../../videos", `frames_${timestamp}`);

  // Create frames directory
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  try {
    // Pick random assets
    const backgroundPath = getRandomFile(
      path.join(__dirname, "../../assets/backgrounds")
    );
    const audioPath = getRandomFile(path.join(__dirname, "../../assets/audio"));
    const text = getRandomText(
      path.join(__dirname, "../../config/texts.json"),
      percent
    );

    logger.info("Starting video render", {
      percent,
      year,
      background: path.basename(backgroundPath),
      audio: path.basename(audioPath),
      text,
    });

    // Generate frames
    await generateFrames(backgroundPath, text, percent, framesDir);

    // Compile video
    await compileVideo(framesDir, audioPath, outputPath);

    // Cleanup frames directory
    fs.rmdirSync(framesDir, { recursive: true });

    logger.info("Video render complete", { outputPath });

    return {
      videoPath: outputPath,
      caption: text,
      metadata: {
        percent,
        year,
        background: path.basename(backgroundPath),
        audio: path.basename(audioPath),
      },
    };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(framesDir)) {
      fs.rmdirSync(framesDir, { recursive: true });
    }
    throw error;
  }
}

module.exports = { renderVideo };
```

---

## 📤 Phase 5: Upload Clients (Day 4-5)

### Step 5.1: Create Upload Utility (src/upload/utils.js)

```javascript
const logger = require("../utils/logger");

async function uploadWithRetry(uploadFn, platform, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Uploading to ${platform}`, { attempt, maxRetries });
      const result = await uploadFn();
      logger.info(`✓ ${platform} upload successful`, result);
      return { success: true, platform, result };
    } catch (error) {
      logger.error(`✗ ${platform} upload failed (attempt ${attempt})`, {
        error: error.message,
        stack: error.stack,
      });

      if (attempt === maxRetries) {
        return { success: false, platform, error: error.message };
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt - 1) * 1000;
      logger.info(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { uploadWithRetry, sleep };
```

### Step 5.2: Create Instagram Uploader (src/upload/instagram.js)

```javascript
const axios = require("axios");
const fs = require("fs");
const logger = require("../utils/logger");

const IG_API_VERSION = "v21.0";
const IG_GRAPH_URL = `https://graph.facebook.com/${IG_API_VERSION}`;

async function uploadToInstagram(videoPath, caption) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const instagramId = process.env.META_INSTAGRAM_ID;

  logger.info("Starting Instagram upload", { videoPath, caption });

  // Step 1: Create media container
  const containerResponse = await axios.post(
    `${IG_GRAPH_URL}/${instagramId}/media`,
    {
      media_type: "REELS",
      video_url: await uploadToTemporaryHost(videoPath), // You'll need a hosting solution
      caption: caption,
      share_to_feed: true,
    },
    {
      params: { access_token: accessToken },
    }
  );

  const containerId = containerResponse.data.id;
  logger.info("Instagram container created", { containerId });

  // Step 2: Poll for container status
  await pollContainerStatus(containerId, accessToken);

  // Step 3: Publish container
  const publishResponse = await axios.post(
    `${IG_GRAPH_URL}/${instagramId}/media_publish`,
    {
      creation_id: containerId,
    },
    {
      params: { access_token: accessToken },
    }
  );

  logger.info("Instagram reel published", { mediaId: publishResponse.data.id });
  return publishResponse.data;
}

async function pollContainerStatus(containerId, accessToken, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await axios.get(`${IG_GRAPH_URL}/${containerId}`, {
      params: {
        fields: "status_code",
        access_token: accessToken,
      },
    });

    const statusCode = statusResponse.data.status_code;
    logger.debug("Container status", {
      containerId,
      statusCode,
      attempt: i + 1,
    });

    if (statusCode === "FINISHED") {
      return;
    } else if (statusCode === "ERROR") {
      throw new Error("Instagram container processing failed");
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Instagram container processing timeout");
}

// Note: You'll need to implement temporary hosting
// Options: Cloudinary, AWS S3, or use Meta's hosting via different endpoint
async function uploadToTemporaryHost(videoPath) {
  // Placeholder - implement based on your hosting choice
  throw new Error("Temporary hosting not implemented - see deployment notes");
}

module.exports = { uploadToInstagram };
```

### Step 5.3: Create Facebook Uploader (src/upload/facebook.js)

```javascript
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const logger = require("../utils/logger");

const FB_API_VERSION = "v21.0";
const FB_GRAPH_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

async function uploadToFacebook(videoPath, caption) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;

  logger.info("Starting Facebook upload", { videoPath, caption });

  // Step 1: Initialize upload
  const initResponse = await axios.post(
    `${FB_GRAPH_URL}/${pageId}/video_reels`,
    {
      upload_phase: "start",
      access_token: accessToken,
    }
  );

  const videoId = initResponse.data.video_id;
  const uploadUrl = initResponse.data.upload_url;

  logger.info("Facebook upload initialized", { videoId });

  // Step 2: Upload video file
  const formData = new FormData();
  formData.append("video_file_chunk", fs.createReadStream(videoPath));

  await axios.post(uploadUrl, formData, {
    headers: formData.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  logger.info("Facebook video uploaded", { videoId });

  // Step 3: Finalize upload
  const finalizeResponse = await axios.post(
    `${FB_GRAPH_URL}/${pageId}/video_reels`,
    {
      video_id: videoId,
      upload_phase: "finish",
      video_state: "PUBLISHED",
      description: caption,
      access_token: accessToken,
    }
  );

  logger.info("Facebook reel published", finalizeResponse.data);
  return finalizeResponse.data;
}

module.exports = { uploadToFacebook };
```

### Step 5.4: Create YouTube Uploader (src/upload/youtube.js)

```javascript
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const logger = require("../utils/logger");

const YOUTUBE_UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos";
const YOUTUBE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function uploadToYouTube(videoPath, caption) {
  logger.info("Starting YouTube upload", { videoPath, caption });

  // Get fresh access token
  const accessToken = await refreshAccessToken();

  // Upload video
  const videoFile = fs.readFileSync(videoPath);

  const response = await axios.post(YOUTUBE_UPLOAD_URL, videoFile, {
    params: {
      part: "snippet,status",
      uploadType: "multipart",
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/mp4",
    },
    data: {
      snippet: {
        title: caption,
        description: `${caption}\n\n#yearProgress #motivation #2025`,
        tags: ["shorts", "yearProgress", "motivation"],
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  logger.info("YouTube Short published", { videoId: response.data.id });
  return response.data;
}

async function refreshAccessToken() {
  const response = await axios.post(YOUTUBE_TOKEN_URL, {
    client_id: process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  return response.data.access_token;
}

module.exports = { uploadToYouTube };
```

### Step 5.5: Create Upload Orchestrator (src/upload/index.js)

```javascript
const { uploadToInstagram } = require("./instagram");
const { uploadToFacebook } = require("./facebook");
const { uploadToYouTube } = require("./youtube");
const { uploadWithRetry } = require("./utils");
const logger = require("../utils/logger");

async function uploadToAllPlatforms(videoPath, caption) {
  logger.info("Starting multi-platform upload", { videoPath, caption });

  const platforms = [
    {
      name: "Instagram",
      uploadFn: () => uploadToInstagram(videoPath, caption),
    },
    {
      name: "Facebook",
      uploadFn: () => uploadToFacebook(videoPath, caption),
    },
    {
      name: "YouTube",
      uploadFn: () => uploadToYouTube(videoPath, caption),
    },
  ];

  // Upload to all platforms concurrently with retries
  const results = await Promise.allSettled(
    platforms.map(({ name, uploadFn }) => uploadWithRetry(uploadFn, name))
  );

  // Analyze results
  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  );
  const failed = results.filter(
    (r) => r.status === "rejected" || !r.value.success
  );

  logger.info("Upload results", {
    total: platforms.length,
    successful: successful.length,
    failed: failed.length,
  });

  if (failed.length > 0) {
    logger.warn("Some uploads failed", {
      failures: failed.map((f) => ({
        platform: f.value?.platform || "unknown",
        error: f.reason?.message || f.value?.error,
      })),
    });
  }

  // Consider it a success if at least one platform worked
  return {
    success: successful.length > 0,
    results: {
      successful: successful.map((r) => r.value),
      failed: failed.map((f) => f.value || { error: f.reason?.message }),
    },
  };
}

module.exports = { uploadToAllPlatforms };
```

---

## 🎯 Phase 6: Main Application (Day 5)

### Step 6.1: Create Main Entry Point (src/index.js)

```javascript
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const logger = require("./utils/logger");
const { calculateYearProgress } = require("./utils/date_calculator");
const { validateAssets } = require("./utils/asset_picker");
const { shouldPost, updateLastPosted } = require("./utils/state_manager");
const { renderVideo } = require("./render");
const { uploadToAllPlatforms } = require("./upload");

async function main() {
  const startTime = Date.now();
  logger.info("=== Year Progress App Started ===");

  try {
    // Step 1: Validate environment
    validateEnvironment();

    // Step 2: Validate assets
    logger.info("Validating assets...");
    validateAssets();

    // Step 3: Calculate year progress
    const progress = calculateYearProgress();
    logger.info("Year progress calculated", progress);

    // Step 4: Check if we should post
    const shouldMakePost = await shouldPost(progress.percent, progress.year);

    if (!shouldMakePost) {
      logger.info("Already posted for this percentage - skipping", {
        percent: progress.percent,
      });
      return;
    }

    // Step 5: Check dry run mode
    if (process.env.DRY_RUN === "true") {
      logger.info("DRY RUN MODE - Would render and post", {
        percent: progress.percent,
        year: progress.year,
      });
      return;
    }

    // Step 6: Render video
    logger.info("Rendering video...");
    const { videoPath, caption, metadata } = await renderVideo(
      progress.percent,
      progress.year
    );

    // Step 7: Upload to platforms
    logger.info("Uploading to platforms...");
    const uploadResults = await uploadToAllPlatforms(videoPath, caption);

    // Step 8: Update state if at least one upload succeeded
    if (uploadResults.success) {
      await updateLastPosted(progress.percent, progress.year);
      logger.info("State updated successfully");
    } else {
      logger.error("All uploads failed - not updating state");
    }

    // Step 9: Cleanup video file
    cleanupVideo(videoPath);

    // Step 10: Log summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info("=== Year Progress App Completed ===", {
      duration: `${duration}s`,
      percent: progress.percent,
      uploaded: uploadResults.success,
    });
  } catch (error) {
    logger.error("Fatal error in main process", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

function validateEnvironment() {
  const required = [
    "GIST_ID",
    "GITHUB_TOKEN",
    "META_PAGE_ACCESS_TOKEN",
    "META_INSTAGRAM_ID",
    "META_PAGE_ID",
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REFRESH_TOKEN",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  logger.info("Environment validated");
}

function cleanupVideo(videoPath) {
  try {
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      logger.info("Video file deleted", { path: videoPath });
    }
  } catch (error) {
    logger.warn("Failed to delete video file", {
      path: videoPath,
      error: error.message,
    });
  }
}

// Run the app
main().catch((error) => {
  logger.error("Unhandled error", { error: error.message });
  process.exit(1);
});

module.exports = { main };
```

---

## 🚀 Phase 7: GitHub Actions Setup (Day 6)

### Step 7.1: Create Workflow File (.github/workflows/daily_post.yml)

```yaml
name: Daily Year Progress Video

on:
  schedule:
    - cron: "0 0 * * *" # Daily at midnight UTC
  workflow_dispatch: # Allow manual triggering

jobs:
  build-and-post:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install FFmpeg
        run: |
          sudo apt-get update
          sudo apt-get install -y ffmpeg
          ffmpeg -version

      - name: Install dependencies
        run: npm ci

      - name: Create directories
        run: |
          mkdir -p logs videos

      - name: Run daily post
        env:
          # State management
          GIST_ID: ${{ secrets.GIST_ID }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

          # Meta/Facebook/Instagram
          META_PAGE_ACCESS_TOKEN: ${{ secrets.META_PAGE_ACCESS_TOKEN }}
          META_INSTAGRAM_ID: ${{ secrets.META_INSTAGRAM_ID }}
          META_PAGE_ID: ${{ secrets.META_PAGE_ID }}

          # YouTube
          YOUTUBE_CLIENT_ID: ${{ secrets.YOUTUBE_CLIENT_ID }}
          YOUTUBE_CLIENT_SECRET: ${{ secrets.YOUTUBE_CLIENT_SECRET }}
          YOUTUBE_REFRESH_TOKEN: ${{ secrets.YOUTUBE_REFRESH_TOKEN }}

          # Config
          LOG_LEVEL: info
          TIMEZONE: UTC
        run: node src/index.js

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: error-logs-${{ github.run_id }}
          path: logs/
          retention-days: 7

      - name: Upload video on failure (for debugging)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: debug-video-${{ github.run_id }}
          path: videos/*.mp4
          retention-days: 1
```

### Step 7.2: Create package.json Scripts

```json
{
  "name": "year-progress-app",
  "version": "1.0.0",
  "description": "Automated daily year progress video generator",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "dry-run": "DRY_RUN=true node src/index.js",
    "test": "node src/index.js",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "keywords": ["automation", "video", "social-media"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@octokit/rest": "^20.0.2",
    "axios": "^1.6.2",
    "canvas": "^2.11.2",
    "dotenv": "^16.3.1",
    "fluent-ffmpeg": "^2.1.2",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "eslint": "^8.55.0",
    "nodemon": "^3.0.2",
    "prettier": "^3.1.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 🔐 Phase 8: API Setup & Credentials (Day 6-7)

### Step 8.1: GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with scope: `gist`
3. Save as `GITHUB_TOKEN` secret

### Step 8.2: Create GitHub Gist

1. Go to https://gist.github.com/
2. Create new secret gist named `year-progress-state`
3. Add file `last_posted.json` with content:

```json
{
  "lastPercent": 0,
  "lastDate": null,
  "year": null
}
```

4. Save the Gist ID from URL (e.g., `abc123def456...`)
5. Save as `GIST_ID` secret

### Step 8.3: Meta (Facebook/Instagram) Setup

**Prerequisites:**

- Facebook Business Page
- Instagram Business/Creator account linked to Page

**Steps:**

1. Go to https://developers.facebook.com/
2. Create new app → Business type
3. Add Instagram Graph API product
4. Generate Page Access Token with permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_manage_posts`
5. Get Instagram Business Account ID:
   ```bash
   curl "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_TOKEN"
   ```
6. Save credentials:
   - `META_PAGE_ACCESS_TOKEN`
   - `META_INSTAGRAM_ID`
   - `META_PAGE_ID`

### Step 8.4: YouTube API Setup

1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/oauth2callback`
5. Download credentials JSON
6. Run OAuth flow to get refresh token:

```javascript
// Run this locally once to get refresh token
const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  "YOUR_CLIENT_ID",
  "YOUR_CLIENT_SECRET",
  "http://localhost:3000/oauth2callback"
);

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/youtube.upload"],
});

console.log("Visit this URL:", url);
// Follow URL, authorize, get code from redirect
// Exchange code for tokens:
const { tokens } = await oauth2Client.getToken("CODE_FROM_URL");
console.log("Refresh token:", tokens.refresh_token);
```

7. Save credentials:
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
   - `YOUTUBE_REFRESH_TOKEN`

### Step 8.5: Add All Secrets to GitHub

1. Go to your repo → Settings → Secrets and variables → Actions
2. Click "New repository secret" for each:
   - `GIST_ID`
   - `GITHUB_TOKEN`
   - `META_PAGE_ACCESS_TOKEN`
   - `META_INSTAGRAM_ID`
   - `META_PAGE_ID`
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
   - `YOUTUBE_REFRESH_TOKEN`

---

## 🧪 Phase 9: Testing & Validation (Day 7)

### Step 9.1: Local Testing Checklist

```bash
# 1. Test environment validation
npm run dry-run

# 2. Test date calculation
node -e "console.log(require('./src/utils/date_calculator').calculateYearProgress())"

# 3. Test asset picker
node -e "require('./src/utils/asset_picker').validateAssets()"

# 4. Test video rendering (will create actual video)
# Comment out upload code in src/index.js temporarily

# 5. Check logs
cat logs/*.log
```

### Step 9.2: GitHub Actions Testing

```bash
# 1. Push code to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Manually trigger workflow
# Go to Actions tab → Daily Year Progress Video → Run workflow

# 3. Monitor execution
# Watch logs in real-time

# 4. Verify state update
# Check your Gist for updated last_posted.json
```

### Step 9.3: End-to-End Test Plan

1. **Day 1**: Enable dry run mode, verify no errors
2. **Day 2**: Disable dry run, test with one platform only
3. **Day 3**: Enable all platforms, verify posts
4. **Day 4**: Verify duplicate prevention (should skip)
5. **Day 5**: Wait for next percentage, verify new post

---

## 📊 Phase 10: Monitoring & Maintenance (Ongoing)

### Step 10.1: Create Monitoring Dashboard

**Create `MONITORING.md`:**

```markdown
# Year Progress App Monitoring

## Daily Checks

- [ ] Check GitHub Actions status
- [ ] Verify posts on all platforms
- [ ] Review error logs if any failures

## Weekly Checks

- [ ] Review asset library (add new backgrounds/audio if needed)
- [ ] Check API token expiration dates
- [ ] Verify state is updating correctly

## Monthly Checks

- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Review engagement metrics on social platforms

## Quarterly Checks

- [ ] Rotate API tokens
- [ ] Archive old logs
- [ ] Plan new features or improvements
```

### Step 10.2: Setup Failure Notifications

**Option A: GitHub Actions Email**
Already enabled by default for workflow failures

**Option B: Custom Webhook** (add to workflow):

```yaml
- name: Notify on failure
  if: failure()
  run: |
    curl -X POST YOUR_WEBHOOK_URL \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"Year Progress workflow failed: ${{ github.run_id }}\"}"
```

### Step 10.3: Create Troubleshooting Guide

**Create `TROUBLESHOOTING.md`:**

```markdown
# Troubleshooting Guide

## Workflow Fails

1. Check Actions logs for error messages
2. Verify all secrets are set correctly
3. Test locally with same environment variables
4. Check API rate limits

## Video Not Rendering

1. Verify FFmpeg is installed: `ffmpeg -version`
2. Check asset files exist and are valid
3. Verify canvas dependencies: `npm list canvas`
4. Test frame generation separately

## Upload Fails

1. Verify API tokens are still valid
2. Check platform-specific requirements (file size, duration, format)
3. Test API connection with simple request
4. Review platform API status pages

## State Not Updating

1. Verify GIST_ID is correct
2. Check GitHub token permissions
3. Manually verify Gist is accessible
4. Test state manager functions locally

## Videos Posted Multiple Times

1. Check last_posted.json in Gist
2. Verify state update is running after uploads
3. Check for workflow running multiple times (cron overlap)
```

---

## 📝 Phase 11: Documentation (Day 8)

### Step 11.1: Create Comprehensive README

**Create `README.md`:**

````markdown
# Year Progress Video Automation

Automatically generates and posts daily year progress videos to Instagram Reels, Facebook Reels, and YouTube Shorts.

## Features

- ✅ Automated daily video generation
- ✅ Random backgrounds and audio for variety
- ✅ Multi-platform posting (Instagram, Facebook, YouTube)
- ✅ Smart duplicate prevention
- ✅ Retry logic for failed uploads
- ✅ Comprehensive logging
- ✅ Free to run on GitHub Actions

## Quick Start

### Prerequisites

- Node.js 18+
- FFmpeg
- GitHub account
- Facebook Business Page + Instagram Business account
- YouTube channel
- API credentials for all platforms

### Installation

```bash
git clone https://github.com/yourusername/year-progress-app.git
cd year-progress-app
npm install
```
````

### Configuration

1. Copy `.env.example` to `.env`
2. Fill in all API credentials (see SETUP.md)
3. Add 6 background images to `assets/backgrounds/`
4. Add 6 audio tracks to `assets/audio/`
5. Add a font file to `assets/fonts/`

### Local Testing

```bash
# Dry run (no posting)
npm run dry-run

# Full run (will post!)
npm start
```

### Deployment

1. Push code to GitHub
2. Add all secrets in repo settings
3. Workflow runs automatically daily at midnight UTC

## Project Structure

```
year-progress-app/
├── src/
│   ├── render/          # Video generation
│   ├── upload/          # Platform uploaders
│   ├── utils/           # Shared utilities
│   └── index.js         # Main entry point
├── assets/              # Images, audio, fonts
├── config/              # Text templates
├── .github/workflows/   # GitHub Actions
└── logs/                # Application logs
```

## Documentation

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [API Setup](API_SETUP.md) - Platform API configuration
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [Monitoring](MONITORING.md) - Maintenance checklist

## License

MIT

## Contributing

Pull requests welcome! Please read CONTRIBUTING.md first.

```

### Step 11.2: Create Setup Guide
**Create `SETUP.md`** with detailed step-by-step instructions for:
- Installing dependencies
- Getting API credentials
- Configuring GitHub secrets
- Adding assets
- Testing locally
- Deploying to GitHub Actions

### Step 11.3: Create API Setup Guide
**Create `API_SETUP.md`** with screenshots and detailed instructions for:
- Meta Developer setup
- YouTube API setup
- GitHub Gist creation
- Token generation and storage

---

## ✅ Final Checklist

### Before Launch
- [ ] All dependencies installed
- [ ] 6+ background images added
- [ ] 6+ audio tracks added
- [ ] Font file added
- [ ] Text templates configured
- [ ] All API credentials obtained
- [ ] GitHub secrets configured
- [ ] GitHub Gist created
- [ ] Local dry-run successful
- [ ] GitHub Actions workflow triggers manually
- [ ] Test video posted successfully to one platform
- [ ] State updates correctly in Gist
- [ ] Error logging works
- [ ] Video cleanup works
- [ ] Documentation complete

### Post-Launch (Week 1)
- [ ] Monitor daily runs
- [ ] Verify posts on all platforms
- [ ] Check for any errors in logs
- [ ] Confirm state is updating
- [ ] Verify no duplicate posts

### Maintenance Schedule
- **Daily**: Quick status check (2 min)
- **Weekly**: Review logs and metrics (10 min)
- **Monthly**: Update dependencies, rotate tokens (30 min)
- **Quarterly**: Major review and improvements (2 hours)

---

## 🎉 Success Metrics

After successful deployment, you should see:
1. Daily GitHub Actions workflow completing successfully
2. New video posted when percentage changes
3. No posts when percentage is the same
4. State file updating in Gist
5. Videos appearing on all three platforms
6. Clean logs with no errors

---

## 🚀 Future Enhancements

### Phase 12 (Optional)
- [ ] Add more platforms (TikTok, Twitter/X)
- [ ] Implement A/B testing for captions
- [ ] Add engagement tracking
- [ ] Create analytics dashboard
- [ ] Add seasonal themes/backgrounds
- [ ] Implement holiday special editions
- [ ] Add user feedback collection
- [ ] Create admin dashboard
- [ ] Add notification system for failures
- [ ] Implement asset rotation strategy

---

## 📞 Support

If you encounter issues:
1. Check TROUBLESHOOTING.md
2. Review GitHub Actions logs
3. Test locally with dry-run mode
4. Open an issue with error logs

---

## Estimated Timeline Summary

- **Day 1**: Setup + Assets (4 hours)
- **Day 2-3**: Core Utilities (6 hours)
- **Day 3-4**: Video Rendering (8 hours)
- **Day 4-5**: Upload Clients (8 hours)
- **Day 5**: Main App (3 hours)
- **Day 6**: GitHub Actions (2 hours)
- **Day 6-7**: API Setup (4 hours)
- **Day 7**: Testing (4 hours)
- **Day 8**: Documentation (3 hours)

**Total: ~42 hours** (about 1 week full-time or 2 weeks part-time)

---

## Budget: $0/month

Everything runs on free tiers:
- GitHub Actions: 2,000 minutes/month free
- GitHub Gist: Unlimited free
- Video rendering: ~5 minutes/month usage
- API calls: Within free limits
- Storage: Temporary only (auto-deleted)
```
