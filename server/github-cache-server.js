import { createServer } from "node:http";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { WebSocketServer } from "ws";

const envFilePath = join(process.cwd(), ".env");
if (existsSync(envFilePath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envFilePath);
}

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
const normalizeWebhookPath = (value) => {
  if (typeof value !== "string") {
    return "/api/webhooks/omnizap-ingest";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "/api/webhooks/omnizap-ingest";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const normalizeRequestPathname = (pathname) => {
  if (typeof pathname !== "string" || !pathname.trim()) {
    return "/";
  }

  const normalized = pathname.trim();
  if (normalized === "/") {
    return "/";
  }

  return normalized.replace(/\/+$/, "") || "/";
};

const OMNIZAP_WEBHOOK_PATH = normalizeWebhookPath(
  process.env.OMNIZAP_WEBHOOK_PATH || "/api/webhooks/omnizap-ingest"
);
const OMNIZAP_WEBHOOK_ALIAS_PATH = "/api/omnizap/webhook/ingest";
const OMNIZAP_WEBHOOK_TOKEN = process.env.OMNIZAP_WEBHOOK_TOKEN || "";
const OMNIZAP_CONTROL_TOKEN =
  process.env.OMNIZAP_CONTROL_TOKEN || OMNIZAP_WEBHOOK_TOKEN;
const OMNIZAP_WS_TOKEN = process.env.OMNIZAP_WS_TOKEN || OMNIZAP_WEBHOOK_TOKEN;
const OMNIZAP_WEBHOOK_MAX_BODY_BYTES = Number(
  process.env.OMNIZAP_WEBHOOK_MAX_BODY_BYTES || 1024 * 1024
);
const OMNIZAP_WS_PATH = normalizeWebhookPath(
  process.env.OMNIZAP_WS_PATH || "/api/omnizap/ws"
);
const OMNIZAP_COMMANDS_PATH = normalizeWebhookPath(
  process.env.OMNIZAP_COMMANDS_PATH || "/api/omnizap/commands"
);
const OMNIZAP_DEFAULT_TARGET_CLIENT =
  process.env.OMNIZAP_DEFAULT_TARGET_CLIENT || "default";
const OMNIZAP_WS_MAX_MESSAGE_BYTES = Number(
  process.env.OMNIZAP_WS_MAX_MESSAGE_BYTES || 1024 * 1024
);
const OMNIZAP_WS_HEARTBEAT_MS = Number(
  process.env.OMNIZAP_WS_HEARTBEAT_MS || 30 * 1000
);

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
  CREATE TABLE IF NOT EXISTS omnizap_webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    payload TEXT NOT NULL,
    received_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS omnizap_ws_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_client TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    delivered_at INTEGER
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

const insertOmnizapWebhookEventStmt = db.prepare(`
  INSERT INTO omnizap_webhook_events (source, payload, received_at)
  VALUES (?, ?, ?)
`);

const selectLatestOmnizapWebhookEventStmt = db.prepare(`
  SELECT id, source, payload, received_at
  FROM omnizap_webhook_events
  ORDER BY received_at DESC, id DESC
  LIMIT 1
`);

const insertOmnizapOutboxStmt = db.prepare(`
  INSERT INTO omnizap_ws_outbox (target_client, payload, status, created_at)
  VALUES (?, ?, 'pending', ?)
`);

const selectPendingOmnizapOutboxForClientStmt = db.prepare(`
  SELECT id, target_client, payload, created_at
  FROM omnizap_ws_outbox
  WHERE status = 'pending'
    AND (target_client = ? OR target_client = '*')
  ORDER BY created_at ASC, id ASC
  LIMIT 200
`);

const markOmnizapOutboxDeliveredStmt = db.prepare(`
  UPDATE omnizap_ws_outbox
  SET status = 'delivered',
      delivered_at = ?
  WHERE id = ?
    AND status = 'pending'
`);

const selectOmnizapOutboxPendingStatsStmt = db.prepare(`
  SELECT target_client, COUNT(*) AS pending
  FROM omnizap_ws_outbox
  WHERE status = 'pending'
  GROUP BY target_client
  ORDER BY pending DESC, target_client ASC
`);

const getGithubUrlFromRequest = (requestUrl) => {
  const pathname = normalizeRequestPathname(requestUrl.pathname);
  const encodePathSegment = (value) => {
    try {
      return encodeURIComponent(decodeURIComponent(value));
    } catch {
      return encodeURIComponent(value);
    }
  };

  const userMatch = pathname.match(/^\/api\/github\/users\/([^/]+)$/);
  if (userMatch) {
    const username = encodePathSegment(userMatch[1]);
    return `https://api.github.com/users/${username}`;
  }

  const reposMatch = pathname.match(
    /^\/api\/github\/users\/([^/]+)\/repos$/
  );
  if (reposMatch) {
    const username = encodePathSegment(reposMatch[1]);
    const searchParams = new URLSearchParams(requestUrl.searchParams);

    if (!searchParams.has("per_page")) {
      searchParams.set("per_page", "100");
    }

    const queryString = searchParams.toString();
    const querySuffix = queryString ? `?${queryString}` : "";
    return `https://api.github.com/users/${username}/repos${querySuffix}`;
  }

  const repoMatch = pathname.match(
    /^\/api\/github\/repos\/([^/]+)\/([^/]+)$/
  );
  if (repoMatch) {
    const owner = encodePathSegment(repoMatch[1]);
    const repo = encodePathSegment(repoMatch[2]);
    return `https://api.github.com/repos/${owner}/${repo}`;
  }

  const repoLanguagesMatch = pathname.match(
    /^\/api\/github\/repos\/([^/]+)\/([^/]+)\/languages$/
  );
  if (repoLanguagesMatch) {
    const owner = encodePathSegment(repoLanguagesMatch[1]);
    const repo = encodePathSegment(repoLanguagesMatch[2]);
    return `https://api.github.com/repos/${owner}/${repo}/languages`;
  }

  const repoCommitsMatch = pathname.match(
    /^\/api\/github\/repos\/([^/]+)\/([^/]+)\/commits$/
  );
  if (repoCommitsMatch) {
    const owner = encodePathSegment(repoCommitsMatch[1]);
    const repo = encodePathSegment(repoCommitsMatch[2]);
    const searchParams = new URLSearchParams(requestUrl.searchParams);

    if (!searchParams.has("per_page")) {
      searchParams.set("per_page", "10");
    }

    const queryString = searchParams.toString();
    const querySuffix = queryString ? `?${queryString}` : "";
    return `https://api.github.com/repos/${owner}/${repo}/commits${querySuffix}`;
  }

  const repoContributorsMatch = pathname.match(
    /^\/api\/github\/repos\/([^/]+)\/([^/]+)\/contributors$/
  );
  if (repoContributorsMatch) {
    const owner = encodePathSegment(repoContributorsMatch[1]);
    const repo = encodePathSegment(repoContributorsMatch[2]);
    const searchParams = new URLSearchParams(requestUrl.searchParams);

    if (!searchParams.has("per_page")) {
      searchParams.set("per_page", "10");
    }

    const queryString = searchParams.toString();
    const querySuffix = queryString ? `?${queryString}` : "";
    return `https://api.github.com/repos/${owner}/${repo}/contributors${querySuffix}`;
  }

  const repoReadmeMatch = pathname.match(
    /^\/api\/github\/repos\/([^/]+)\/([^/]+)\/readme$/
  );
  if (repoReadmeMatch) {
    const owner = encodePathSegment(repoReadmeMatch[1]);
    const repo = encodePathSegment(repoReadmeMatch[2]);
    return `https://api.github.com/repos/${owner}/${repo}/readme`;
  }

  const repoLatestReleaseMatch = pathname.match(
    /^\/api\/github\/repos\/([^/]+)\/([^/]+)\/releases\/latest$/
  );
  if (repoLatestReleaseMatch) {
    const owner = encodePathSegment(repoLatestReleaseMatch[1]);
    const repo = encodePathSegment(repoLatestReleaseMatch[2]);
    return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  }

  return null;
};

const withCors = (response) => {
  response.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Webhook-Token, X-Omnizap-Source, X-WebSocket-Token, X-Omnizap-Client"
  );
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

const BODY_TOO_LARGE = Symbol("BODY_TOO_LARGE");

const readJsonBody = async (request, options = {}) => {
  const maxBytes = Number(options.maxBytes || 1024 * 1024);
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      return BODY_TOO_LARGE;
    }
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

const isOmnizapWebhookIngestPath = (pathname) => {
  const normalizedPathname = normalizeRequestPathname(pathname);
  return (
    normalizedPathname === normalizeRequestPathname(OMNIZAP_WEBHOOK_PATH) ||
    normalizedPathname === normalizeRequestPathname(OMNIZAP_WEBHOOK_ALIAS_PATH)
  );
};

const isOmnizapCommandsPath = (pathname) =>
  normalizeRequestPathname(pathname) ===
  normalizeRequestPathname(OMNIZAP_COMMANDS_PATH);

const isOmnizapWsPath = (pathname) =>
  normalizeRequestPathname(pathname) === normalizeRequestPathname(OMNIZAP_WS_PATH);

const getWebhookTokenFromRequest = (request, requestUrl, payload) => {
  const authorizationHeader = request.headers.authorization;
  if (
    typeof authorizationHeader === "string" &&
    authorizationHeader.startsWith("Bearer ")
  ) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }

  const webhookTokenHeader = request.headers["x-webhook-token"];
  if (typeof webhookTokenHeader === "string") {
    return webhookTokenHeader.trim();
  }

  const queryToken =
    requestUrl.searchParams.get("token") ||
    requestUrl.searchParams.get("webhook_token");
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const bodyToken =
      (typeof payload.webhook_token === "string" && payload.webhook_token) ||
      (typeof payload.token === "string" && payload.token) ||
      "";

    if (bodyToken.trim()) {
      return bodyToken.trim();
    }
  }

  return "";
};

