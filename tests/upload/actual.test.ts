import { describe, it, expect } from 'vitest';
import { getConfig } from '../../src/config/index.js';
import { createInstagramUploader } from '../../src/upload/instagram-uploader.js';
import { createYouTubeUploader } from '../../src/upload/youtube-uploader.js';
import { createFacebookUploader } from '../../src/upload/facebook-uploader.js';
import fs from 'fs';
import path from 'path';

describe('Actual Uploaders Configuration & Smoke Test', () => {
    // This test ensures that the .env variables are correctly loaded and mapped
    it('should load actual configuration from .env', () => {
        const config = getConfig();

        // State Management
        expect(config.gist.id).toBeDefined();
        expect(config.gist.token).toBeDefined();
        expect(config.gist.id).not.toBe('test-gist'); // Ensure it's not the mocked value

        // Meta API
        expect(config.meta.pageAccessToken).toBeDefined();
        expect(config.meta.instagramId).toBeDefined();
        expect(config.meta.pageId).toBeDefined();

        // YouTube API
        expect(config.youtube.clientId).toBeDefined();
        expect(config.youtube.clientSecret).toBeDefined();
        expect(config.youtube.refreshToken).toBeDefined();

        // Hosting (Instagram dependency)
        const hasHosting = (
            (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) ||
            (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID)
        );

        console.log('Successfully loaded config for:', {
            gistId: config.gist.id.substring(0, 4) + '...',
            instagramId: config.meta.instagramId,
            youtubeClientId: config.youtube.clientId.substring(0, 10) + '...',
            hostingConfigured: !!hasHosting,
        });
    });

    describe('Gist State Manager (Live)', () => {
        it('should be able to fetch state from Gist', async () => {
            const { getLastPosted } = await import('../../src/utils/state-manager.js');
            const config = getConfig();

            // We don't expect it to necessarily exist, but the call should not throw a 401/404/etc.
            // if credentials are correct.
            try {
                const state = await getLastPosted(config.gist.id, config.gist.token);
                console.log('✓ Gist access verified', state ? '(state found)' : '(no state yet)');
                expect(true).toBe(true);
            } catch (error) {
                console.error('✗ Gist access failed', error);
                throw error;
            }
        });
    });

    describe('Instantiation', () => {
        it('should initialize InstagramUploader with config', () => {
            const uploader = createInstagramUploader();
            expect(uploader.platform).toBe('instagram');
            expect((uploader as any).accessToken).toBeDefined();
        });

        it('should initialize YouTubeUploader with config', () => {
            const uploader = createYouTubeUploader();
            expect(uploader.platform).toBe('youtube');
            expect((uploader as any).clientId).toBeDefined();
        });

        it('should initialize FacebookUploader with config', () => {
            const uploader = createFacebookUploader();
            expect(uploader.platform).toBe('facebook');
            expect((uploader as any).pageId).toBeDefined();
        });
    });

    describe('Credential Verification (Live)', () => {
        it('should verify Instagram credentials', async () => {
            const uploader = createInstagramUploader();
            const isValid = await uploader.verifyCredentials();
            expect(isValid).toBe(true);
        });

        it('should verify YouTube credentials', async () => {
            const uploader = createYouTubeUploader();
            const isValid = await uploader.verifyCredentials();
            expect(isValid).toBe(true);
        });

        it('should verify Facebook credentials', async () => {
            const uploader = createFacebookUploader();
            const isValid = await uploader.verifyCredentials();
            expect(isValid).toBe(true);
        });
    });

    describe('Dry Run Test', () => {
        const testVideo = path.join(process.cwd(), 'videos/progress_0_1767230687398.mp4');

        it('should perform dry run upload for all platforms', async () => {
            // Ensure test video exists
            if (!fs.existsSync(testVideo)) {
                console.warn('Test video not found, skipping dry run test');
                return;
            }

            const uploaders = [
                createInstagramUploader(),
                createYouTubeUploader(),
                createFacebookUploader()
            ];

            for (const uploader of uploaders) {
                const result = await uploader.upload(testVideo, 'Test caption #dryrun', { dryRun: true });
                expect(result.success).toBe(true);
                expect(result.result).toEqual({ dryRun: true });
                console.log(`✓ Dry run successful for ${uploader.platform}`);
            }
        });
    });
});
