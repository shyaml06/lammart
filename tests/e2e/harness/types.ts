/**
 * Core type definitions for the Lammart E2E testing framework.
 */

export type Tier = 1 | 2 | 3 | 4;

export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Headers;
  data: T;
  rawText: string;
  ok: boolean;
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  token?: string;
  body?: any;
}

export interface CookieJarInterface {
  get(name: string): string | undefined;
  set(name: string, value: string): void;
  delete(name: string): void;
  clear(): void;
  getAll(): Record<string, string>;
  toHeaderString(): string;
  parseSetCookie(headerValue: string | string[] | null): void;
}

export interface HttpClientInterface {
  baseUrl: string;
  cookies: CookieJarInterface;
  get<T = any>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  post<T = any>(path: string, body?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  put<T = any>(path: string, body?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  patch<T = any>(path: string, body?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  delete<T = any>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  uploadCsv<T = any>(
    path: string,
    csvContent: string,
    options?: HttpRequestOptions & { filename?: string; fieldName?: string; dryRun?: boolean }
  ): Promise<HttpResponse<T>>;
  clearCookies(): void;
  setAuthToken(token: string): void;
  getAuthToken(): string | undefined;
  getCookie(name: string): string | undefined;
}

export class SkipException extends Error {
  readonly isSkip = true;
  readonly reason?: string;

  constructor(reason?: string) {
    super(reason ? `Test skipped: ${reason}` : 'Test skipped');
    this.name = 'SkipException';
    this.reason = reason;
  }
}

export interface TestContext {
  client: HttpClientInterface;
  baseUrl: string;
  isServerUp: boolean;
  tier: Tier;
  suiteName: string;
  testName: string;
  skip: (reason?: string) => never;
  log: (msg: string) => void;
}

export type TestFunction = (ctx: TestContext) => Promise<void> | void;

export interface TestCase {
  id?: string;
  name: string;
  fn: TestFunction;
  skip?: boolean;
  only?: boolean;
  timeoutMs?: number;
}

export interface TestSuite {
  name: string;
  tier: Tier;
  description?: string;
  tests: TestCase[];
  beforeAll?: (ctx: { baseUrl: string; client: HttpClientInterface }) => Promise<void> | void;
  afterAll?: (ctx: { baseUrl: string; client: HttpClientInterface }) => Promise<void> | void;
  beforeEach?: (ctx: TestContext) => Promise<void> | void;
  afterEach?: (ctx: TestContext) => Promise<void> | void;
}

export interface TestResult {
  name: string;
  suiteName: string;
  tier: Tier;
  status: 'passed' | 'failed' | 'skipped';
  skipReason?: string;
  durationMs: number;
  error?: Error | { message: string; stack?: string };
  assertionsCount?: number;
}

export interface RunnerOptions {
  tier?: Tier;
  filePattern?: string;
  baseUrl: string;
  verbose: boolean;
  isServerUp?: boolean;
}

export interface TierStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface RunnerSummary {
  totalSuites: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  tierBreakdown: Record<Tier, TierStats>;
}
