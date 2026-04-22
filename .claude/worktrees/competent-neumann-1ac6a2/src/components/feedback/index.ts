/**
 * Feedback components for error reporting and user feedback
 */

export { FeedbackModal } from './FeedbackModal';
export {
  sendFeedback,
  validateFeedback,
  checkRateLimit,
  isEmailJSConfigured,
  type FeedbackCategory,
  type ErrorData,
  type FeedbackInput,
} from './FeedbackService';
