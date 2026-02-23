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
const useRelativeApiOverride = parseBooleanEnv(
  import.meta.env.VITE_USE_RELATIVE_API
);
const USE_RELATIVE_API = useRelativeApiOverride ?? true;
const directFallbackOverride = parseBooleanEnv(
  import.meta.env.VITE_ALLOW_DIRECT_GITHUB_FALLBACK
);
const ALLOW_DIRECT_GITHUB_FALLBACK = (() => {
  const configuredValue = directFallbackOverride ?? Boolean(import.meta.env.DEV);
  const runtimeHostname = getRuntimeHostname();
  const runtimeIsLoopback = isLoopbackHost(runtimeHostname);

  // Browsers on public domains usually block cross-origin API calls with strict CSP.
  if (import.meta.env.PROD && !runtimeIsLoopback) {
    return false;
  }

  // In production with relative /api routing, keep requests same-origin by default.
  if (import.meta.env.PROD && USE_RELATIVE_API && !API_BASE_URL) {
    return false;
  }

  return configuredValue;
})();
const SHOULD_LOG = Boolean(import.meta.env.DEV);

const warnedKeys = new Set();

const warnOnce = (key, message, details) => {
  if (warnedKeys.has(key)) {
    return;
  }

  warnedKeys.add(key);

  if (!SHOULD_LOG) {
    return;
  }

  if (details) {
    console.warn(message, details);
    return;
  }

  console.warn(message);
};

const buildApiUrl = (path) => {
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`;
  }

  if (USE_RELATIVE_API) {
    return path;
  }

  return null;
};

const isJsonResponse = (response) => {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json");
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  if (!isJsonResponse(response)) {
    const contentType = response.headers.get("content-type") || "unknown";
    throw new Error(`Expected JSON but received ${contentType} from ${url}`);
  }

  return response.json();
};

const fetchWithFallback = async (apiUrl, fallbackUrl) => {
  if (!apiUrl) {
    if (ALLOW_DIRECT_GITHUB_FALLBACK) {
      try {
        return await fetchJson(fallbackUrl);
      } catch (fallbackError) {
        warnOnce(
          "github-api-fallback-failed-without-api",
          `[githubApi] Direct GitHub fallback failed for ${fallbackUrl}. Returning local fallback data.`,
          fallbackError
        );
        return null;
      }
    }

    warnOnce(
      "github-api-disabled-no-base",
      "[githubApi] No API base configured and direct GitHub fallback is disabled. Returning local fallback data."
    );
    return null;
  }

  try {
    return await fetchJson(apiUrl);
  } catch (apiError) {
    if (!ALLOW_DIRECT_GITHUB_FALLBACK) {
      warnOnce(
        `github-api-disabled-${apiUrl}`,
        `[githubApi] API cache unavailable for ${apiUrl}. Direct GitHub fallback disabled. Returning local fallback data.`,
        apiError
      );
      return null;
    }

    warnOnce(
      `github-api-fallback-${apiUrl}`,
      `[githubApi] API cache unavailable for ${apiUrl}. Using GitHub direct fetch.`,
      apiError
    );
    try {
      return await fetchJson(fallbackUrl);
    } catch (fallbackError) {
      warnOnce(
        `github-api-fallback-failed-${apiUrl}`,
        `[githubApi] Direct GitHub fallback failed for ${fallbackUrl}. Returning local fallback data.`,
        fallbackError
      );
      return null;
    }
  }
};

const getDefaultGitHubUser = (username) => ({
  login: username,
  name: "Kaiky Brito",
  html_url: `https://github.com/${username}`,
  public_repos: 0,
  followers: 0,
  following: 0,
});

export const fetchGitHubUser = async (username) => {
  const encodedUsername = encodeURIComponent(username);
  const apiUrl = buildApiUrl(`/api/github/users/${encodedUsername}`);
  const fallbackUrl = `https://api.github.com/users/${encodedUsername}`;
  const data = await fetchWithFallback(apiUrl, fallbackUrl);
  return data || getDefaultGitHubUser(username);
};

export const fetchGitHubRepos = async (
  username,
  queryString = "per_page=100"
) => {
  const encodedUsername = encodeURIComponent(username);
  const query = queryString ? `?${queryString}` : "";
  const apiUrl = buildApiUrl(`/api/github/users/${encodedUsername}/repos${query}`);
  const fallbackUrl = `https://api.github.com/users/${encodedUsername}/repos${query}`;
  const data = await fetchWithFallback(apiUrl, fallbackUrl);
  return Array.isArray(data) ? data : [];
};
