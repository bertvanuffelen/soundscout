/**
 * FeedbackService - Handles sending feedback via EmailJS
 *
 * Features:
 * - Collects browser/device context automatically
 * - Validates input before sending
 * - Rate limiting to prevent spam
 * - Works with both error reports and general feedback
 */

import emailjs from '@emailjs/browser';
import { logger } from '../../utils/logger';

// EmailJS configuration from environment
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Rate limiting: 60 seconds between submissions
const RATE_LIMIT_MS = 60000;
let lastSubmitTime = 0;

export type FeedbackCategory = 'bug' | 'confusion' | 'other';

export interface ErrorData {
  message: string;
  stack?: string;
  componentStack?: string;
}

export interface FeedbackInput {
  mode: 'error' | 'feedback';
  category?: FeedbackCategory;
  message: string;
  userEmail?: string;
  errorData?: ErrorData;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Collects browser and device context
 */
function collectContext() {
  return {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
  };
}

/**
 * Validates feedback input
 */
export function validateFeedback(input: FeedbackInput): ValidationResult {
  const errors: string[] = [];

  // Category required for feedback mode
  if (input.mode === 'feedback' && !input.category) {
    errors.push('categoryRequired');
  }

  // Message required and minimum length
  if (!input.message || input.message.trim().length === 0) {
    errors.push('messageRequired');
  } else if (input.message.trim().length < 10) {
    errors.push('messageTooShort');
  }

  // Email format validation (if provided)
  if (input.userEmail && input.userEmail.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.userEmail)) {
      errors.push('emailInvalid');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if rate limit allows submission
 * Returns seconds remaining if rate limited, 0 if allowed
 */
export function checkRateLimit(): number {
  const now = Date.now();
  const timeSinceLastSubmit = now - lastSubmitTime;

  if (timeSinceLastSubmit < RATE_LIMIT_MS) {
    return Math.ceil((RATE_LIMIT_MS - timeSinceLastSubmit) / 1000);
  }

  return 0;
}

/**
 * Formats error data for email
 */
function formatErrorInfo(errorData?: ErrorData): string {
  if (!errorData) return '';

  let info = `ERROR: ${errorData.message}`;

  if (errorData.stack) {
    // Truncate stack trace to prevent email issues
    const truncatedStack = errorData.stack.slice(0, 1500);
    info += `\n\nSTACK TRACE:\n${truncatedStack}`;
    if (errorData.stack.length > 1500) {
      info += '\n... (truncated)';
    }
  }

  if (errorData.componentStack) {
    const truncatedComponentStack = errorData.componentStack.slice(0, 500);
    info += `\n\nCOMPONENT STACK:\n${truncatedComponentStack}`;
    if (errorData.componentStack.length > 500) {
      info += '\n... (truncated)';
    }
  }

  return info;
}

/**
 * Sends feedback via EmailJS
 */
export async function sendFeedback(input: FeedbackInput): Promise<SendResult> {
  // Check rate limit
  const secondsRemaining = checkRateLimit();
  if (secondsRemaining > 0) {
    return {
      success: false,
      error: `rateLimited:${secondsRemaining}`,
    };
  }

  // Validate input
  const validation = validateFeedback(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors[0],
    };
  }

  // Check EmailJS configuration
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    logger.error('EmailJS not configured', { SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY: PUBLIC_KEY ? '[set]' : '[missing]' });
    return {
      success: false,
      error: 'notConfigured',
    };
  }

  // Collect context
  const context = collectContext();

  // Build message with error info if present
  let fullMessage = input.message;
  if (input.mode === 'error' && input.errorData) {
    const errorInfo = formatErrorInfo(input.errorData);
    fullMessage = `${input.message}\n\n---\n${errorInfo}`;
  }

  // Prepare email template parameters (matching SoundGrid template)
  const templateParams = {
    app_name: 'SoundScout',
    category: input.mode === 'error' ? 'Error Report' : (input.category || 'other'),
    message: fullMessage,
    user_email: input.userEmail || 'Not provided',
    url: context.url,
    timestamp: context.timestamp,
    userAgent: context.userAgent,
    screenSize: context.screenSize,
  };

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

    // Update rate limit timestamp
    lastSubmitTime = Date.now();

    logger.info('Feedback sent successfully', { mode: input.mode, category: input.category });

    return { success: true };
  } catch (error) {
    logger.error('Failed to send feedback', { error });

    return {
      success: false,
      error: 'sendFailed',
    };
  }
}

/**
 * Checks if EmailJS is configured
 */
export function isEmailJSConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}
