const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string, params: Record<string, string | number> = {}, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });

  if (!response.ok) {
    let message = `API 요청에 실패했습니다. (${response.status})`;
    try {
      const body = await response.json() as { message?: string; detail?: string };
      message = body.message ?? body.detail ?? message;
    } catch {
      // JSON이 아닌 오류 응답에는 기본 메시지를 사용합니다.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}
