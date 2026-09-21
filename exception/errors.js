export class ApiException extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiException";
  }
}

export class ValidationException extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationException";
  }
}
