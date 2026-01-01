/**
 * EXAMPLE: Horoscope Content Generator
 *
 * This file demonstrates how to create a content generator for horoscopes.
 * Copy this template and modify for your specific use case.
 *
 * To use this generator:
 * 1. Rename this file to horoscope-generator.ts (remove .example)
 * 2. Install any required dependencies (e.g., an astrology API client)
 * 3. Implement the horoscope fetching logic
 * 4. Update config/texts.json with horoscope templates
 * 5. Register the generator in src/index.ts
 */

import type { StateData } from '../types/index.js';
import { BaseContentGenerator } from './base-generator.js';
import { getRandomText, getHashtags } from '../utils/asset-picker.js';
import { logger } from '../utils/logger.js';

/**
 * Zodiac signs
 */
const ZODIAC_SIGNS = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
] as const;

type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

/**
 * Horoscope data structure
 */
interface HoroscopeData {
    sign: ZodiacSign;
    date: string;
    content: string;
    luckyNumber: number;
    mood: string;
}

/**
 * Example Horoscope Content Generator
 *
 * This generator creates daily horoscope videos.
 * You would typically fetch horoscope data from an API.
 */
export class HoroscopeGenerator extends BaseContentGenerator {
    readonly contentType = 'horoscope';

    private currentSign: ZodiacSign;
    private horoscopeData: HoroscopeData | null = null;

    constructor(sign: ZodiacSign = 'Aries') {
        super();
        this.currentSign = sign;
    }

    /**
     * Set the zodiac sign for this generator
     */
    setSign(sign: ZodiacSign): void {
        this.currentSign = sign;
        this.horoscopeData = null;
    }

    /**
     * Fetch horoscope data (implement your API call here)
     */
    private async fetchHoroscope(): Promise<HoroscopeData> {
        // TODO: Replace with actual API call
        // Example APIs:
        // - https://aztro.sameerkumar.website/
        // - https://ohmanda.com/api/horoscope/
        // - https://horoscope-app-api.vercel.app/

        logger.info('Fetching horoscope', { sign: this.currentSign });

        // Placeholder implementation - replace with real API
        const horoscope: HoroscopeData = {
            sign: this.currentSign,
            date: new Date().toISOString().split('T')[0] ?? '',
            content:
                'Today brings new opportunities for growth. Trust your instincts and embrace change.',
            luckyNumber: Math.floor(Math.random() * 99) + 1,
            mood: 'Optimistic',
        };

        return horoscope;
    }

    protected getText(): string {
        if (!this.horoscopeData) {
            throw new Error('Horoscope data not loaded. Call generate() first.');
        }

        // Try to use template from config, fall back to direct content
        try {
            return getRandomText('horoscope', {
                sign: this.horoscopeData.sign,
                date: this.horoscopeData.date,
                content: this.horoscopeData.content,
            });
        } catch {
            // Fallback if no templates configured
            return `✨ ${this.horoscopeData.sign} ✨\n\n${this.horoscopeData.content}`;
        }
    }

    protected getPercent(): number {
        // For horoscopes, we can use lucky number as a visual element
        // or just show a constant value
        return this.horoscopeData?.luckyNumber ?? 50;
    }

    protected getHashtags(): string[] {
        const baseHashtags = getHashtags('horoscope');
        const signHashtag = `#${this.currentSign.toLowerCase()}`;
        return [...baseHashtags, signHashtag];
    }

    override getCurrentIdentifier(): string {
        // Unique identifier is the sign + date
        const date = new Date().toISOString().split('T')[0];
        return `${this.currentSign}_${date}`;
    }

    protected override getAdditionalMetadata(): Record<string, unknown> {
        return {
            sign: this.currentSign,
            luckyNumber: this.horoscopeData?.luckyNumber,
            mood: this.horoscopeData?.mood,
        };
    }

    override async shouldGenerate(lastState: StateData | null): Promise<boolean> {
        if (!lastState) return true;
        if (lastState.contentType !== this.contentType) return true;

        // Generate new content each day for each sign
        const currentId = this.getCurrentIdentifier();
        return lastState.lastValue !== currentId;
    }

    /**
     * Override generate to fetch horoscope first
     */
    override async generate(): ReturnType<BaseContentGenerator['generate']> {
        // Fetch horoscope data before generating
        this.horoscopeData = await this.fetchHoroscope();

        // Call parent generate method
        return super.generate();
    }
}

/**
 * Factory function to create horoscope generators for all signs
 */
export function createHoroscopeGenerators(): Map<ZodiacSign, HoroscopeGenerator> {
    const generators = new Map<ZodiacSign, HoroscopeGenerator>();

    for (const sign of ZODIAC_SIGNS) {
        generators.set(sign, new HoroscopeGenerator(sign));
    }

    return generators;
}

/**
 * Factory function to create a single horoscope generator
 */
export function createHoroscopeGenerator(sign: ZodiacSign): HoroscopeGenerator {
    return new HoroscopeGenerator(sign);
}
