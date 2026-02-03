export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

