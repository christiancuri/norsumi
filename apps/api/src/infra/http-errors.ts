export class HTTPError extends Error {
  public statusCode: number;
  /** Seconds, sent as `Retry-After`. */
  public retryAfter?: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class HTTP400Error extends HTTPError {
  constructor(message = "Bad Request") {
    super(400, message);
  }
}

export class HTTP401Error extends HTTPError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

export class HTTP403Error extends HTTPError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

export class HTTP404Error extends HTTPError {
  constructor(message = "Not Found") {
    super(404, message);
  }
}

export class HTTP409Error extends HTTPError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}

export class HTTP413Error extends HTTPError {
  constructor(message = "Payload Too Large") {
    super(413, message);
  }
}

export class HTTP415Error extends HTTPError {
  constructor(message = "Unsupported Media Type") {
    super(415, message);
  }
}