const secureCompareToken = (providedToken, expectedToken) => {
  if (!providedToken || !expectedToken) {
    return false;
  }

  const providedBuffer = Buffer.from(providedToken, "utf8");
  const expectedBuffer = Buffer.from(expectedToken, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
};

const parseWebhookSource = (request, payload) => {
  if (typeof payload?.source === "string" && payload.source.trim()) {
    return payload.source.trim().slice(0, 255);
  }

  const sourceHeader = request.headers["x-omnizap-source"];
  if (typeof sourceHeader === "string" && sourceHeader.trim()) {
    return sourceHeader.trim().slice(0, 255);
  }

  return "omnizap-local";
};

const sanitizeWebhookPayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const sanitizedPayload = { ...payload };
  delete sanitizedPayload.token;
  delete sanitizedPayload.webhook_token;

  return sanitizedPayload;
};

const normalizeTargetClient = (value, fallback = OMNIZAP_DEFAULT_TARGET_CLIENT) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed === "*") {
    return "*";
  }

  return trimmed.slice(0, 128);
};

const parseJsonSafe = (value, fallback = null) => {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getWebSocketTokenFromUpgradeRequest = (request, requestUrl) => {
  const authorizationHeader = request.headers.authorization;
  if (
    typeof authorizationHeader === "string" &&
    authorizationHeader.startsWith("Bearer ")
  ) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }

  const wsTokenHeader = request.headers["x-websocket-token"];
  if (typeof wsTokenHeader === "string" && wsTokenHeader.trim()) {
    return wsTokenHeader.trim();
  }

  const queryToken =
    requestUrl.searchParams.get("token") ||
    requestUrl.searchParams.get("ws_token") ||
    requestUrl.searchParams.get("webhook_token");
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }

  return "";
};

