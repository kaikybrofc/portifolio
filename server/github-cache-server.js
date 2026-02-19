import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const PORT = Number(process.env.API_PORT || 8787);
const CACHE_TTL_MS = Number(
  process.env.GITHUB_CACHE_TTL_MS || 15 * 60 * 1000
);
const DB_PATH =
  process.env.GITHUB_CACHE_DB_PATH ||
  join(process.cwd(), "data", "github-cache.sqlite");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const USER_AGENT = process.env.GITHUB_USER_AGENT || "kaiky-portfolio-cache";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE IF NOT EXISTS github_cache (
    cache_key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    etag TEXT
  );
  CREATE TABLE IF NOT EXISTS page_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip TEXT,
    visited_at INTEGER NOT NULL
  );
`);

const selectCacheStmt = db.prepare(`
  SELECT payload, fetched_at, etag
  FROM github_cache
  WHERE cache_key = ?
`);

const upsertCacheStmt = db.prepare(`
  INSERT INTO github_cache (cache_key, payload, fetched_at, etag)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(cache_key) DO UPDATE SET
    payload = excluded.payload,
    fetched_at = excluded.fetched_at,
    etag = excluded.etag
`);

const touchCacheStmt = db.prepare(`
  UPDATE github_cache
  SET fetched_at = ?
  WHERE cache_key = ?
`);

const insertVisitStmt = db.prepare(`
  INSERT INTO page_visits (path, referrer, user_agent, ip, visited_at)
  VALUES (?, ?, ?, ?, ?)
`);

const selectVisitStatsStmt = db.prepare(`
  SELECT
    COUNT(*) AS total_visits,
    SUM(CASE WHEN visited_at >= ? THEN 1 ELSE 0 END) AS visits_last_24h,
    SUM(CASE WHEN visited_at >= ? THEN 1 ELSE 0 END) AS visits_last_7d
  FROM page_visits
`);

const selectDailyVisitsStmt = db.prepare(`
  SELECT
    strftime('%Y-%m-%d', visited_at / 1000, 'unixepoch') AS day,
    COUNT(*) AS visits
  FROM page_visits
  WHERE visited_at >= ?
  GROUP BY day
  ORDER BY day DESC
  LIMIT 7
`);

const selectTopPathsStmt = db.prepare(`
  SELECT
    path,
    COUNT(*) AS visits
  FROM page_visits
  GROUP BY path
  ORDER BY visits DESC
  LIMIT 10
`);

const getGithubUrlFromRequest = (requestUrl) => {
  const userMatch = requestUrl.pathname.match(/^\/api\/github\/users\/([^/]+)$/);
  if (userMatch) {
    const username = encodeURIComponent(decodeURIComponent(userMatch[1]));
    return `https://api.github.com/users/${username}`;
  }

  const reposMatch = requestUrl.pathname.match(
    /^\/api\/github\/users\/([^/]+)\/repos$/
  );
  if (reposMatch) {
    const username = encodeURIComponent(decodeURIComponent(reposMatch[1]));
    const searchParams = new URLSearchParams(requestUrl.searchParams);

    if (!searchParams.has("per_page")) {
      searchParams.set("per_page", "100");
    }

    const queryString = searchParams.toString();
    const querySuffix = queryString ? `?${queryString}` : "";
    return `https://api.github.com/users/${username}/repos${querySuffix}`;
  }

  return null;
};

