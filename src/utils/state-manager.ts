import { Octokit } from '@octokit/rest';
import type { StateData } from '../types/index.js';
import { logger } from './logger.js';

const STATE_FILE = 'last_posted.json';

/**
 * Create an Octokit instance
 */
function createOctokit(token: string): Octokit {
    return new Octokit({ auth: token });
}

/**
 * Get the last posted state from GitHub Gist
 *
 * @param gistId - GitHub Gist ID
 * @param token - GitHub personal access token
 * @returns Last posted state or null if not found
 */
export async function getLastPosted(gistId: string, token: string): Promise<StateData | null> {
    try {
        const octokit = createOctokit(token);
        const { data } = await octokit.gists.get({ gist_id: gistId });

        const stateFile = data.files?.[STATE_FILE];
        if (!stateFile?.content) {
            logger.info('No previous state found in Gist');
            return null;
        }

        const state = JSON.parse(stateFile.content) as StateData;
        logger.info('Retrieved last posted state', state as Record<string, unknown>);
        return state;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to get last posted state', { error: message });
        return null;
    }
}

/**
 * Update the last posted state in GitHub Gist
 *
 * @param gistId - GitHub Gist ID
 * @param token - GitHub personal access token
 * @param state - New state data
 * @returns Updated state
 */
export async function updateLastPosted(
    gistId: string,
    token: string,
    state: StateData
): Promise<StateData> {
    try {
        const octokit = createOctokit(token);
        const newState: StateData = {
            ...state,
            lastDate: new Date().toISOString(),
        };

        await octokit.gists.update({
            gist_id: gistId,
            files: {
                [STATE_FILE]: {
                    content: JSON.stringify(newState, null, 2),
                },
            },
        });

        logger.info('Updated last posted state', newState as Record<string, unknown>);
        return newState;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to update last posted state', { error: message });
        throw error;
    }
}

/**
 * Check if new content should be posted
 *
 * @param gistId - GitHub Gist ID
 * @param token - GitHub personal access token
 * @param currentValue - Current content identifier (e.g., percentage)
 * @param contentType - Content type being checked
 * @param currentYear - Current year (optional, for year-based content)
 * @returns Whether new content should be posted
 */
export async function shouldPost(
    gistId: string,
    token: string,
    currentValue: string | number,
    contentType: string,
    currentYear?: number
): Promise<boolean> {
    const lastState = await getLastPosted(gistId, token);

    // No previous state - should post
    if (!lastState) {
        logger.info('No previous state - should post', { currentValue, contentType });
        return true;
    }

    // Different content type - should post
    if (lastState.contentType !== contentType) {
        logger.info('Different content type - should post', {
            current: contentType,
            last: lastState.contentType,
        });
        return true;
    }

    // For year-based content, check if year changed
    if (currentYear !== undefined && lastState.year !== currentYear) {
        logger.info('New year detected - should post', {
            currentYear,
            lastYear: lastState.year,
        });
        return true;
    }

    // Check if value changed
    const shouldUpdate = lastState.lastValue !== currentValue;

    logger.info('Checked if should post', {
        currentValue,
        lastValue: lastState.lastValue,
        shouldPost: shouldUpdate,
    });

    return shouldUpdate;
}

/**
 * Create initial state for a new content type
 */
export function createInitialState(
    contentType: string,
    value: string | number,
    year?: number
): StateData {
    return {
        lastValue: value,
        lastDate: new Date().toISOString(),
        contentType,
        ...(year !== undefined && { year }),
    };
}