const getWebSocketClientIdFromRequestUrl = (requestUrl) =>
  normalizeTargetClient(
    requestUrl.searchParams.get("client_id") ||
      requestUrl.searchParams.get("client") ||
      requestUrl.searchParams.get("source"),
    OMNIZAP_DEFAULT_TARGET_CLIENT
  );

const wsClientsById = new Map();

const addWsClient = (clientId, socket) => {
  const normalizedClientId = normalizeTargetClient(clientId);
  const existingSet = wsClientsById.get(normalizedClientId) || new Set();
  existingSet.add(socket);
  wsClientsById.set(normalizedClientId, existingSet);
  return normalizedClientId;
};

const removeWsClient = (clientId, socket) => {
  const normalizedClientId = normalizeTargetClient(clientId);
  const existingSet = wsClientsById.get(normalizedClientId);
  if (!existingSet) {
    return;
  }

  existingSet.delete(socket);
  if (existingSet.size === 0) {
    wsClientsById.delete(normalizedClientId);
  }
};

const isWsSocketOpen = (socket) => socket?.readyState === 1;

const sendWsJson = (socket, payload) => {
  if (!isWsSocketOpen(socket)) {
    return false;
  }

  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn("[omnizap-ws] Falha ao enviar payload para cliente.", error);
    return false;
  }
};

