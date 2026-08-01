export class AuthConfigurationError extends Error {
  constructor(message = "Authentication is not configured for this environment.") {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

export class AuthAccessDeniedError extends Error {
  constructor(message = "Access unavailable for this session.") {
    super(message);
    this.name = "AuthAccessDeniedError";
  }
}
