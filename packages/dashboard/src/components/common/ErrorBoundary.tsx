/**
 * Error Boundary Component
 *
 * Catches React errors in child components and displays fallback UI
 * instead of crashing the entire dashboard.
 *
 * Usage:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React, { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, send to monitoring service (e.g., Sentry)
    if (process.env.NODE_ENV === "production") {
      // TODO: Add error reporting service integration
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
          <div className="max-w-md w-full bg-dark-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-metro-red-950 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-metro-red"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-dark-100 text-center mb-2">
              Something Went Wrong
            </h2>

            <p className="text-dark-400 text-center mb-6">
              We encountered an unexpected error. Please try refreshing the
              page.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-metro-red-950 border border-red-200 rounded text-sm">
                <p className="font-semibold text-red-800 mb-2">
                  Error Details:
                </p>
                <pre className="text-metro-red-600 whitespace-pre-wrap overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-metro-orange text-white rounded-md hover:bg-metro-orange-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="flex-1 px-4 py-2 border border-dark-600 text-dark-200 rounded-md hover:bg-dark-900 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Custom Error Fallback Component for Dashboard Sections
 */
export const DashboardErrorFallback: React.FC<{
  error?: Error;
  onReset?: () => void;
}> = ({ error, onReset }) => (
  <div className="bg-dark-800 rounded-lg shadow p-6 text-center">
    <div className="w-16 h-16 mx-auto bg-metro-red-950 rounded-full flex items-center justify-center mb-4">
      <svg
        className="w-8 h-8 text-metro-red"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>

    <h3 className="text-lg font-semibold text-dark-100 mb-2">
      Unable to Load Section
    </h3>

    <p className="text-dark-400 mb-4">
      This section encountered an error. Please refresh or try again later.
    </p>

    {process.env.NODE_ENV === "development" && error && (
      <details className="mb-4 text-left">
        <summary className="cursor-pointer text-sm font-medium text-dark-200 mb-2">
          Error Details
        </summary>
        <pre className="text-xs text-metro-red bg-metro-red-950 p-3 rounded overflow-auto">
          {error.toString()}
          {error.stack && `\n\n${error.stack}`}
        </pre>
      </details>
    )}

    {onReset && (
      <button
        onClick={onReset}
        className="px-4 py-2 bg-metro-orange text-white rounded-md hover:bg-metro-orange-600 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);
