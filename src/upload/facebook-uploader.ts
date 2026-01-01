import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import type { Platform } from '../types/index.js';
import { BaseUploader } from './base-uploader.js';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config/index.js';

const FB_API_VERSION = 'v21.0';
const FB_GRAPH_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Facebook Reels Uploader
 *
 * Uses the Facebook Graph API to upload Reels to a Facebook Page.
 *
 * @see https://developers.facebook.com/docs/video-api/guides/reels-publishing
 */
export class FacebookUploader extends BaseUploader {
    readonly platform: Platform = 'facebook';

    private accessToken: string;
    private pageId: string;

    constructor() {
        super();
        const config = getConfig();
        this.accessToken = config.meta.pageAccessToken;
        this.pageId = config.meta.pageId;
    }

    async verifyCredentials(): Promise<boolean> {
        try {
            const response = await axios.get(`${FB_GRAPH_URL}/${this.pageId}`, {
                params: {
                    fields: 'id,name',
                    access_token: this.accessToken,
                },
            });
            logger.info('Facebook credentials verified', {
                id: response.data.id,
                name: response.data.name,
            });
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Facebook credential verification failed', { error: message });
            return false;
        }
    }

    protected async uploadImpl(videoPath: string, caption: string): Promise<Record<string, unknown>> {
        this.validateVideoFile(videoPath);

        logger.info('Starting Facebook upload', {
            videoPath,
            captionLength: caption.length,
        });

        // Step 1: Initialize upload session
        const initResponse = await axios.post<{
            video_id: string;
            upload_url: string;
        }>(`${FB_GRAPH_URL}/${this.pageId}/video_reels`, {
            upload_phase: 'start',
            access_token: this.accessToken,
        });

        const videoId = initResponse.data.video_id;
        const uploadUrl = initResponse.data.upload_url;

        logger.info('Facebook upload initialized', { videoId });

        // Step 2: Upload video file
        const videoSize = fs.statSync(videoPath).size;
        const formData = new FormData();
        formData.append('video_file_chunk', fs.createReadStream(videoPath));

        try {
            await axios.post(uploadUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                    Authorization: `OAuth ${this.accessToken}`,
                    'file_size': videoSize,
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error('Facebook upload step 2 failed', {
                    status: error.response?.status,
                    data: error.response?.data,
                    headers: error.response?.headers,
                });
            }
            throw error;
        }

        logger.info('Facebook video uploaded', { videoId });

        // Step 3: Finalize and publish
        const finalizeResponse = await axios.post<{
            success: boolean;
        }>(`${FB_GRAPH_URL}/${this.pageId}/video_reels`, {
            video_id: videoId,
            upload_phase: 'finish',
            video_state: 'PUBLISHED',
            description: caption,
            access_token: this.accessToken,
        });

        logger.info('Facebook Reel published', {
            videoId,
            success: finalizeResponse.data.success,
        });

        return {
            videoId,
            success: finalizeResponse.data.success,
        };
    }
}

/**
 * Factory function
 */
export function createFacebookUploader(): FacebookUploader {
    return new FacebookUploader();
}
