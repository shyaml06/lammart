import {
  CookieJarInterface,
  HttpClientInterface,
  HttpRequestOptions,
  HttpResponse,
} from './types';

export class CookieJar implements CookieJarInterface {
  private cookies: Map<string, string> = new Map();

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  set(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  delete(name: string): void {
    this.cookies.delete(name);
  }

  clear(): void {
    this.cookies.clear();
  }

  getAll(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [key, val] of this.cookies.entries()) {
      obj[key] = val;
    }
    return obj;
  }

  toHeaderString(): string {
    const pairs: string[] = [];
    for (const [key, val] of this.cookies.entries()) {
      pairs.push(`${key}=${val}`);
    }
    return pairs.join('; ');
  }

  parseSetCookie(headerValue: string | string[] | null | undefined): void {
    if (!headerValue) return;

    const cookieStrings: string[] = Array.isArray(headerValue)
      ? headerValue
      : typeof headerValue === 'string'
      ? headerValue.split(/,\s*(?=[A-Za-z0-9_%-]+=[^;]+)/)
      : [];

    for (const cookieStr of cookieStrings) {
      if (!cookieStr || typeof cookieStr !== 'string') continue;

      const parts = cookieStr.split(';').map((p) => p.trim());
      if (parts.length === 0) continue;

      const firstPart = parts[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx === -1) continue;

      const name = firstPart.slice(0, eqIdx).trim();
      const value = firstPart.slice(eqIdx + 1).trim();

      // Check for deletion directives
      const isExpired = parts.some((part) => {
        const lower = part.toLowerCase();
        return (
          lower === 'max-age=0' ||
          lower.startsWith('max-age=-') ||
          (lower.startsWith('expires=') && new Date(part.slice(8)).getTime() <= Date.now())
        );
      });

      if (isExpired || value === '') {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }
}

export class HttpClient implements HttpClientInterface {
  public baseUrl: string;
  public cookies: CookieJarInterface;

  constructor(baseUrl: string, cookies?: CookieJarInterface) {
    // Normalize baseUrl: remove trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.cookies = cookies || new CookieJar();
  }

  public setAuthToken(token: string): void {
    this.cookies.set('auth_token', token);
  }

  public getAuthToken(): string | undefined {
    return this.cookies.get('auth_token');
  }

  public getCookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  public clearCookies(): void {
    this.cookies.clear();
  }

  private buildUrl(path: string, params?: Record<string, any>): string {
    let fullUrl = path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            for (const v of value) {
              searchParams.append(key, String(v));
            }
          } else {
            searchParams.set(key, String(value));
          }
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
      }
    }

    return fullUrl;
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(path, options.params);
    const headers = new Headers();

    // Default Accept header
    headers.set('Accept', 'application/json, text/plain, */*');

    // Populate custom headers
    if (options.headers) {
      for (const [key, val] of Object.entries(options.headers)) {
        headers.set(key, val);
      }
    }

    // Handle token option override
    if (options.token) {
      this.cookies.set('auth_token', options.token);
    }

    // Set Cookie header from jar
    const cookieHeader = this.cookies.toHeaderString();
    if (cookieHeader && !headers.has('Cookie')) {
      headers.set('Cookie', cookieHeader);
    }

    // Also send Authorization header if auth_token exists and not explicitly set
    const authToken = this.cookies.get('auth_token');
    if (authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }

    let payloadBody: any = undefined;
    if (body !== undefined && body !== null) {
      if (
        typeof body === 'string' ||
        body instanceof FormData ||
        body instanceof Blob ||
        body instanceof URLSearchParams ||
        body instanceof ArrayBuffer
      ) {
        payloadBody = body;
      } else {
        // Object -> serialize to JSON
        payloadBody = JSON.stringify(body);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      }
    }

    // AbortController for timeout
    const timeoutMs = options.timeoutMs ?? 15000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: payloadBody,
        signal: controller.signal,
        redirect: 'manual',
      });

      // Extract set-cookie headers
      // Node 18+ provides headers.getSetCookie() on Headers object
      if (typeof (response.headers as any).getSetCookie === 'function') {
        const rawCookies = (response.headers as any).getSetCookie();
        this.cookies.parseSetCookie(rawCookies);
      } else {
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          this.cookies.parseSetCookie(setCookie);
        }
      }

      // Read response body as text
      const rawText = await response.text();
      let data: any = null;

      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data,
        rawText,
        ok: response.ok,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`HTTP request timed out after ${timeoutMs}ms: [${method}] ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async get<T = any>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T = any>(path: string, body?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  async put<T = any>(path: string, body?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, body, options);
  }

  async patch<T = any>(path: string, body?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', path, body, options);
  }

  async delete<T = any>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  async uploadCsv<T = any>(
    path: string,
    csvContent: string,
    options?: HttpRequestOptions & { filename?: string; fieldName?: string; dryRun?: boolean }
  ): Promise<HttpResponse<T>> {
    const fieldName = options?.fieldName || 'file';
    const filename = options?.filename || 'import.csv';

    const formData = new FormData();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append(fieldName, blob, filename);

    const params = { ...(options?.params || {}) };
    if (options?.dryRun !== undefined) {
      params.dryRun = String(options.dryRun);
    }

    return this.request<T>('POST', path, formData, {
      ...options,
      params,
    });
  }
}

export function createHttpClient(baseUrl: string, cookies?: CookieJarInterface): HttpClient {
  return new HttpClient(baseUrl, cookies);
}
