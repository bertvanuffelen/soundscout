/**
 * ErrorBoundary - Catches JavaScript errors in child components
 *
 * Shows a fallback UI instead of crashing the app.
 * Includes option to send error report via FeedbackModal.
 */

import { Component, type ReactNode } from 'react';
import i18n from '../../i18n';
import { logger } from '../../utils/logger';
import { FeedbackModal } from '../feedback';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  showFeedback: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
      showFeedback: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Store component stack for feedback
    this.setState({ componentStack: errorInfo.componentStack || null });

    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      componentStack: null,
      showFeedback: false,
    });
  };

  handleOpenFeedback = (): void => {
    this.setState({ showFeedback: true });
  };

  handleCloseFeedback = (): void => {
    this.setState({ showFeedback: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-3xl">😵</span>
            </div>
            <h2 className="text-xl font-bold text-red-700 mb-2">
              {i18n.t('error.title')}
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              {i18n.t('error.description')}
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold rounded-xl transition-colors cursor-pointer"
              >
                {i18n.t('error.retryButton')}
              </button>
              <button
                onClick={this.handleOpenFeedback}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                {i18n.t('error.sendReportButton')}
              </button>
            </div>

            {/* Dev-only error details */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  {i18n.t('error.technicalDetails')}
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-red-600 overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>

          {/* Feedback Modal */}
          <FeedbackModal
            isOpen={this.state.showFeedback}
            onClose={this.handleCloseFeedback}
            mode="error"
            errorData={{
              message: this.state.error?.message || 'Unknown error',
              stack: this.state.error?.stack,
              componentStack: this.state.componentStack || undefined,
            }}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
