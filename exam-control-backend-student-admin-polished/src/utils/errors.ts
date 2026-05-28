export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFound(message = "Resource not found") {
  return new AppError(message, 404);
}

export function forbidden(message = "Forbidden") {
  return new AppError(message, 403);
}

export function badRequest(message = "Bad request") {
  return new AppError(message, 400);
}
