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
const WS_STATUS_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/api/omnizap/ws/status`
  : USE_RELATIVE_API
    ? "/api/omnizap/ws/status"
    : null;
const MEDIA_PROXY_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/api/omnizap/media`
  : USE_RELATIVE_API
    ? "/api/omnizap/media"
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

export const fetchOmnizapWsStatus = async () => {
  if (!WS_STATUS_ENDPOINT) {
    return null;
  }

  const response = await fetch(WS_STATUS_ENDPOINT, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar status do canal OmniZap (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Resposta do status OmniZap nao esta em JSON.");
  }

  const data = await response.json();
  const connectedClients = Array.isArray(data?.connected_clients)
    ? data.connected_clients
        .map((entry) => ({
          client_id:
            typeof entry?.client_id === "string" ? entry.client_id : "desconhecido",
          connections: Number(entry?.connections || 0),
        }))
        .filter((entry) => entry.connections > 0)
    : [];

  return {
    websocket_path:
      typeof data?.websocket_path === "string" ? data.websocket_path : "/api/omnizap/ws",
    connected_clients: connectedClients,
    total_connections: Number(data?.total_connections || 0),
    outbox_pending_total: Number(data?.outbox_pending_total || 0),
    outbox_pending_by_target: Array.isArray(data?.outbox_pending_by_target)
      ? data.outbox_pending_by_target
          .map((entry) => ({
            target_client:
              typeof entry?.target_client === "string"
                ? entry.target_client
                : "desconhecido",
            pending: Number(entry?.pending || 0),
          }))
          .filter((entry) => entry.pending > 0)
      : [],
  };
};

export const buildOmnizapMediaProxyUrl = ({
  clientId = "",
  relativePath = "",
  resourceUrl = "",
}) => {
  if (!MEDIA_PROXY_ENDPOINT) {
    return "";
  }

  const query = new URLSearchParams();
  if (typeof clientId === "string" && clientId.trim()) {
    query.set("client_id", clientId.trim());
  }

  if (typeof relativePath === "string" && relativePath.trim()) {
    query.set("relative_path", relativePath.trim());
  } else if (typeof resourceUrl === "string" && resourceUrl.trim()) {
    query.set("resource_url", resourceUrl.trim());
  } else {
    return "";
  }

  return `${MEDIA_PROXY_ENDPOINT}?${query.toString()}`;
};
