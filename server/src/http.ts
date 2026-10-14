/** An error with an HTTP status and a stable machine-readable code the client can switch on */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} not found`)
