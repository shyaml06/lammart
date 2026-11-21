import { HttpResponse } from './types';

export class AssertionError extends Error {
  public actual?: any;
  public expected?: any;

  constructor(message: string, actual?: any, expected?: any) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

/**
 * Format a value for clear inspection in assertion error messages.
 */
function formatValue(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return JSON.stringify(val);
  if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;
  if (val instanceof RegExp) return val.toString();
  if (val instanceof Date) return `Date(${val.toISOString()})`;
  if (val instanceof Error) return `${val.name}: ${val.message}`;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

/**
 * Deep equality check for primitives, arrays, and objects.
 */
function isDeepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isDeepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Simple diff generator for object/value comparison.
 */
function formatDiff(actual: any, expected: any): string {
  const actualStr = formatValue(actual);
  const expectedStr = formatValue(expected);
  return `\n  Expected:\n${expectedStr
    .split('\n')
    .map((l) => '    ' + l)
    .join('\n')}\n  Actual:\n${actualStr
    .split('\n')
    .map((l) => '    ' + l)
    .join('\n')}`;
}

export function assert(condition: any, message?: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message || 'Assertion failed: condition is falsy', condition, true);
  }
}

export function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (!Object.is(actual, expected)) {
    const msg = (message ? `${message}\n` : '') + `Expected values to be strictly equal:${formatDiff(actual, expected)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function assertDeepEquals<T>(actual: T, expected: T, message?: string): void {
  if (!isDeepEqual(actual, expected)) {
    const msg = (message ? `${message}\n` : '') + `Expected values to be deeply equal:${formatDiff(actual, expected)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function assertMatch(actual: string, pattern: RegExp | string, message?: string): void {
  assert(typeof actual === 'string', `assertMatch expects string actual, got ${typeof actual}`);
  const matches = typeof pattern === 'string' ? actual.includes(pattern) : pattern.test(actual);
  if (!matches) {
    const patternStr = pattern instanceof RegExp ? pattern.toString() : JSON.stringify(pattern);
    const msg =
      (message ? `${message}\n` : '') +
      `Expected string to match ${patternStr}, got: ${JSON.stringify(actual)}`;
    throw new AssertionError(msg, actual, pattern);
  }
}

export function assertArrayIncludes<T>(actual: T[], expectedItem: any, message?: string): void {
  assert(Array.isArray(actual), `assertArrayIncludes expects array, got ${typeof actual}`);
  const found = actual.some((item) => isDeepEqual(item, expectedItem) || Object.is(item, expectedItem));
  if (!found) {
    const msg =
      (message ? `${message}\n` : '') +
      `Expected array to include item:${formatDiff(actual, expectedItem)}`;
    throw new AssertionError(msg, actual, expectedItem);
  }
}

export function assertDefined<T>(val: T | null | undefined, message?: string): asserts val is T {
  if (val === null || val === undefined) {
    const msg = message || `Expected value to be defined and not null, but got ${String(val)}`;
    throw new AssertionError(msg, val, 'defined');
  }
}

export async function assertThrows(
  fn: () => any | Promise<any>,
  expectedError?: string | RegExp | ErrorConstructor,
  message?: string
): Promise<void> {
  let threw = false;
  let thrownError: any = undefined;

  try {
    await fn();
  } catch (err: any) {
    threw = true;
    thrownError = err;
  }

  if (!threw) {
    throw new AssertionError(message || 'Expected function to throw an error, but it returned normally');
  }

  if (expectedError) {
    if (typeof expectedError === 'function') {
      if (!(thrownError instanceof expectedError)) {
        throw new AssertionError(
          `Expected thrown error to be instance of ${expectedError.name}, but got ${thrownError?.constructor?.name || typeof thrownError}`
        );
      }
    } else if (typeof expectedError === 'string') {
      const errMessage = thrownError?.message || String(thrownError);
      if (!errMessage.includes(expectedError)) {
        throw new AssertionError(
          `Expected error message to include ${JSON.stringify(expectedError)}, got ${JSON.stringify(errMessage)}`
        );
      }
    } else if (expectedError instanceof RegExp) {
      const errMessage = thrownError?.message || String(thrownError);
      if (!expectedError.test(errMessage)) {
        throw new AssertionError(
          `Expected error message to match ${expectedError.toString()}, got ${JSON.stringify(errMessage)}`
        );
      }
    }
  }
}

export function assertStatus(response: HttpResponse, expectedStatus: number | number[], message?: string): void {
  const allowed = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  if (!allowed.includes(response.status)) {
    const details =
      response.data && typeof response.data === 'object'
        ? `\nResponse payload: ${JSON.stringify(response.data, null, 2)}`
        : response.rawText
        ? `\nResponse text: ${response.rawText.slice(0, 300)}`
        : '';
    const msg =
      (message ? `${message}\n` : '') +
      `Expected HTTP status ${allowed.join(' or ')}, but received ${response.status} (${response.statusText}).${details}`;
    throw new AssertionError(msg, response.status, expectedStatus);
  }
}

export function assertOk(response: HttpResponse, message?: string): void {
  if (!response.ok) {
    const details =
      response.data && typeof response.data === 'object'
        ? `\nResponse payload: ${JSON.stringify(response.data, null, 2)}`
        : response.rawText
        ? `\nResponse text: ${response.rawText.slice(0, 300)}`
        : '';
    const msg =
      (message ? `${message}\n` : '') +
      `Expected response to be OK (2xx), but received ${response.status} (${response.statusText}).${details}`;
    throw new AssertionError(msg, response.ok, true);
  }
}

export function assertErrorResponse(
  response: HttpResponse,
  expectedStatus: number,
  expectedCode?: string,
  message?: string
): void {
  assertStatus(response, expectedStatus, message);
  assert(
    response.data && typeof response.data === 'object',
    `Expected JSON error response body, got ${typeof response.data}`
  );
  if (expectedCode) {
    assertEquals(
      response.data.code,
      expectedCode,
      (message ? `${message}: ` : '') + `Expected error code to match "${expectedCode}"`
    );
  }
  assert(
    typeof response.data.message === 'string' && response.data.message.length > 0,
    'Expected error response to have a non-empty message property'
  );
}
