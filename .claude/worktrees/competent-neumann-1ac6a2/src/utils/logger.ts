/**
 * Logger - Simple logging utility for SoundScout
 *
 * Provides consistent formatting and can be extended for:
 * - Remote logging services
 * - Log levels based on environment
 * - Structured logging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Reserved for future logging service integration
// interface LogEntry {
//   level: LogLevel;
//   message: string;
//   timestamp: string;
//   data?: unknown;
// }

const isDevelopment = import.meta.env.DEV;

function formatMessage(level: LogLevel, message: string): string {
  return `[SoundScout] [${level.toUpperCase()}] ${message}`;
}

// Helper to create structured log entries for future logging service
// function createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
//   return {
//     level,
//     message,
//     timestamp: new Date().toISOString(),
//     data,
//   };
// }

export const logger = {
  /**
   * Log informational messages
   */
  info(message: string, data?: unknown): void {
    console.log(formatMessage('info', message), data ?? '');

    // In production, could send to analytics service
    // Example: sendToLoggingService(createLogEntry('info', message, data));
  },

  /**
   * Log warning messages
   */
  warn(message: string, data?: unknown): void {
    console.warn(formatMessage('warn', message), data ?? '');
  },

  /**
   * Log error messages
   */
  error(message: string, data?: unknown): void {
    console.error(formatMessage('error', message), data ?? '');

    // In production, could send to error tracking service
    // Example: sendToErrorTracking(createLogEntry('error', message, data));
  },

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, data?: unknown): void {
    if (isDevelopment) {
      console.debug(formatMessage('debug', message), data ?? '');
    }
  },

  /**
   * Log audio-related events
   */
  audio(action: string, details?: unknown): void {
    if (isDevelopment) {
      console.log(
        `[SoundScout] [AUDIO] ${action}`,
        details ?? ''
      );
    }
  },

  /**
   * Log performance metrics
   */
  perf(label: string, durationMs: number): void {
    if (isDevelopment) {
      console.log(
        `[SoundScout] [PERF] ${label}: ${durationMs.toFixed(2)}ms`
      );
    }
  },
};
