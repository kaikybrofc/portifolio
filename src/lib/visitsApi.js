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
    // Keep the configured value when URL parsing fails.
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
const VISIT_STATS_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/api/visits/stats`
  : USE_RELATIVE_API
    ? "/api/visits/stats"
    : null;

const emptyStats = {
  total_visits: 0,
  visits_last_24h: 0,
  visits_last_7d: 0,
  daily_visits: [],
  top_paths: [],
};

export const fetchVisitStats = async () => {
  if (!VISIT_STATS_ENDPOINT) {
    return emptyStats;
  }

  const response = await fetch(VISIT_STATS_ENDPOINT, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar analytics (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Resposta de analytics nao esta em JSON.");
  }

  const data = await response.json();

  return {
    total_visits: Number(data?.total_visits || 0),
    visits_last_24h: Number(data?.visits_last_24h || 0),
    visits_last_7d: Number(data?.visits_last_7d || 0),
    daily_visits: Array.isArray(data?.daily_visits) ? data.daily_visits : [],
    top_paths: Array.isArray(data?.top_paths) ? data.top_paths : [],
  };
};

