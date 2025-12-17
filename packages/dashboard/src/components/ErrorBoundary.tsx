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
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
            <h1 className="mb-4 text-2xl font-bold text-red-600">
              Oops! Something went wrong
            </h1>
            <p className="mb-4 text-gray-600">
              We encountered an unexpected error. Please try refreshing the
              page.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="p-3 mb-4 text-xs text-gray-500 border border-gray-200 rounded bg-gray-50">
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
              className="w-full px-4 py-2 text-white transition bg-blue-600 rounded hover:bg-blue-700"
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
