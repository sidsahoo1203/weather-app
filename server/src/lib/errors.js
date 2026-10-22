export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** A third-party service failed or timed out. Surfaced to clients as 502. */
export class UpstreamError extends HttpError {
  constructor(message, { service, upstreamStatus } = {}) {
    super(502, message);
    this.name = 'UpstreamError';
    this.service = service;
    this.upstreamStatus = upstreamStatus;
  }
}
