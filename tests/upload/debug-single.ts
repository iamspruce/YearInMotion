import { createInstagramUploader } from '../../src/upload/instagram-uploader.js';
import { createFacebookUploader } from '../../src/upload/facebook-uploader.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { logger } from '../../src/utils/logger.js';

dotenv.config();

/**
 * Debug script to test a single uploader with a local file
 * 
 * Usage: tsx tests/upload/debug-single.ts <platform> <videoPath>
 */
async function debug() {
    const platform = process.argv[2];
    const videoPath = process.argv[3];

    if (!platform || !videoPath) {
        console.error('Usage: tsx tests/upload/debug-single.ts <platform> <videoPath>');
        process.exit(1);
    }

    const fullPath = path.resolve(videoPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        process.exit(1);
    }

    console.log(`Starting debug upload for ${platform}...`);
    console.log(`Video: ${fullPath}`);

    let uploader;
    if (platform === 'instagram') {
        uploader = createInstagramUploader();
    } else if (platform === 'facebook') {
        uploader = createFacebookUploader();
    } else {
        console.error('Platform must be "instagram" or "facebook"');
        process.exit(1);
    }

    try {
        const result = await uploader.upload(fullPath, 'Debug test caption ' + new Date().toISOString());
        console.log('Final Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Debug script caught fatal error:', error);
    }
}

debug();
