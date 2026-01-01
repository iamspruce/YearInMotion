import { createCanvas, registerFont, loadImage, Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import fs from 'fs';
import path from 'path';
import type { RenderConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { RENDER_CONFIG } from '../config/index.js';

/**
 * Options for frame generation
 */
export interface FrameGenerationOptions {
    /** Path to background image */
    backgroundPath: string;
    /** Text to display */
    text: string;
    /** Progress percentage (0-100) */
    percent: number;
    /** Output directory for frames */
    outputDir: string;
    /** Video duration in seconds */
    duration: number;
    /** Optional render configuration override */
    config?: Partial<RenderConfig>;
}

/**
 * Register a custom font for canvas rendering
 */
export function registerCustomFont(fontPath: string, family: string = 'Primary'): void {
    try {
        registerFont(fontPath, { family });
        logger.debug('Registered custom font', { fontPath, family });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to register font', { fontPath, error: message });
        throw error;
    }
}

/**
 * Draw an animated progress bar
 */
function drawProgressBar(
    ctx: CanvasRenderingContext2D,
    progress: number,
    config: RenderConfig
): void {
    const barHeight = 60;
    const barY = config.height / 2 - barHeight / 2;
    const barPadding = 120;
    const barWidth = config.width - barPadding * 2;

    // Background bar (semi-transparent white)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(ctx, barPadding, barY, barWidth, barHeight, 15);
    ctx.fill();

    // Progress fill with gradient
    if (progress > 0) {
        const gradient = ctx.createLinearGradient(
            barPadding,
            0,
            barPadding + barWidth * progress,
            0
        );
        gradient.addColorStop(0, '#00C9FF');
        gradient.addColorStop(0.5, '#92FE9D');
        gradient.addColorStop(1, '#FFD700');

        ctx.fillStyle = gradient;
        roundRect(ctx, barPadding, barY, barWidth * progress, barHeight, 15);
        ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 4;
    roundRect(ctx, barPadding, barY, barWidth, barHeight, 15);
    ctx.stroke();
}

/**
 * Draw rounded rectangle
 */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Draw text with animation
 */
function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    frame: number,
    totalFrames: number,
    config: RenderConfig
): void {
    const fps = config.fps;
    const fadeInDuration = fps * 0.5;

    let alpha = 1;
    if (frame < fadeInDuration) {
        alpha = frame / fadeInDuration;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;

    const lines = text.split('\n');
    const centerY = config.height / 2;

    // Line 1: Above the bar
    if (lines[0]) {
        ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`;
        ctx.fillText(lines[0], config.width / 2, centerY - 150);
    }

    // Line 2: Below the bar
    if (lines[1]) {
        ctx.font = `bold ${config.fontSize * 0.8}px ${config.fontFamily}`;
        ctx.fillText(lines[1], config.width / 2, centerY + 150);
    }

    ctx.restore();
}

/**
 * Generate all frames for a video
 *
 * @param options - Frame generation options
 * @returns Array of frame file paths
 */
export async function generateFrames(options: FrameGenerationOptions): Promise<string[]> {
    const config: RenderConfig = {
        ...RENDER_CONFIG,
        ...options.config,
    };

    logger.info('Generating video frames', {
        backgroundPath: options.backgroundPath,
        text: options.text,
        percent: options.percent,
        config: {
            width: config.width,
            height: config.height,
            fps: config.fps,
            duration: options.duration,
            animationSpeed: config.animationSpeed,
            pauseDuration: config.pauseDuration,
        },
    });

    const totalFrames = config.fps * options.duration;
    const pauseFrames = config.fps * config.pauseDuration;
    const animationFrames = totalFrames - pauseFrames;
    const frames: string[] = [];

    // Create canvas
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d');

    // Load background image
    const bgImage = await loadImage(options.backgroundPath);

    // Ensure output directory exists
    if (!fs.existsSync(options.outputDir)) {
        fs.mkdirSync(options.outputDir, { recursive: true });
    }

    for (let frame = 0; frame < totalFrames; frame++) {
        // Clear canvas
        ctx.clearRect(0, 0, config.width, config.height);

        // Draw background (cover mode)
        drawBackgroundCover(ctx, bgImage, config.width, config.height);

        // Add dark overlay for text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, config.width, config.height);

        // Calculate animated progress
        let progress: number;
        if (frame < animationFrames) {
            // Animation phase
            progress = (frame / animationFrames) * (options.percent / 100);
        } else {
            // Hold phase
            progress = options.percent / 100;
        }
        drawProgressBar(ctx, progress, config);

        // Draw text with animation
        drawText(ctx, options.text, frame, totalFrames, config);

        // Save frame
        const framePath = path.join(
            options.outputDir,
            `frame_${frame.toString().padStart(4, '0')}.png`
        );
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(framePath, buffer);
        frames.push(framePath);
    }

    logger.info('Frames generated', { count: frames.length });
    return frames;
}

/**
 * Draw background image in cover mode (fill canvas while maintaining aspect ratio)
 */
function drawBackgroundCover(
    ctx: CanvasRenderingContext2D,
    image: Image,
    canvasWidth: number,
    canvasHeight: number
): void {
    const imgWidth = image.width;
    const imgHeight = image.height;

    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imgRatio > canvasRatio) {
        // Image is wider - fit height
        drawHeight = canvasHeight;
        drawWidth = imgWidth * (canvasHeight / imgHeight);
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
    } else {
        // Image is taller - fit width
        drawWidth = canvasWidth;
        drawHeight = imgHeight * (canvasWidth / imgWidth);
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
    }

    ctx.drawImage(image as any, offsetX, offsetY, drawWidth, drawHeight);
}
