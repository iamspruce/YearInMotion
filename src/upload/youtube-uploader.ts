import axios from 'axios';
import fs from 'fs';
import type { Platform } from '../types/index.js';
import { BaseUploader } from './base-uploader.js';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config/index.js';

const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * YouTube Shorts Uploader
 *
 * Uses the YouTube Data API v3 to upload Shorts.
 * Requires OAuth 2.0 credentials with refresh token.
 *
 * @see https://developers.google.com/youtube/v3/guides/uploading_a_video
 */
export class YouTubeUploader extends BaseUploader {
    readonly platform: Platform = 'youtube';

    private clientId: string;
    private clientSecret: string;
    private refreshToken: string;

    constructor() {
        super();
        const config = getConfig();
        this.clientId = config.youtube.clientId;
        this.clientSecret = config.youtube.clientSecret;
        this.refreshToken = config.youtube.refreshToken;
    }

    async verifyCredentials(): Promise<boolean> {
        try {
            const token = await this.refreshAccessToken();
            return !!token;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('YouTube credential verification failed', { error: message });
            return false;
        }
    }

    protected async uploadImpl(videoPath: string, caption: string): Promise<Record<string, unknown>> {
        this.validateVideoFile(videoPath);

        logger.info('Starting YouTube upload', {
            videoPath,
            captionLength: caption.length,
        });

        // Get fresh access token
        const accessToken = await this.refreshAccessToken();

        // Read video file
        const videoBuffer = fs.readFileSync(videoPath);
        const videoSize = fs.statSync(videoPath).size;

        // Prepare metadata
        const metadata = {
            snippet: {
                title: this.truncateTitle(caption),
                description: this.formatDescription(caption),
                tags: ['shorts', 'yearProgress', 'motivation', '2025'],
                categoryId: '22', // People & Blogs
            },
            status: {
                privacyStatus: 'public',
                selfDeclaredMadeForKids: false,
                madeForKids: false,
            },
        };

        // Step 1: Initialize resumable upload
        const initResponse = await axios.post(
            `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
            metadata,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Length': videoSize,
                    'X-Upload-Content-Type': 'video/mp4',
                },
            }
        );

        const uploadUrl = initResponse.headers.location as string;

        if (!uploadUrl) {
            throw new Error('Failed to get upload URL from YouTube');
        }

        logger.info('YouTube upload initialized', { uploadUrl: uploadUrl.substring(0, 50) + '...' });

        // Step 2: Upload video file
        const uploadResponse = await axios.put<{
            id: string;
            snippet: { title: string };
        }>(uploadUrl, videoBuffer, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'video/mp4',
                'Content-Length': videoSize,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        const videoId = uploadResponse.data.id;

        logger.info('YouTube Short published', {
            videoId,
            title: uploadResponse.data.snippet.title,
        });

        return {
            videoId,
            url: `https://youtube.com/shorts/${videoId}`,
        };
    }

    /**
     * Refresh the access token using the refresh token
     */
    private async refreshAccessToken(): Promise<string> {
        logger.debug('Refreshing YouTube access token');

        const response = await axios.post<{
            access_token: string;
            expires_in: number;
        }>(
            YOUTUBE_TOKEN_URL,
            new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token',
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        logger.debug('Access token refreshed', { expiresIn: response.data.expires_in });

        return response.data.access_token;
    }

    /**
     * Truncate title to YouTube's 100 character limit
     */
    private truncateTitle(caption: string): string {
        // Get first line for title
        const title = caption.split('\n')[0] ?? caption;

        // Remove hashtags from title
        const cleanTitle = title.replace(/#\w+/g, '').trim();

        // Truncate to 100 characters
        if (cleanTitle.length <= 100) return cleanTitle;
        return cleanTitle.substring(0, 97) + '...';
    }

    /**
     * Format description with hashtags
     */
    private formatDescription(caption: string): string {
        return `${caption}\n\n#Shorts #yearProgress #motivation`;
    }
}

/**
 * Factory function
 */
export function createYouTubeUploader(): YouTubeUploader {
    return new YouTubeUploader();
}
