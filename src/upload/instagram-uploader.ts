import axios from 'axios';
import type { Platform } from '../types/index.js';
import { BaseUploader } from './base-uploader.js';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config/index.js';

const IG_API_VERSION = 'v21.0';
const IG_GRAPH_URL = `https://graph.facebook.com/${IG_API_VERSION}`;

/**
 * Instagram Reels Uploader
 *
 * Uses the Instagram Graph API to upload Reels.
 * Requires a publicly accessible URL for the video.
 *
 * @see https://developers.facebook.com/docs/instagram-api/guides/reels-publishing
 */
export class InstagramUploader extends BaseUploader {
    readonly platform: Platform = 'instagram';

    private accessToken: string;
    private instagramId: string;

    constructor() {
        super();
        const config = getConfig();
        this.accessToken = config.meta.pageAccessToken;
        this.instagramId = config.meta.instagramId;
    }

    async verifyCredentials(): Promise<boolean> {
        try {
            const response = await axios.get(`${IG_GRAPH_URL}/${this.instagramId}`, {
                params: {
                    fields: 'id,username',
                    access_token: this.accessToken,
                },
            });
            logger.info('Instagram credentials verified', {
                id: response.data.id,
                username: response.data.username,
            });
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Instagram credential verification failed', { error: message });
            return false;
        }
    }

    protected async uploadImpl(videoPath: string, caption: string): Promise<Record<string, unknown>> {
        this.validateVideoFile(videoPath);

        logger.info('Starting Instagram upload', {
            videoPath,
            captionLength: caption.length,
        });

        // Note: Instagram requires a publicly accessible URL for the video
        // You need to:
        // 1. Upload the video to a hosting service (Cloudinary, S3, etc.)
        // 2. Use the public URL for the API call

        // For now, we'll throw an error explaining the requirement
        // In production, implement uploadToTemporaryHost()
        const videoUrl = await this.uploadToTemporaryHost(videoPath);

        // Step 1: Create media container
        let containerId: string;
        try {
            const containerResponse = await axios.post<{ id: string }>(
                `${IG_GRAPH_URL}/${this.instagramId}/media`,
                {
                    media_type: 'REELS',
                    video_url: videoUrl,
                    caption,
                    share_to_feed: true,
                },
                {
                    params: { access_token: this.accessToken },
                }
            );
            containerId = containerResponse.data.id;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error('Instagram Step 1 (Create Container) failed', {
                    status: error.response?.status,
                    data: error.response?.data,
                });
            }
            throw error;
        }

        logger.info('Instagram container created', { containerId });

        // Step 2: Wait for container to be ready
        await this.pollContainerStatus(containerId);

        // Step 3: Publish the container
        try {
            const publishResponse = await axios.post<{ id: string }>(
                `${IG_GRAPH_URL}/${this.instagramId}/media_publish`,
                {
                    creation_id: containerId,
                },
                {
                    params: { access_token: this.accessToken },
                }
            );

            logger.info('Instagram Reel published', { mediaId: publishResponse.data.id });

            return {
                mediaId: publishResponse.data.id,
                containerId,
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error('Instagram Step 3 (Publish) failed', {
                    status: error.response?.status,
                    data: error.response?.data,
                });
            }
            throw error;
        }
    }

    /**
     * Poll container status until ready or failed
     */
    private async pollContainerStatus(containerId: string, maxAttempts = 30): Promise<void> {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const statusResponse = await axios.get<{ status_code: string }>(`${IG_GRAPH_URL}/${containerId}`, {
                    params: {
                        fields: 'status_code',
                        access_token: this.accessToken,
                    },
                });

                const statusCode = statusResponse.data.status_code;
                logger.debug('Container status', {
                    containerId,
                    statusCode,
                    attempt: i + 1,
                });

                if (statusCode === 'FINISHED') {
                    return;
                } else if (statusCode === 'ERROR') {
                    throw new Error('Instagram container processing failed');
                }
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    logger.error('Instagram Polling failed', {
                        status: error.response?.status,
                        data: error.response?.data,
                    });
                }
                throw error;
            }

            // Wait 2 seconds before next poll
            await this.sleep(2000);
        }

        throw new Error('Instagram container processing timeout');
    }

    /**
     * Upload video to temporary hosting
     *
     * TODO: Implement this method based on your hosting choice:
     * - Cloudinary
     * - AWS S3
     * - Google Cloud Storage
     * - Custom server
     */
    private async uploadToTemporaryHost(videoPath: string): Promise<string> {
        // Check if Cloudinary is configured
        if (
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        ) {
            return this.uploadToCloudinary(videoPath);
        }

        // Check if S3 is configured
        if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
            return this.uploadToS3(videoPath);
        }

        throw new Error(
            'No video hosting configured. Please set up Cloudinary or AWS S3 credentials. ' +
            'See SETUP.md for instructions.'
        );
    }

    /**
     * Upload to Cloudinary
     */
    private async uploadToCloudinary(videoPath: string): Promise<string> {
        const { v2: cloudinary } = await import('cloudinary');

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });

        logger.info('Uploading video to Cloudinary...', { videoPath });

        const result = await cloudinary.uploader.upload(videoPath, {
            resource_type: 'video',
            folder: 'year-in-motion',
            public_id: `progress_${Date.now()}`,
        });

        logger.info('Cloudinary upload successful', { url: result.secure_url });
        return result.secure_url;
    }

    /**
     * Upload to AWS S3 (implement when needed)
     */
    private async uploadToS3(_videoPath: string): Promise<string> {
        // TODO: Implement S3 upload
        // npm install @aws-sdk/client-s3
        // Upload file and return public URL
        throw new Error('S3 upload not implemented yet');
    }
}

/**
 * Factory function
 */
export function createInstagramUploader(): InstagramUploader {
    return new InstagramUploader();
}
