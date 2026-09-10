"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error { constructor(public code: string, public status = 0) { super(code); } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { ...options, credentials: "same-origin", cache: "no-store", headers: { ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  } catch (e) { if (e instanceof DOMException && e.name === "AbortError") throw e; throw new ApiError("network_error"); }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(error?.detail?.code || "network_error", response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}
export const send = <T,>(path: string, body: unknown, method = "POST") => api<T>(path, { method, body: JSON.stringify(body) });

export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const previousPath = useRef(path);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    if (previousPath.current !== path) { setData(undefined); previousPath.current = path; }
    if (!path) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(undefined);
    api<T>(path, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(e => { if (!controller.signal.aborted) { setData(undefined); setError(e instanceof ApiError ? e.code : "network_error"); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, version]);
  return { data, error, loading, refresh };
}