const enqueueOmnizapOutboxMessage = ({
  targetClient = OMNIZAP_DEFAULT_TARGET_CLIENT,
  type = "event",
  payload = {},
  source = "portfolio-api",
}) => {
  const now = Date.now();
  const normalizedTargetClient = normalizeTargetClient(targetClient);
  const messagePayload = {
    type,
    source,
    sent_at: now,
    payload:
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? sanitizeWebhookPayload(payload)
        : { value: payload },
  };
  const payloadAsJson = JSON.stringify(messagePayload);
  const insertResult = insertOmnizapOutboxStmt.run(
    normalizedTargetClient,
    payloadAsJson,
    now
  );

  return {
    id: Number(insertResult?.lastInsertRowid || 0),
    targetClient: normalizedTargetClient,
    payloadAsJson,
  };
};

const dispatchOutboxRowsToWebSocketClients = (outboxRows) => {
  if (!Array.isArray(outboxRows) || outboxRows.length === 0) {
    return 0;
  }

  let dispatchedMessages = 0;

  for (const row of outboxRows) {
    const eventPayload = parseJsonSafe(row.payload, null);
    if (!eventPayload) {
      continue;
    }

    const targetClient = normalizeTargetClient(row.target_client);
    const targetClients =
      targetClient === "*" ? Array.from(wsClientsById.keys()) : [targetClient];

    const envelope = {
      type: "server_event",
      delivery_id: Number(row.id || 0),
      target_client: targetClient,
      event: eventPayload,
      queued_at: Number(row.created_at || Date.now()),
    };

    for (const clientId of targetClients) {
      const sockets = wsClientsById.get(clientId);
      if (!sockets || sockets.size === 0) {
        continue;
      }

      for (const socket of sockets) {
        if (sendWsJson(socket, envelope)) {
          dispatchedMessages += 1;
        }
      }
    }
  }

  return dispatchedMessages;
};

const dispatchPendingOutboxForClient = (clientId) => {
  const normalizedClientId = normalizeTargetClient(clientId);
  const pendingRows = selectPendingOmnizapOutboxForClientStmt.all(normalizedClientId);
  return dispatchOutboxRowsToWebSocketClients(pendingRows);
};

const markOutboxMessageDelivered = (deliveryId) => {
  const numericDeliveryId = Number(deliveryId || 0);
  if (!numericDeliveryId) {
    return;
  }

  markOmnizapOutboxDeliveredStmt.run(Date.now(), numericDeliveryId);
};

const persistOmnizapWebhookEvent = (source, payload) => {
  const normalizedSource = normalizeTargetClient(source, "omnizap-local");
  const normalizedPayload = sanitizeWebhookPayload(payload);
  insertOmnizapWebhookEventStmt.run(
    normalizedSource,
    JSON.stringify(normalizedPayload),
    Date.now()
  );
};

const getWsStatusSnapshot = () => {
  const clients = Array.from(wsClientsById.entries()).map(([clientId, sockets]) => ({
    client_id: clientId,
    connections: sockets.size,
  }));

  const pendingByTarget = selectOmnizapOutboxPendingStatsStmt
    .all()
    .map((row) => ({
      target_client: row.target_client,
      pending: Number(row.pending || 0),
    }));

  const totalPending = pendingByTarget.reduce(
    (acc, entry) => acc + Number(entry.pending || 0),
    0
  );

  return {
    websocket_path: OMNIZAP_WS_PATH,
    connected_clients: clients,
    total_connections: clients.reduce(
      (acc, entry) => acc + Number(entry.connections || 0),
      0
    ),
    outbox_pending_total: totalPending,
    outbox_pending_by_target: pendingByTarget,
  };
};

const wsHeartbeat = (socket) => {
  if (socket.isAlive === false) {
    socket.terminate();
    return;
  }

  socket.isAlive = false;
  try {
    socket.ping();
  } catch {
    socket.terminate();
  }
};

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: OMNIZAP_WS_MAX_MESSAGE_BYTES,
});

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

