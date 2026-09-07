/**
 * Expected, user-facing failure (bad input, taken email, missing
 * permission...). Route/action handlers catch this and show `message`
 * directly to the user. Anything that is NOT an AppError is an unexpected
 * bug — it gets logged with full detail server-side and the user sees a
 * generic message instead of a stack trace (see src/lib/handle-error.ts).
 */
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do this.") {
    super(message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "That couldn't be found.") {
    super(message, "NOT_FOUND");
  }
}
