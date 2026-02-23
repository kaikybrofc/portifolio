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
    // Keep user-provided value when URL parsing fails.
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
const trackVisitsOverride = parseBooleanEnv(import.meta.env.VITE_ENABLE_VISIT_TRACKING);
const VISIT_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/api/visits`
  : USE_RELATIVE_API
    ? "/api/visits"
    : null;
const SHOULD_TRACK_VISITS = trackVisitsOverride ?? Boolean(import.meta.env.DEV);

const getVisitPayload = () => {
  const path = `${window.location.pathname}${window.location.search}`;
  const referrer = document.referrer || null;
  return { path, referrer };
};

export const trackPageVisit = () => {
  if (!SHOULD_TRACK_VISITS || !VISIT_ENDPOINT) {
    return;
  }

  try {
    const payload = getVisitPayload();
    const body = JSON.stringify(payload);
    const canUseBeacon = typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function";

    if (canUseBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const queued = navigator.sendBeacon(VISIT_ENDPOINT, blob);

      if (queued) {
        return;
      }
    }

    fetch(VISIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Visit tracking failed (${response.status})`);
        }
      })
      .catch((error) => {
        console.warn("[visitTracker] Could not persist visit.", error);
      });
  } catch (error) {
    console.warn("[visitTracker] Unexpected tracking error.", error);
  }
};