const handleOmnizapWsMessage = (socket, rawData) => {
  const messageAsText = rawData.toString("utf8");
  const message = parseJsonSafe(messageAsText, null);

  if (!message || typeof message !== "object" || Array.isArray(message)) {
    sendWsJson(socket, {
      type: "error",
      message: "Payload WebSocket invalido. Envie JSON objeto.",
    });
    return;
  }

  const messageType = typeof message.type === "string" ? message.type : "";

  if (messageType === "ping") {
    sendWsJson(socket, { type: "pong", server_time: Date.now() });
    return;
  }

  if (messageType === "ack") {
    markOutboxMessageDelivered(message.delivery_id);
    return;
  }

  if (messageType === "route_snapshot" || messageType === "webhook_payload") {
    const payload =
      message.payload && typeof message.payload === "object" && !Array.isArray(message.payload)
        ? message.payload
        : message;
    const source = message.source || socket.clientId || "omnizap-local";
    persistOmnizapWebhookEvent(source, payload);
    sendWsJson(socket, { type: "ack", received_type: messageType, received_at: Date.now() });
    return;
  }

  if (messageType === "hello") {
    sendWsJson(socket, {
      type: "hello_ack",
      client_id: socket.clientId,
      server_time: Date.now(),
    });
    return;
  }

  sendWsJson(socket, {
    type: "ignored",
    message: "Tipo de mensagem nao suportado.",
    received_type: messageType || "(sem tipo)",
  });
};

wss.on("connection", (socket, request) => {
  const host = request.headers.host || "localhost";
  const requestUrl = new URL(request.url || "/", `http://${host}`);
  const clientId = addWsClient(getWebSocketClientIdFromRequestUrl(requestUrl), socket);
  socket.clientId = clientId;
  socket.isAlive = true;

  sendWsJson(socket, {
    type: "welcome",
    client_id: clientId,
    server_time: Date.now(),
    message: "Conexao WebSocket estabelecida.",
  });

  dispatchPendingOutboxForClient(clientId);

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", (rawData, isBinary) => {
    if (isBinary) {
      sendWsJson(socket, {
        type: "error",
        message: "Payload binario nao suportado. Use JSON texto.",
      });
      return;
    }

    handleOmnizapWsMessage(socket, rawData);
  });

  socket.on("close", () => {
    removeWsClient(clientId, socket);
  });

  socket.on("error", (error) => {
    console.warn(`[omnizap-ws] Erro no cliente ${clientId}:`, error);
    removeWsClient(clientId, socket);
  });
});

const wsHeartbeatInterval = setInterval(() => {
  for (const socket of wss.clients) {
    wsHeartbeat(socket);
  }
}, OMNIZAP_WS_HEARTBEAT_MS);

const shouldHandleWsUpgrade = (pathname) => isOmnizapWsPath(pathname);

const rejectUpgrade = (socket, statusCode, message) => {
  const responseBody = JSON.stringify({ error: message });
  const statusText =
    statusCode === 401
      ? "Unauthorized"
      : statusCode === 503
        ? "Service Unavailable"
        : "Not Found";
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
      "Content-Type: application/json; charset=utf-8\r\n" +
      "Connection: close\r\n" +
      `Content-Length: ${Buffer.byteLength(responseBody)}\r\n\r\n` +
      responseBody
  );
  socket.destroy();
};

