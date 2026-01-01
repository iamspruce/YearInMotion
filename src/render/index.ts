import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFrames, registerCustomFont } from './canvas-renderer.js';
import { compileVideo, cleanupFrames } from './ffmpeg-compiler.js';
import { getRandomBackground, getRandomAudio, getFontPath } from '../utils/asset-picker.js';
import { logger } from '../utils/logger.js';
import type { RenderResult } from '../types/index.js';
import { RENDER_CONFIG, ASSET_PATHS } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

let fontRegistered = false;

/**
 * Options for video rendering
 */
export interface RenderVideoOptions {
    /** Text to display in the video */
    text: string;
    /** Progress percentage (0-100) for the progress bar */
    percent: number;
    /** Optional custom background path (uses random if not provided) */
    backgroundPath?: string;
    /** Optional custom audio path (uses random if not provided) */
    audioPath?: string;
    /** Optional custom output filename */
    filename?: string;
}

/**
 * Ensure the videos directory exists
 */
function ensureVideosDir(): string {
    const videosDir = path.join(PROJECT_ROOT, ASSET_PATHS.videos);
    if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
    }
    return videosDir;
}

/**
 * Register the font if not already registered
 */
function ensureFontRegistered(): void {
    if (fontRegistered) return;

    try {
        const fontPath = getFontPath();
        registerCustomFont(fontPath, RENDER_CONFIG.fontFamily);
        fontRegistered = true;
    } catch (error) {
        logger.warn('Could not register custom font, using system font', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Render a video with the given text and progress
 *
 * @param options - Render options
 * @returns Render result with video path and metadata
 */
export async function renderVideo(options: RenderVideoOptions): Promise<RenderResult> {
    const timestamp = Date.now();
    const videosDir = ensureVideosDir();

    // Generate output paths
    const filename = options.filename ?? `progress_${options.percent}_${timestamp}.mp4`;
    const outputPath = path.join(videosDir, filename);
    const framesDir = path.join(videosDir, `frames_${timestamp}`);

    // Ensure font is registered
    ensureFontRegistered();

    // Select assets
    const backgroundPath = options.backgroundPath ?? getRandomBackground();
    const audioPath = options.audioPath ?? getRandomAudio();

    logger.info('Starting video render', {
        text: options.text,
        percent: options.percent,
        background: path.basename(backgroundPath),
        audio: path.basename(audioPath),
        output: filename,
    });

    try {
        // Create frames directory
        if (!fs.existsSync(framesDir)) {
            fs.mkdirSync(framesDir, { recursive: true });
        }

        // Calculate duration based on animation speed and hold time
        const animationTime = options.percent / RENDER_CONFIG.animationSpeed;
        const duration = Math.max(RENDER_CONFIG.minDuration, animationTime + RENDER_CONFIG.pauseDuration);

        // Generate frames
        await generateFrames({
            backgroundPath,
            text: options.text,
            percent: options.percent,
            outputDir: framesDir,
            duration,
        });

        // Compile video
        await compileVideo({
            framesDir,
            audioPath,
            outputPath,
            duration,
        });

        // Cleanup frames directory
        cleanupFrames(framesDir);
        if (fs.existsSync(framesDir)) {
            fs.rmSync(framesDir, { recursive: true, force: true });
        }

        logger.info('Video render complete', { outputPath, duration });

        return {
            videoPath: outputPath,
            caption: options.text,
            metadata: {
                background: path.basename(backgroundPath),
                audio: path.basename(audioPath),
                duration,
                resolution: `${RENDER_CONFIG.width}x${RENDER_CONFIG.height}`,
            },
        };
    } catch (error) {
        // Cleanup on error
        if (fs.existsSync(framesDir)) {
            fs.rmSync(framesDir, { recursive: true, force: true });
        }
        throw error;
    }
}

export { cleanupFrames } from './ffmpeg-compiler.js';
export { cleanupVideo } from './ffmpeg-compiler.js';
