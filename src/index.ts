import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { getConfig, isDryRun } from './config/index.js';
import { validateAssets } from './utils/asset-picker.js';
import { getLastPosted, updateLastPosted, createInitialState } from './utils/state-manager.js';
import { YearProgressGenerator } from './generators/year-progress-generator.js';
import { uploadToAllPlatforms } from './upload/index.js';
import { cleanupVideo } from './render/index.js';

// Load environment variables
dotenv.config();

/**
 * Main application entry point
 */
async function main(): Promise<void> {
    const startTime = Date.now();
    logger.info('=== Year Progress App Started ===');

    try {
        // Step 1: Validate environment
        logger.info('Validating environment...');
        const config = getConfig();

        // Step 2: Validate assets
        logger.info('Validating assets...');
        const assetValidation = validateAssets();

        if (!assetValidation.valid) {
            logger.error('Asset validation failed', { errors: assetValidation.errors });
            throw new Error(`Asset validation failed:\n${assetValidation.errors.join('\n')}`);
        }

        logger.info('Assets validated', { assets: assetValidation.assets });

        // Step 3: Initialize content generator
        const generator = new YearProgressGenerator();
        const yearProgress = generator.getYearProgress();
        logger.info('Year progress calculated', yearProgress as unknown as Record<string, unknown>);

        // Step 5: Check if we should generate new content
        const lastState = await getLastPosted(config.gist.id, config.gist.token);
        const shouldGenerate = await generator.shouldGenerate(lastState);

        if (!shouldGenerate) {
            logger.info('Already posted for this percentage - skipping', {
                percent: yearProgress.percent,
            });
            logSummary(startTime, false, 'skipped');
            return;
        }

        // Step 6: Generate content
        logger.info('Generating video...');
        const content = await generator.generate();
        logger.info('Video generated', {
            videoPath: content.videoPath,
            caption: content.caption,
        });

        // Step 7: Check dry run mode
        if (isDryRun()) {
            logger.info('DRY RUN MODE - Video generated but skipping upload and state update', {
                percent: yearProgress.percent,
                year: yearProgress.year,
                videoPath: content.videoPath,
            });
            logSummary(startTime, true, 'dry-run');
            return;
        }

        // Step 8: Upload to all platforms
        logger.info('Uploading to platforms...');
        const fullCaption = formatCaptionWithHashtags(content.caption, content.hashtags);
        const uploadResults = await uploadToAllPlatforms(content.videoPath, fullCaption, {
            dryRun: isDryRun(),
        });

        // Step 8: Update state if at least one upload succeeded
        if (uploadResults.success) {
            const newState = createInitialState(
                generator.contentType,
                yearProgress.percent,
                yearProgress.year
            );
            await updateLastPosted(config.gist.id, config.gist.token, newState);
            logger.info('State updated successfully');
        } else {
            logger.error('All uploads failed - not updating state');
        }

        // Step 9: Cleanup video file
        cleanupVideo(content.videoPath);

        // Step 10: Log summary
        logSummary(startTime, uploadResults.success, 'completed');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Fatal error in main process', {
            error: message,
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}

/**
 * Format caption with hashtags
 */
function formatCaptionWithHashtags(caption: string, hashtags: string[]): string {
    if (hashtags.length === 0) return caption;
    return `${caption}\n\n${hashtags.join(' ')}`;
}

/**
 * Log execution summary
 */
function logSummary(startTime: number, success: boolean, status: string): void {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('=== Year Progress App Completed ===', {
        duration: `${duration}s`,
        status,
        success,
    });
}

// Run the application
main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Unhandled error', { error: message });
    process.exit(1);
});

export { main };
