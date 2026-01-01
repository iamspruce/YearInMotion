import type { ContentGenerator, GeneratedContent, StateData } from '../types/index.js';
import { renderVideo } from '../render/index.js';
import { logger } from '../utils/logger.js';

/**
 * Abstract base class for content generators
 * Extend this class to create new content types (horoscope, quotes, etc.)
 */
export abstract class BaseContentGenerator implements ContentGenerator {
    abstract readonly contentType: string;

    /**
     * Get the text to display in the video
     */
    protected abstract getText(): string;

    /**
     * Get the progress percentage for the progress bar (0-100)
     */
    protected abstract getPercent(): number;

    /**
     * Get hashtags for the post
     */
    protected abstract getHashtags(): string[];

    /**
     * Get the current unique identifier for this content
     * (e.g., percentage for year progress, zodiac sign for horoscope)
     */
    abstract getCurrentIdentifier(): string | number;

    /**
     * Check if new content should be generated based on last state
     */
    abstract shouldGenerate(lastState: StateData | null): Promise<boolean>;

    /**
     * Get additional metadata for the content
     */
    protected getAdditionalMetadata(): Record<string, unknown> {
        return {};
    }

    /**
     * Generate the content (video)
     */
    async generate(): Promise<GeneratedContent> {
        const text = this.getText();
        const percent = this.getPercent();
        const hashtags = this.getHashtags();

        logger.info('Generating content', {
            contentType: this.contentType,
            identifier: this.getCurrentIdentifier(),
            text,
            percent,
        });

        const renderResult = await renderVideo({
            text,
            percent,
        });

        return {
            videoPath: renderResult.videoPath,
            caption: renderResult.caption,
            hashtags,
            metadata: {
                contentType: this.contentType,
                identifier: this.getCurrentIdentifier(),
                background: renderResult.metadata.background,
                audio: renderResult.metadata.audio,
                generatedAt: new Date().toISOString(),
                ...this.getAdditionalMetadata(),
            },
        };
    }
}
