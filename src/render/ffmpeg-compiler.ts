import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { RENDER_CONFIG } from '../config/index.js';

/**
 * Options for video compilation
 */
export interface CompileOptions {
    /** Directory containing frame images (frame_%04d.png format) */
    framesDir: string;
    /** Path to audio file */
    audioPath: string;
    /** Output video path */
    outputPath: string;
    /** Frames per second */
    fps?: number;
    /** Video duration in seconds */
    duration?: number;
}

/**
 * Compile frames and audio into a video file
 *
 * @param options - Compilation options
 * @returns Path to the compiled video
 */
export async function compileVideo(options: CompileOptions): Promise<string> {
    const fps = options.fps ?? RENDER_CONFIG.fps;
    const duration = options.duration ?? RENDER_CONFIG.minDuration;

    logger.info('Compiling video', {
        framesDir: options.framesDir,
        audioPath: options.audioPath,
        outputPath: options.outputPath,
        fps,
        duration,
    });

    return new Promise((resolve, reject) => {
        const command = ffmpeg();

        command
            // Input: image sequence
            .input(path.join(options.framesDir, 'frame_%04d.png'))
            .inputFPS(fps)

            // Input: audio
            .input(options.audioPath)

            // Video settings for social media
            .videoCodec('libx264')
            .outputOptions([
                '-pix_fmt yuv420p', // Required for compatibility
                '-preset fast', // Balance between speed and quality
                '-crf 23', // Quality level (lower = better, 18-28 recommended)
                '-movflags +faststart', // Enable streaming
                '-profile:v baseline', // Maximum compatibility
                '-level 3.0',
            ])

            // Audio settings
            .audioCodec('aac')
            .audioBitrate('128k')
            .audioFrequency(44100)

            // Output settings
            .duration(duration)
            .size('1080x1920') // 9:16 aspect ratio for shorts/reels
            .output(options.outputPath)

            // Event handlers
            .on('start', (cmd: string) => {
                logger.debug('FFmpeg command started', { cmd });
            })
            .on('progress', (progress: { percent?: number }) => {
                if (progress.percent) {
                    logger.debug('Encoding progress', { percent: Math.round(progress.percent) });
                }
            })
            .on('end', () => {
                logger.info('Video compilation complete', { outputPath: options.outputPath });
                resolve(options.outputPath);
            })
            .on('error', (err: Error) => {
                logger.error('FFmpeg error', { error: err.message });
                reject(err);
            })
            .run();
    });
}

/**
 * Clean up generated frames
 *
 * @param framesDir - Directory containing frames
 */
export function cleanupFrames(framesDir: string): void {
    try {
        if (!fs.existsSync(framesDir)) {
            return;
        }

        const files = fs.readdirSync(framesDir);
        let cleaned = 0;

        files.forEach((file) => {
            if (file.startsWith('frame_') && file.endsWith('.png')) {
                fs.unlinkSync(path.join(framesDir, file));
                cleaned++;
            }
        });

        // Remove directory if empty
        if (fs.readdirSync(framesDir).length === 0) {
            fs.rmdirSync(framesDir);
        }

        logger.info('Cleaned up frames', { dir: framesDir, filesDeleted: cleaned });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Failed to cleanup frames', { dir: framesDir, error: message });
    }
}

/**
 * Delete a video file
 *
 * @param videoPath - Path to video file
 */
export function cleanupVideo(videoPath: string): void {
    try {
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
            logger.info('Video file deleted', { path: videoPath });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Failed to delete video file', { path: videoPath, error: message });
    }
}

/**
 * Get video file information using FFprobe
 *
 * @param videoPath - Path to video file
 * @returns Video metadata
 */
export function getVideoInfo(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    size: number;
}> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
            const stats = fs.statSync(videoPath);

            resolve({
                duration: metadata.format.duration ?? 0,
                width: videoStream?.width ?? 0,
                height: videoStream?.height ?? 0,
                size: stats.size,
            });
        });
    });
}