const withCors = (response) => {
  response.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const sendJson = (response, statusCode, payload, headers = {}) => {
  withCors(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
};

const parseCachedPayload = (cachedRow) => JSON.parse(cachedRow.payload);

const readJsonBody = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
};

const getClientIp = (request) => {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || null;
};

const isValidPath = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 512 &&
  value.startsWith("/");

const isValidReferrer = (value) =>
  value == null || (typeof value === "string" && value.length <= 2048);

const fetchWithCache = async (githubUrl) => {
  const cacheKey = githubUrl;
  const now = Date.now();
  const cachedRow = selectCacheStmt.get(cacheKey);
  const hasFreshCache = cachedRow && now - cachedRow.fetched_at < CACHE_TTL_MS;

  if (hasFreshCache) {
    return {
      statusCode: 200,
      body: parseCachedPayload(cachedRow),
      headers: {
        "X-Cache-Status": "HIT",
        "X-Cache-TTL-Ms": String(CACHE_TTL_MS),
      },
    };
  }

  const requestHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
  };

  if (GITHUB_TOKEN) {
    requestHeaders.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  if (cachedRow?.etag) {
    requestHeaders["If-None-Match"] = cachedRow.etag;
  }

  try {
    const githubResponse = await fetch(githubUrl, { headers: requestHeaders });

    if (githubResponse.status === 304 && cachedRow) {
      touchCacheStmt.run(now, cacheKey);
      return {
        statusCode: 200,
        body: parseCachedPayload(cachedRow),
        headers: {
          "X-Cache-Status": "REVALIDATED",
          "X-Cache-TTL-Ms": String(CACHE_TTL_MS),
        },
      };
    }

    if (githubResponse.ok) {
      const payload = await githubResponse.json();
      const payloadAsJson = JSON.stringify(payload);
      const etag = githubResponse.headers.get("etag");

      upsertCacheStmt.run(cacheKey, payloadAsJson, now, etag);

      return {
        statusCode: 200,
        body: payload,
        headers: {
          "X-Cache-Status": cachedRow ? "REFRESH" : "MISS",
          "X-Cache-TTL-Ms": String(CACHE_TTL_MS),
        },
      };
    }

    if (cachedRow) {
      return {
        statusCode: 200,
        body: parseCachedPayload(cachedRow),
        headers: {
          "X-Cache-Status": "STALE",
          "X-Cache-TTL-Ms": String(CACHE_TTL_MS),
          "X-GitHub-Status": String(githubResponse.status),
        },
      };
    }

    let details;
    try {
      details = await githubResponse.json();
    } catch {
      details = { message: await githubResponse.text() };
    }

    return {
      statusCode: githubResponse.status,
      body: {
        error: "Falha ao consultar a API do GitHub.",
        details,
      },
      headers: {
        "X-Cache-Status": "BYPASS",
      },
    };
  } catch (error) {
    if (cachedRow) {
      return {
        statusCode: 200,
        body: parseCachedPayload(cachedRow),
        headers: {
          "X-Cache-Status": "STALE_NETWORK",
          "X-Cache-TTL-Ms": String(CACHE_TTL_MS),
        },
      };
    }

    return {
      statusCode: 502,
      body: {
        error: "Falha de rede ao consultar a API do GitHub.",
        details: String(error),
      },
      headers: {
        "X-Cache-Status": "BYPASS",
      },
    };
  }
};

const server = createServer(async (request, response) => {
  const host = request.headers.host || "localhost";
  const requestUrl = new URL(request.url || "/", `http://${host}`);

  if (request.method === "OPTIONS") {
    withCors(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/visits") {
    const body = await readJsonBody(request);

    if (body == null) {
      sendJson(response, 400, { error: "JSON invalido." });
      return;
    }

    const path = body.path || "/";
    const referrer = body.referrer || null;

    if (!isValidPath(path)) {
      sendJson(response, 400, { error: "Campo path invalido." });
      return;
    }

    if (!isValidReferrer(referrer)) {
      sendJson(response, 400, { error: "Campo referrer invalido." });
      return;
    }

    const userAgentHeader = request.headers["user-agent"];
    const userAgent =
      typeof userAgentHeader === "string" ? userAgentHeader.slice(0, 512) : null;
    const ip = getClientIp(request);
    const visitedAt = Date.now();

    insertVisitStmt.run(path, referrer, userAgent, ip, visitedAt);

    sendJson(response, 201, { ok: true });
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Metodo nao permitido." });
    return;
  }

  if (requestUrl.pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      cache_ttl_ms: CACHE_TTL_MS,
      db_path: DB_PATH,
    });
    return;
  }

  if (requestUrl.pathname === "/api/visits/stats") {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const stats = selectVisitStatsStmt.get(oneDayAgo, sevenDaysAgo);
    const daily = selectDailyVisitsStmt.all(sevenDaysAgo);
    const topPaths = selectTopPathsStmt.all();

    sendJson(response, 200, {
      total_visits: Number(stats?.total_visits || 0),
      visits_last_24h: Number(stats?.visits_last_24h || 0),
      visits_last_7d: Number(stats?.visits_last_7d || 0),
      daily_visits: daily.map((entry) => ({
        day: entry.day,
        visits: Number(entry.visits || 0),
      })),
      top_paths: topPaths.map((entry) => ({
        path: entry.path,
        visits: Number(entry.visits || 0),
      })),
    });
    return;
  }

  const githubUrl = getGithubUrlFromRequest(requestUrl);

  if (!githubUrl) {
    sendJson(response, 404, { error: "Rota nao encontrada." });
    return;
  }

  const result = await fetchWithCache(githubUrl);
  sendJson(response, result.statusCode, result.body, result.headers);
});

server.listen(PORT, () => {
  console.log(`[github-cache] API pronta em http://localhost:${PORT}`);
  console.log(`[github-cache] SQLite em ${DB_PATH}`);
  console.log(`[github-cache] TTL ${CACHE_TTL_MS}ms`);
});

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
