import { describe, expect, it } from 'vitest';
import { CloneError } from '../src/index.js';

describe('CloneError', () => {
  it('extends Error', () => {
    const err = new CloneError('UNSUPPORTED_TYPE', 'oops');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CloneError);
  });

  it('sets name to CloneError', () => {
    const err = new CloneError('UNSUPPORTED_TYPE', 'oops');
    expect(err.name).toBe('CloneError');
  });

  it('exposes the code as a readonly field', () => {
    const err = new CloneError('UNSUPPORTED_TYPE', 'oops');
    expect(err.code).toBe('UNSUPPORTED_TYPE');
  });

  it('preserves the message', () => {
    const err = new CloneError('UNSUPPORTED_TYPE', 'cannot clone function "foo"');
    expect(err.message).toBe('cannot clone function "foo"');
  });

  it('supports Error.cause', () => {
    const root = new TypeError('inner');
    const err = new CloneError('UNSUPPORTED_TYPE', 'wrapped', { cause: root });
    expect(err.cause).toBe(root);
  });

  it('produces a string stack', () => {
    const err = new CloneError('UNSUPPORTED_TYPE', 'oops');
    expect(typeof err.stack).toBe('string');
  });
});
