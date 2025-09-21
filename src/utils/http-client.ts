/**
 * Shared HTTP client utility for making requests to the SPF MCP server
 */

export interface HttpClientOptions {
  baseUrl: string;
  authToken?: string;
  defaultHeaders?: Record<string, string>;
}

export class HttpClient {
  private baseUrl: string;
  private authToken?: string;
  private defaultHeaders: Record<string, string>;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl;
    this.authToken = options.authToken;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders,
    };
  }

  async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { response, data };
  }

  // Convenience methods for common operations
  async post(endpoint: string, body: any, options: RequestInit = {}) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  }

  async get(endpoint: string, options: RequestInit = {}) {
    return this.makeRequest(endpoint, {
      method: 'GET',
      ...options,
    });
  }
}

// Factory function for creating clients
export function createHttpClient(
  baseUrl: string,
  authToken?: string,
): HttpClient {
  return new HttpClient({ baseUrl, authToken });
}
