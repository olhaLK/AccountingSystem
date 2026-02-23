const BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "";

type HttpMethod = "GET" | "POST" | "PATCH";

export async function http<T>(
    path: string,
    options?: {
        method?: HttpMethod;
        body?: unknown;
        signal?: AbortSignal;
        headers?: Record<string, string>;
    }
): Promise<T> {
    const url = BASE_URL ? `${BASE_URL}${path}` : path;

    const res = await fetch(url, {
        method: options?.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options?.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
        const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");
        const message =
            typeof payload === "string"
                ? payload
                : payload?.message || payload?.error || `HTTP ${res.status}`;
        throw new Error(message);
    }

    if (res.status === 204) return undefined as T;
    return (isJson ? await res.json() : (await res.text())) as T;
}