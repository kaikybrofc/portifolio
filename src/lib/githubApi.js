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
const directFallbackOverride = parseBooleanEnv(
  import.meta.env.VITE_ALLOW_DIRECT_GITHUB_FALLBACK
);
const ALLOW_DIRECT_GITHUB_FALLBACK =
  directFallbackOverride ?? Boolean(import.meta.env.DEV);

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

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
  try {
    return await fetchJson(apiUrl);
  } catch (apiError) {
    if (!ALLOW_DIRECT_GITHUB_FALLBACK) {
      console.warn(
        `[githubApi] API cache unavailable for ${apiUrl}. Direct GitHub fallback disabled.`,
        apiError
      );
      throw new Error(
        `[githubApi] GitHub API cache unavailable at ${apiUrl}. Configure VITE_API_BASE_URL for a reachable backend /api endpoint or enable VITE_ALLOW_DIRECT_GITHUB_FALLBACK=true when CSP allows https://api.github.com.`
      );
    }

    console.warn(
      `[githubApi] API cache unavailable for ${apiUrl}. Using GitHub direct fetch.`,
      apiError
    );
    return fetchJson(fallbackUrl);
  }
};

export const fetchGitHubUser = (username) => {
  const encodedUsername = encodeURIComponent(username);
  const apiUrl = buildApiUrl(`/api/github/users/${encodedUsername}`);
  const fallbackUrl = `https://api.github.com/users/${encodedUsername}`;
  return fetchWithFallback(apiUrl, fallbackUrl);
};

export const fetchGitHubRepos = (username, queryString = "per_page=100") => {
  const encodedUsername = encodeURIComponent(username);
  const query = queryString ? `?${queryString}` : "";
  const apiUrl = buildApiUrl(`/api/github/users/${encodedUsername}/repos${query}`);
  const fallbackUrl = `https://api.github.com/users/${encodedUsername}/repos${query}`;
  return fetchWithFallback(apiUrl, fallbackUrl);
};
