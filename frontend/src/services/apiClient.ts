const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const errorBody = body as {
    message?: unknown;
    detail?: unknown;
    code?: unknown;
  };
  if (typeof errorBody.message === 'string') return errorBody.message;
  if (typeof errorBody.detail === 'string') return errorBody.detail;
  if (errorBody.detail && typeof errorBody.detail === 'object') {
    const detail = errorBody.detail as { message?: unknown; code?: unknown };
    if (typeof detail.message === 'string') return detail.message;
    if (typeof detail.code === 'string') return detail.code;
  }
  if (typeof errorBody.code === 'string') return errorBody.code;
  return fallback;
}

export async function apiGet<T>(path: string, params: Record<string, string | number> = {}, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });

  if (!response.ok) {
    let message = `API 요청에 실패했습니다. (${response.status})`;
    try {
      const body = await response.json() as unknown;
      message = getErrorMessage(body, message);
    } catch {
      // JSON이 아닌 오류 응답에는 기본 메시지를 사용합니다.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `API 요청에 실패했습니다. (${response.status})`;
    try {
      const body = await response.json() as unknown;
      message = getErrorMessage(body, message);
    } catch {
      // JSON이 아닌 오류 응답에는 기본 메시지를 사용합니다.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export async function apiPostJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<TResponse>(response);
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST', headers: { Accept: 'application/json' }, body: formData,
  });
  return parseResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    let message = `API 요청에 실패했습니다. (${response.status})`;
    try {
      const body = await response.json() as unknown;
      message = getErrorMessage(body, message);
    } catch {
      // 본문이 없는 오류 응답에는 기본 메시지를 사용합니다.
    }
    throw new ApiError(response.status, message);
  }
}
