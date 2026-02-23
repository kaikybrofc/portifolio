const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) {
    return "";
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
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

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || "");
const trackVisitsOverride = parseBooleanEnv(import.meta.env.VITE_ENABLE_VISIT_TRACKING);
const SHOULD_TRACK_VISITS =
  trackVisitsOverride ?? Boolean(import.meta.env.DEV || API_BASE_URL);
const VISIT_ENDPOINT = `${API_BASE_URL}/api/visits`;

const getVisitPayload = () => {
  const path = `${window.location.pathname}${window.location.search}`;
  const referrer = document.referrer || null;
  return { path, referrer };
};

export const trackPageVisit = () => {
  if (!SHOULD_TRACK_VISITS) {
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