const server = createServer(async (request, response) => {
  const host = request.headers.host || "localhost";
  const requestUrl = new URL(request.url || "/", `http://${host}`);
  const requestPathname = normalizeRequestPathname(requestUrl.pathname);

  if (request.method === "OPTIONS") {
    withCors(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "POST" && isOmnizapWebhookIngestPath(requestPathname)) {
    if (!OMNIZAP_WEBHOOK_TOKEN) {
      sendJson(response, 503, {
        error: "Webhook indisponivel. OMNIZAP_WEBHOOK_TOKEN nao configurado.",
      });
      return;
    }

    const body = await readJsonBody(request, {
      maxBytes: OMNIZAP_WEBHOOK_MAX_BODY_BYTES,
    });

    if (body === BODY_TOO_LARGE) {
      sendJson(response, 413, {
        error: "Payload excede limite permitido para o webhook.",
      });
      return;
    }

    if (body == null || typeof body !== "object" || Array.isArray(body)) {
      sendJson(response, 400, { error: "Payload JSON invalido para webhook." });
      return;
    }

    const providedToken = getWebhookTokenFromRequest(request, requestUrl, body);
    const isAuthorized = secureCompareToken(providedToken, OMNIZAP_WEBHOOK_TOKEN);

    if (!isAuthorized) {
      sendJson(response, 401, { error: "Token de webhook invalido." });
      return;
    }

    const receivedAt = Date.now();
    const sanitizedBody = sanitizeWebhookPayload(body);
    const source = parseWebhookSource(request, sanitizedBody);
    persistOmnizapWebhookEvent(source, sanitizedBody);

    const targetClient = normalizeTargetClient(
      sanitizedBody.target_client ||
        requestUrl.searchParams.get("target_client") ||
        OMNIZAP_DEFAULT_TARGET_CLIENT
    );
    const queuedMessage = enqueueOmnizapOutboxMessage({
      targetClient,
      type: "webhook_ingest",
      payload: sanitizedBody,
      source,
    });
    const dispatchedToWs = dispatchOutboxRowsToWebSocketClients([
      {
        id: queuedMessage.id,
        target_client: queuedMessage.targetClient,
        payload: queuedMessage.payloadAsJson,
        created_at: receivedAt,
      },
    ]);

    sendJson(response, 202, {
      ok: true,
      id: queuedMessage.id,
      source,
      received_at: receivedAt,
      websocket_target_client: queuedMessage.targetClient,
      websocket_dispatched: dispatchedToWs > 0,
      websocket_dispatch_count: dispatchedToWs,
    });
    return;
  }

  if (request.method === "POST" && isOmnizapCommandsPath(requestPathname)) {
    if (!OMNIZAP_CONTROL_TOKEN) {
      sendJson(response, 503, {
        error: "Comandos OmniZap indisponiveis. OMNIZAP_CONTROL_TOKEN nao configurado.",
      });
      return;
    }

    const body = await readJsonBody(request, {
      maxBytes: OMNIZAP_WEBHOOK_MAX_BODY_BYTES,
    });

    if (body === BODY_TOO_LARGE) {
      sendJson(response, 413, {
        error: "Payload excede limite permitido para comandos OmniZap.",
      });
      return;
    }

    if (body == null || typeof body !== "object" || Array.isArray(body)) {
      sendJson(response, 400, { error: "Payload JSON invalido para comando." });
      return;
    }

    const providedToken = getWebhookTokenFromRequest(request, requestUrl, body);
    const isAuthorized = secureCompareToken(providedToken, OMNIZAP_CONTROL_TOKEN);

    if (!isAuthorized) {
      sendJson(response, 401, { error: "Token de controle invalido." });
      return;
    }

    const commandType =
      typeof body.type === "string" && body.type.trim()
        ? body.type.trim()
        : "request_sync";
    const commandPayload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? body.payload
        : sanitizeWebhookPayload(body);
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 255)
        : "portfolio-api";
    const targetClient = normalizeTargetClient(
      body.target_client || requestUrl.searchParams.get("target_client"),
      OMNIZAP_DEFAULT_TARGET_CLIENT
    );
    const queuedMessage = enqueueOmnizapOutboxMessage({
      targetClient,
      type: commandType,
      payload: commandPayload,
      source,
    });
    const dispatchedToWs = dispatchOutboxRowsToWebSocketClients([
      {
        id: queuedMessage.id,
        target_client: queuedMessage.targetClient,
        payload: queuedMessage.payloadAsJson,
        created_at: Date.now(),
      },
    ]);

    sendJson(response, 202, {
      ok: true,
      id: queuedMessage.id,
      command_type: commandType,
      target_client: queuedMessage.targetClient,
      websocket_dispatched: dispatchedToWs > 0,
      websocket_dispatch_count: dispatchedToWs,
    });
    return;
  }

  if (request.method === "POST" && requestPathname === "/api/visits") {
    const body = await readJsonBody(request, { maxBytes: 64 * 1024 });

    if (body === BODY_TOO_LARGE) {
      sendJson(response, 413, { error: "Payload de visita excede limite." });
      return;
    }

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

  if (isOmnizapWebhookIngestPath(requestPathname)) {
    sendJson(response, 200, {
      status: "ready",
      message: "Webhook OmniZap ativo. Envie dados com POST.",
      method: "POST",
      webhook_path: OMNIZAP_WEBHOOK_PATH,
      webhook_alias_path: OMNIZAP_WEBHOOK_ALIAS_PATH,
      token_required: true,
    });
    return;
  }

  if (isOmnizapCommandsPath(requestPathname)) {
    sendJson(response, 200, {
      status: "ready",
      message: "Canal de comandos OmniZap ativo. Envie comandos via POST.",
      method: "POST",
      commands_path: OMNIZAP_COMMANDS_PATH,
      token_required: true,
    });
    return;
  }

  if (isOmnizapWsPath(requestPathname)) {
    sendJson(response, 200, {
      status: "ready",
      message: "Canal WebSocket OmniZap ativo.",
      method: "WS",
      websocket_path: OMNIZAP_WS_PATH,
      token_required: true,
    });
    return;
  }

  if (requestPathname === "/api/health") {
    const wsStatus = getWsStatusSnapshot();
    sendJson(response, 200, {
      status: "ok",
      cache_ttl_ms: CACHE_TTL_MS,
      db_path: DB_PATH,
      omnizap_webhook_enabled: Boolean(OMNIZAP_WEBHOOK_TOKEN),
      omnizap_webhook_path: OMNIZAP_WEBHOOK_PATH,
      omnizap_webhook_alias_path: OMNIZAP_WEBHOOK_ALIAS_PATH,
      omnizap_commands_path: OMNIZAP_COMMANDS_PATH,
      omnizap_ws_path: OMNIZAP_WS_PATH,
      omnizap_ws_enabled: Boolean(OMNIZAP_WS_TOKEN),
      omnizap_ws_connected_clients: wsStatus.connected_clients,
      omnizap_ws_outbox_pending_total: wsStatus.outbox_pending_total,
    });
    return;
  }

  if (requestPathname === "/api/visits/stats") {
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

  if (requestPathname === "/api/omnizap/webhook/latest") {
    const latestEvent = selectLatestOmnizapWebhookEventStmt.get();

    if (!latestEvent) {
      sendJson(response, 404, {
        error: "Nenhum payload do webhook OmniZap foi recebido ainda.",
      });
      return;
    }

    let payload = {};
    try {
      payload = JSON.parse(latestEvent.payload);
    } catch {
      payload = {};
    }

    sendJson(response, 200, {
      id: Number(latestEvent.id || 0),
      source: latestEvent.source || "omnizap-local",
      received_at: Number(latestEvent.received_at || 0),
      payload,
    });
    return;
  }

  if (requestPathname === "/api/omnizap/ws/status") {
    const wsStatus = getWsStatusSnapshot();
    sendJson(response, 200, wsStatus);
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

server.on("upgrade", (request, socket, head) => {
  const host = request.headers.host || "localhost";
  const requestUrl = new URL(request.url || "/", `http://${host}`);
  const requestPathname = normalizeRequestPathname(requestUrl.pathname);

  if (!shouldHandleWsUpgrade(requestPathname)) {
    rejectUpgrade(socket, 404, "Rota WebSocket nao encontrada.");
    return;
  }

  if (!OMNIZAP_WS_TOKEN) {
    rejectUpgrade(socket, 503, "WebSocket OmniZap indisponivel.");
    return;
  }

  const providedToken = getWebSocketTokenFromUpgradeRequest(request, requestUrl);
  const isAuthorized = secureCompareToken(providedToken, OMNIZAP_WS_TOKEN);

  if (!isAuthorized) {
    rejectUpgrade(socket, 401, "Token WebSocket invalido.");
    return;
  }

  wss.handleUpgrade(request, socket, head, (wsSocket) => {
    wss.emit("connection", wsSocket, request);
  });
});

server.listen(PORT, () => {
  console.log(`[github-cache] API pronta em http://localhost:${PORT}`);
  console.log(`[github-cache] SQLite em ${DB_PATH}`);
  console.log(`[github-cache] TTL ${CACHE_TTL_MS}ms`);
  console.log(`[github-cache] GitHub token ${GITHUB_TOKEN ? "enabled" : "disabled"}`);
  console.log(
    `[github-cache] OmniZap webhook ${OMNIZAP_WEBHOOK_TOKEN ? "enabled" : "disabled"}`
  );
  console.log(
    `[github-cache] OmniZap ingest path ${OMNIZAP_WEBHOOK_PATH} (alias ${OMNIZAP_WEBHOOK_ALIAS_PATH})`
  );
  console.log(`[github-cache] OmniZap commands path ${OMNIZAP_COMMANDS_PATH}`);
  console.log(`[github-cache] OmniZap WebSocket path ${OMNIZAP_WS_PATH}`);
});

const shutdown = () => {
  clearInterval(wsHeartbeatInterval);
  wss.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
