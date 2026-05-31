export function formatSupabaseError(error: unknown): string {
  console.error("Supabase error:", error);

  if (error && typeof error === "object") {
    const postgrestError = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const parts = [
      postgrestError.message,
      postgrestError.details,
      postgrestError.hint,
      postgrestError.code ? `code: ${postgrestError.code}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Supabase error";
}
