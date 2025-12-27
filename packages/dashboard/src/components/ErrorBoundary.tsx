import React, { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch rendering errors and prevent app crashes
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Dashboard Error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-dark-800">
          <div className="w-full max-w-md p-8 bg-dark-800 rounded-lg shadow-lg">
            <h1 className="mb-4 text-2xl font-bold text-metro-red">
              Oops! Something went wrong
            </h1>
            <p className="mb-4 text-dark-400">
              We encountered an unexpected error. Please try refreshing the
              page.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="p-3 mb-4 text-xs text-dark-400 border border-dark-700 rounded bg-dark-900">
                <summary className="font-semibold cursor-pointer">
                  Error Details
                </summary>
                <pre className="mt-2 overflow-auto break-words whitespace-pre-wrap max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 text-white transition bg-metro-orange rounded hover:bg-metro-orange-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
