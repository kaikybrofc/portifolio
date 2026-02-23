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

  if (import.meta.env.PROD) {
    // In local preview/testing environments, allow fallback for resilience.
    if (runtimeIsLoopback) {
      return directFallbackOverride ?? true;
    }

    // On public domains, keep fallback disabled by default to avoid CSP issues.
    // The deploy can opt-in explicitly with VITE_ALLOW_DIRECT_GITHUB_FALLBACK=true.
    if (directFallbackOverride === true) {
      return true;
    }

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

const buildGitHubHeaders = (
  token,
  acceptHeader = "application/vnd.github+json"
) => {
  const headers = {
    Accept: acceptHeader,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const fetchJson = async (url, options = {}) => {
  const { headers: extraHeaders = {} } = options;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...extraHeaders,
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

const fetchWithFallback = async (apiUrl, fallbackUrl, options = {}) => {
  const { token, fallbackAcceptHeader, preferDirect = false } = options;
  const fallbackHeaders = buildGitHubHeaders(token, fallbackAcceptHeader);
  const canUseDirectFallback =
    ALLOW_DIRECT_GITHUB_FALLBACK ||
    Boolean(typeof token === "string" && token.trim());

  if (preferDirect && canUseDirectFallback) {
    try {
      return await fetchJson(fallbackUrl, {
        headers: fallbackHeaders,
      });
    } catch (directError) {
      warnOnce(
        `github-api-direct-prefer-failed-${fallbackUrl}`,
        `[githubApi] Direct GitHub preferred fetch failed for ${fallbackUrl}. Trying API cache.`,
        directError
      );
    }
  }

  if (!apiUrl) {
    if (canUseDirectFallback) {
      try {
        return await fetchJson(fallbackUrl, {
          headers: fallbackHeaders,
        });
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
    if (!canUseDirectFallback) {
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
      return await fetchJson(fallbackUrl, {
        headers: fallbackHeaders,
      });
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

const buildRepoEndpoint = (owner, repo, resourcePath = "", queryString = "") => {
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const safeResourcePath = resourcePath.startsWith("/")
    ? resourcePath
    : resourcePath
      ? `/${resourcePath}`
      : "";
  const query = queryString ? `?${queryString}` : "";

  return {
    apiUrl: buildApiUrl(
      `/api/github/repos/${encodedOwner}/${encodedRepo}${safeResourcePath}${query}`
    ),
    fallbackUrl: `https://api.github.com/repos/${encodedOwner}/${encodedRepo}${safeResourcePath}${query}`,
  };
};

const getDefaultGitHubRepo = (owner, repo) => ({
  id: `${owner}/${repo}`,
  name: repo,
  full_name: `${owner}/${repo}`,
  html_url: `https://github.com/${owner}/${repo}`,
  description: "Repositorio sem descricao publica.",
  stargazers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  subscribers_count: 0,
  watchers_count: 0,
  default_branch: "main",
  pushed_at: null,
  updated_at: null,
  created_at: null,
  homepage: "",
  language: null,
  topics: [],
  visibility: "public",
  license: null,
});

export const fetchGitHubRepo = async (owner, repo, options = {}) => {
  const endpoint = buildRepoEndpoint(owner, repo);
  const data = await fetchWithFallback(endpoint.apiUrl, endpoint.fallbackUrl, options);
  if (data) {
    return data;
  }

  // Backward-compatible fallback for deployments that only expose /users/:username/repos.
  const ownerRepos = await fetchGitHubRepos(owner, "sort=updated&per_page=100");
  const normalizedRepoName = String(repo || "").toLowerCase();
  const fromRepoList = ownerRepos.find((item) => {
    const byName = String(item?.name || "").toLowerCase() === normalizedRepoName;
    const byFullName =
      String(item?.full_name || "").toLowerCase() ===
      `${String(owner || "").toLowerCase()}/${normalizedRepoName}`;
    return byName || byFullName;
  });

  return fromRepoList || getDefaultGitHubRepo(owner, repo);
};

export const fetchGitHubRepoLanguages = async (owner, repo, options = {}) => {
  const endpoint = buildRepoEndpoint(owner, repo, "/languages");
  const data = await fetchWithFallback(endpoint.apiUrl, endpoint.fallbackUrl, options);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
};

export const fetchGitHubRepoCommits = async (
  owner,
  repo,
  queryString = "per_page=10",
  options = {}
) => {
  const endpoint = buildRepoEndpoint(owner, repo, "/commits", queryString);
  const data = await fetchWithFallback(endpoint.apiUrl, endpoint.fallbackUrl, options);
  return Array.isArray(data) ? data : [];
};

export const fetchGitHubRepoContributors = async (
  owner,
  repo,
  queryString = "per_page=10",
  options = {}
) => {
  const endpoint = buildRepoEndpoint(owner, repo, "/contributors", queryString);
  const data = await fetchWithFallback(endpoint.apiUrl, endpoint.fallbackUrl, options);
  return Array.isArray(data) ? data : [];
};

export const fetchGitHubLatestRelease = async (owner, repo, options = {}) => {
  const endpoint = buildRepoEndpoint(owner, repo, "/releases/latest");
  const data = await fetchWithFallback(endpoint.apiUrl, endpoint.fallbackUrl, options);
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.message === "Not Found") {
    return null;
  }

  return data;
};

export const fetchGitHubRepoReadme = async (owner, repo, options = {}) => {
  const endpoint = buildRepoEndpoint(owner, repo, "/readme");
  const data = await fetchWithFallback(endpoint.apiUrl, endpoint.fallbackUrl, options);
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.message === "Not Found") {
    return null;
  }

  return data;
};
