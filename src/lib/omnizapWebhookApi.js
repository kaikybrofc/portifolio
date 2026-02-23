const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) {
    return "";
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const getRuntimeHostname = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.hostname || "";
};

const isLoopbackHost = (hostname) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1" ||
  hostname === "[::1]";

const sanitizeApiBaseUrl = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);

  if (!normalized || !import.meta.env.PROD) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    const currentHostname = getRuntimeHostname();

    if (!isLoopbackHost(currentHostname) && isLoopbackHost(parsed.hostname)) {
      return "";
    }
  } catch {
    // Keep value when URL parsing fails.
  }

  return normalized;
};

const parseBooleanEnv = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
};

const API_BASE_URL = sanitizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || "");
const useRelativeApiOverride = parseBooleanEnv(import.meta.env.VITE_USE_RELATIVE_API);
const USE_RELATIVE_API = useRelativeApiOverride ?? true;
const WEBHOOK_LATEST_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/api/omnizap/webhook/latest`
  : USE_RELATIVE_API
    ? "/api/omnizap/webhook/latest"
    : null;

export const fetchOmnizapWebhookLatest = async () => {
  if (!WEBHOOK_LATEST_ENDPOINT) {
    return null;
  }

  const response = await fetch(WEBHOOK_LATEST_ENDPOINT, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Falha ao carregar webhook OmniZap (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Resposta do webhook OmniZap nao esta em JSON.");
  }

  const data = await response.json();

  return {
    id: Number(data?.id || 0),
    source: typeof data?.source === "string" ? data.source : "omnizap-local",
    received_at: Number(data?.received_at || 0),
    payload:
      data?.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
        ? data.payload
        : {},
  };
};
