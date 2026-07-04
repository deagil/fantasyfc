export function toQueryErrorMessage(
  error: unknown,
  message: string
): string | null {
  return error ? message : null
}
