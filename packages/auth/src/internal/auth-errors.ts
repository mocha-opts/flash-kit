export class UnauthenticatedError extends Error {
  public constructor() {
    super('Authentication is required.');
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends Error {
  public constructor() {
    super('Administrator access is required.');
    this.name = 'ForbiddenError';
  }
}
