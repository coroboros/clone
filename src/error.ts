export type CloneErrorCode = 'UNSUPPORTED_TYPE';

export class CloneError extends Error {
  readonly code: CloneErrorCode;

  constructor(code: CloneErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CloneError';
    this.code = code;
  }
}
