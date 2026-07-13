/**
 * FeatureErrorBoundary - Lighter error boundary for feature-level isolation
 *
 * Unlike the root ErrorBoundary (full-screen crash UI), this shows a compact
 * inline fallback within the page layout. Other features keep working.
 *
 * Usage:
 *   <FeatureErrorBoundary featureName="Studio">
 *     <StudioView />
 *   </FeatureErrorBoundary>
 */

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import i18n from '../../i18n';
import { logger } from '../../utils/logger';

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
  onRetry?: () => void;
}

interface FeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<FeatureErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error(`FeatureErrorBoundary [${this.props.featureName}] caught error`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-warning-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning-700" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-text-main mb-2">
              {i18n.t('error.featureError', { feature: this.props.featureName })}
            </h3>
            <p className="text-text-muted text-sm mb-4">
              {i18n.t('error.featureDescription')}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {i18n.t('error.retryButton')}
            </button>

            {/* Dev-only error details */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600">
                  {i18n.t('error.technicalDetails')}
                </summary>
                <pre className="mt-1 p-2 bg-neutral-100 rounded-lg text-[10px] text-error-600 overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
