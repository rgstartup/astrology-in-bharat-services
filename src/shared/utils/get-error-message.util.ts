export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error !== 'object' || error === null) return String(error);

  try {
    return JSON.stringify(error);
  } catch {
    return 'An unknown error occurred';
  }
}

export function getError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(getErrorMessage(error));
}
