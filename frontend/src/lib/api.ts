"use client";
import { useCallback, useEffect, useState } from "react";

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
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<{ path: string; data?: T; error?: string } | null>(null);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setSettled({ path, data: value }); })
      .catch(e => { if (!controller.signal.aborted) setSettled({ path, error: e instanceof ApiError ? e.code : "network_error" }); });
    return () => controller.abort();
  }, [path, version]);
  // Loading means nothing is on screen yet, not that a request is in flight: pages
  // refresh themselves every half minute, and a reviewer reading a queue should not
  // watch it turn back into a spinner. Asking for a different path does clear it.
  const current = settled && settled.path === path ? settled : null;
  return { data: current?.data, error: current?.error, loading: Boolean(path) && !current, refresh };
}
