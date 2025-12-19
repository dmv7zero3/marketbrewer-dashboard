import { useCallback } from "react";

interface ApiErrorOptions {
  defaultMessage?: string;
  duration?: number;
  showToast?: boolean;
}

/**
 * Hook for consistent API error handling across the dashboard.
 *
 * Usage:
 * const { handleError } = useApiError();
 *
 * try {
 *   await someApiCall();
 * } catch (e) {
 *   handleError(e, { defaultMessage: "Failed to save" });
 * }
 */
export function useApiError() {
  // Note: Integrate with useToast when available
  // const { addToast } = useToast();

  const handleError = useCallback(
    (error: unknown, options: ApiErrorOptions = {}): string => {
      const {
        defaultMessage = "An error occurred",
        duration = 5000,
        showToast = true,
      } = options;

      let errorMessage: string;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      } else {
        errorMessage = defaultMessage;
      }

      // Handle specific error types
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (
        errorMessage.includes("403") ||
        errorMessage.includes("Forbidden")
      ) {
        errorMessage = "You don't have permission to perform this action.";
      } else if (
        errorMessage.includes("404") ||
        errorMessage.includes("Not Found")
      ) {
        errorMessage = "The requested resource was not found.";
      } else if (
        errorMessage.includes("500") ||
        errorMessage.includes("Internal Server Error")
      ) {
        errorMessage = "A server error occurred. Please try again later.";
      } else if (
        errorMessage.includes("Network") ||
        errorMessage.includes("fetch")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      if (showToast) {
        // When toast context is available:
        // addToast(errorMessage, "error", duration);
        console.error("API Error:", errorMessage);
      }

      return errorMessage;
    },
    []
  );

  return { handleError };
}
