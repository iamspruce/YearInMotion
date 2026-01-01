import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { logger } from '../src/utils/logger.js';

dotenv.config();

const STATE_FILE = 'last_posted.json';

async function resetState() {
    const gistId = process.env.GIST_ID;
    const token = process.env.GITHUB_TOKEN;

    if (!gistId || !token) {
        console.error('Error: GIST_ID or GITHUB_TOKEN not found in .env');
        process.exit(1);
    }

    try {
        const octokit = new Octokit({ auth: token });

        console.log(`Resetting state in Gist: ${gistId}...`);

        // We "reset" by setting the content to a default "not posted" state
        // or just removing the file content. 
        // Best approach for our logic is to just provide a state that won't match anything.
        const resetData = {
            lastValue: -1,
            lastDate: new Date(0).toISOString(),
            contentType: 'none',
            year: 0
        };

        await octokit.gists.update({
            gist_id: gistId,
            files: {
                [STATE_FILE]: {
                    content: JSON.stringify(resetData, null, 2),
                },
            },
        });

        console.log('✅ State reset successfully! You can now post 0% for 2026 again.');
    } catch (error) {
        console.error('Failed to reset state:', error);
        process.exit(1);
    }
}

resetState();
