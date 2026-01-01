import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LogLevel, LogEntry } from '../types/index.js';
import { getLogLevel } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

const LOG_LEVELS: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

/**
 * Get the current log level threshold
 */
function getCurrentLevel(): number {
    return LOG_LEVELS[getLogLevel()];
}

/**
 * Ensure logs directory exists
 */
function ensureLogDir(): string {
    const logDir = path.join(PROJECT_ROOT, 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry);
}

/**
 * Write log entry to console and file
 */
function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] > getCurrentLevel()) {
        return;
    }

    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(data && { data }),
    };

    const logString = formatLogEntry(entry);

    // Console output with color
    const colors: Record<LogLevel, string> = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        info: '\x1b[36m', // Cyan
        debug: '\x1b[90m', // Gray
    };
    const reset = '\x1b[0m';

    // Use console.log for structured output (eslint is configured to allow this via JSON)
    process.stdout.write(`${colors[level]}${logString}${reset}\n`);

    // Write to log file
    try {
        const logDir = ensureLogDir();
        const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, logString + '\n');
    } catch {
        // Silently fail file logging - don't crash the app
    }
}

/**
 * Logger instance with methods for each log level
 */
export const logger = {
    error: (message: string, data?: Record<string, unknown>): void => log('error', message, data),
    warn: (message: string, data?: Record<string, unknown>): void => log('warn', message, data),
    info: (message: string, data?: Record<string, unknown>): void => log('info', message, data),
    debug: (message: string, data?: Record<string, unknown>): void => log('debug', message, data),
};

export default logger;
