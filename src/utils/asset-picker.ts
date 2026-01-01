import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AssetInfo, AssetValidationResult } from '../types/index.js';
import { ASSET_PATHS, ASSET_REQUIREMENTS } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');

/**
 * Get list of files in a directory (excluding hidden files)
 */
function getFilesInDirectory(dirPath: string): string[] {
    const fullPath = path.join(PROJECT_ROOT, dirPath);

    if (!fs.existsSync(fullPath)) {
        return [];
    }

    return fs.readdirSync(fullPath).filter((file) => !file.startsWith('.'));
}

/**
 * Get a random file from a directory
 *
 * @param directory - Path to directory (relative to project root)
 * @returns Full path to randomly selected file
 * @throws Error if no files found
 */
export function getRandomFile(directory: string): string {
    const files = getFilesInDirectory(directory);

    if (files.length === 0) {
        throw new Error(`No files found in ${directory}`);
    }

    const randomIndex = Math.floor(Math.random() * files.length);
    const randomFile = files[randomIndex];

    if (!randomFile) {
        throw new Error(`Failed to select random file from ${directory}`);
    }

    return path.join(PROJECT_ROOT, directory, randomFile);
}

/**
 * Get a random background image
 */
export function getRandomBackground(): string {
    return getRandomFile(ASSET_PATHS.backgrounds);
}

/**
 * Get a random audio track
 */
export function getRandomAudio(): string {
    return getRandomFile(ASSET_PATHS.audio);
}

/**
 * Get the primary font file
 */
export function getFontPath(): string {
    const fontFiles = getFilesInDirectory(ASSET_PATHS.fonts);
    const ttfFiles = fontFiles.filter((f) => f.endsWith('.ttf') || f.endsWith('.otf'));

    if (ttfFiles.length === 0) {
        throw new Error(`No font files (.ttf or .otf) found in ${ASSET_PATHS.fonts}`);
    }

    // Return the first font file, or one named 'primary' if it exists
    const primaryFont = ttfFiles.find((f) => f.toLowerCase().includes('primary'));
    const selectedFont = primaryFont ?? ttfFiles[0];

    if (!selectedFont) {
        throw new Error('Failed to select font file');
    }

    return path.join(PROJECT_ROOT, ASSET_PATHS.fonts, selectedFont);
}

/**
 * Text template configuration
 */
interface TextConfig {
    yearProgress?: {
        templates: string[];
        hashtags: string[];
    };
    horoscope?: {
        templates: string[];
        hashtags: string[];
    };
    [key: string]: { templates: string[]; hashtags: string[] } | undefined;
}

/**
 * Load text templates from configuration
 */
function loadTextConfig(): TextConfig {
    const textsPath = path.join(PROJECT_ROOT, ASSET_PATHS.texts);

    if (!fs.existsSync(textsPath)) {
        throw new Error(`Text configuration not found at ${textsPath}`);
    }

    const content = fs.readFileSync(textsPath, 'utf-8');
    return JSON.parse(content) as TextConfig;
}

/**
 * Get a random text template for a content type
 *
 * @param contentType - Content type (e.g., 'yearProgress', 'horoscope')
 * @param variables - Variables to substitute in the template
 * @returns Processed text with variables replaced
 */
export function getRandomText(
    contentType: string,
    variables: Record<string, string | number>
): string {
    const config = loadTextConfig();
    const typeConfig = config[contentType];

    if (!typeConfig || !typeConfig.templates || typeConfig.templates.length === 0) {
        throw new Error(`No templates found for content type: ${contentType}`);
    }

    const templates = typeConfig.templates;
    const randomIndex = Math.floor(Math.random() * templates.length);
    const template = templates[randomIndex];

    if (!template) {
        throw new Error(`Failed to select template for ${contentType}`);
    }

    // Replace variables in template
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    return result;
}

/**
 * Get hashtags for a content type
 */
export function getHashtags(contentType: string): string[] {
    const config = loadTextConfig();
    const typeConfig = config[contentType];

    return typeConfig?.hashtags ?? [];
}

/**
 * Validate that all required assets exist
 */
export function validateAssets(): AssetValidationResult {
    const errors: string[] = [];

    // Count assets
    const backgrounds = getFilesInDirectory(ASSET_PATHS.backgrounds).filter(
        (f) => /\.(jpg|jpeg|png|webp)$/i.test(f)
    );
    const audio = getFilesInDirectory(ASSET_PATHS.audio).filter(
        (f) => /\.(mp3|wav|aac|m4a)$/i.test(f)
    );
    const fonts = getFilesInDirectory(ASSET_PATHS.fonts).filter(
        (f) => /\.(ttf|otf)$/i.test(f)
    );

    // Check backgrounds
    if (backgrounds.length < ASSET_REQUIREMENTS.backgrounds) {
        errors.push(
            `Need at least ${ASSET_REQUIREMENTS.backgrounds} background image(s), found ${backgrounds.length} in ${ASSET_PATHS.backgrounds}`
        );
    }

    // Check audio
    if (audio.length < ASSET_REQUIREMENTS.audio) {
        errors.push(
            `Need at least ${ASSET_REQUIREMENTS.audio} audio file(s), found ${audio.length} in ${ASSET_PATHS.audio}`
        );
    }

    // Check fonts
    if (fonts.length < ASSET_REQUIREMENTS.fonts) {
        errors.push(
            `Need at least ${ASSET_REQUIREMENTS.fonts} font file(s), found ${fonts.length} in ${ASSET_PATHS.fonts}`
        );
    }

    // Check texts.json
    const textsPath = path.join(PROJECT_ROOT, ASSET_PATHS.texts);
    if (!fs.existsSync(textsPath)) {
        errors.push(`Text configuration not found at ${ASSET_PATHS.texts}`);
    }

    return {
        valid: errors.length === 0,
        errors,
        assets: {
            backgrounds: backgrounds.length,
            audio: audio.length,
            fonts: fonts.length,
        },
    };
}

/**
 * Get all assets of a specific type
 */
export function getAssets(type: 'background' | 'audio' | 'font'): AssetInfo[] {
    const pathMap: Record<string, string> = {
        background: ASSET_PATHS.backgrounds,
        audio: ASSET_PATHS.audio,
        font: ASSET_PATHS.fonts,
    };

    const assetPath = pathMap[type];
    if (!assetPath) {
        return [];
    }

    const files = getFilesInDirectory(assetPath);

    return files.map((name) => ({
        path: path.join(PROJECT_ROOT, assetPath, name),
        name,
        type,
    }));
}
