export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let onUnauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorizedHandler = handler;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Imprescindible para cookies HttpOnly SameSite=Lax
  });

  if (response.status === 401) {
    if (onUnauthorizedHandler && !url.includes('/api/auth/unlock') && !url.includes('/api/auth/questions')) {
      onUnauthorizedHandler();
    }
  }

  // Manejo de respuesta de archivo para descarga (ej. /api/backup/export)
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, errorText || 'Error en la petición');
    }
    return (await response.text()) as unknown as T;
  }

  const json: any = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = json?.error || json?.message || `Error HTTP ${response.status}`;
    throw new ApiError(response.status, errorMessage, json);
  }

  return json as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: any) =>
    request<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
