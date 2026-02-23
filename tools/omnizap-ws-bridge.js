import { existsSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import WebSocket from "ws";

const envFilePath = join(process.cwd(), ".env");
if (existsSync(envFilePath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envFilePath);
}

const LOCAL_BASE_URL = process.env.OMNIZAP_LOCAL_BASE_URL || "http://localhost:3000";
const WS_URL = process.env.OMNIZAP_WS_URL || "";
const WS_TOKEN = process.env.OMNIZAP_WS_TOKEN || process.env.OMNIZAP_WEBHOOK_TOKEN || "";
const CLIENT_ID = process.env.OMNIZAP_CLIENT_ID || `${os.hostname()}-${process.pid}`;
const FETCH_LIMIT = Number(process.env.OMNIZAP_STICKER_LIMIT || 100);
const SYNC_INTERVAL_MS = Number(process.env.OMNIZAP_WS_SYNC_INTERVAL_MS || 60_000);
const MEDIA_PROXY_PATH = process.env.OMNIZAP_MEDIA_PROXY_PATH || "/api/omnizap/media";
const WS_MEDIA_MAX_BYTES = Number(
  process.env.OMNIZAP_WS_MEDIA_MAX_BYTES || 512 * 1024
);
const HEARTBEAT_INTERVAL_MS = Number(
  process.env.OMNIZAP_WS_HEARTBEAT_INTERVAL_MS || 25_000
);
const RECONNECT_MAX_MS = Number(process.env.OMNIZAP_WS_RECONNECT_MAX_MS || 30_000);

if (!WS_URL) {
  console.error("[omnizap-bridge] Defina OMNIZAP_WS_URL (ex: wss://seu-dominio.com/api/omnizap/ws)");
  process.exit(1);
}

if (!WS_TOKEN) {
  console.error("[omnizap-bridge] Defina OMNIZAP_WS_TOKEN (ou OMNIZAP_WEBHOOK_TOKEN).");
  process.exit(1);
}

const normalizeBaseUrl = (value) =>
  value && value.endsWith("/") ? value.slice(0, -1) : value;

const localBaseUrl = normalizeBaseUrl(LOCAL_BASE_URL);

const normalizeRelativePath = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!trimmed || trimmed.length > 1024) {
    return "";
  }

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "";
  }

  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      return "";
    }
  }

  return segments.join("/");
};

const normalizeResourceUrl = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return "";
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  try {
    const parsed = new URL(normalized, "http://localhost");
    const segments = parsed.pathname.split("/").filter(Boolean);
    for (const segment of segments) {
      if (segment === "." || segment === "..") {
        return "";
      }
    }

    return `${parsed.pathname}${parsed.search || ""}`;
  } catch {
    return "";
  }
};

const encodePathSegments = (value) =>
  value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const buildLocalDataUrl = (relativePath) => {
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  if (!normalizedRelativePath) {
    return "";
  }

  const encodedPath = encodePathSegments(normalizedRelativePath);
  return `${localBaseUrl}/data/${encodedPath}`;
};

const buildLocalResourceUrl = (resourceUrl) => {
  const normalizedResourceUrl = normalizeResourceUrl(resourceUrl);
  if (!normalizedResourceUrl) {
    return "";
  }

  return `${localBaseUrl}${normalizedResourceUrl}`;
};

const buildMediaProxyUrl = ({ relativePath = "", resourceUrl = "" }) => {
  const query = new URLSearchParams();
  query.set("client_id", CLIENT_ID);

  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const normalizedResourceUrl = normalizeResourceUrl(resourceUrl);
  if (normalizedRelativePath) {
    query.set("relative_path", normalizedRelativePath);
  } else if (normalizedResourceUrl) {
    query.set("resource_url", normalizedResourceUrl);
  } else {
    return "";
  }

  return `${MEDIA_PROXY_PATH}?${query.toString()}`;
};

const endpoints = [
  {
    key: `GET /api/sticker-packs?visibility=all&limit=${FETCH_LIMIT}&offset=0`,
    path: `/api/sticker-packs?visibility=all&limit=${FETCH_LIMIT}&offset=0`,
  },
  {
    key: `GET /api/sticker-packs/orphan-stickers?limit=${FETCH_LIMIT}&offset=0`,
    path: `/api/sticker-packs/orphan-stickers?limit=${FETCH_LIMIT}&offset=0`,
  },
  {
    key: `GET /api/sticker-packs/data-files?limit=${FETCH_LIMIT}&offset=0`,
    path: `/api/sticker-packs/data-files?limit=${FETCH_LIMIT}&offset=0`,
  },
];

const buildWsUrl = () => {
  const wsUrl = new URL(WS_URL);
  wsUrl.searchParams.set("token", WS_TOKEN);
  wsUrl.searchParams.set("client_id", CLIENT_ID);
  return wsUrl.toString();
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha em ${url} (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Resposta nao JSON em ${url}`);
  }

  return response.json();
};

const decorateRoutePayload = (endpointPath, payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const clonedPayload = { ...payload };

  if (endpointPath.startsWith("/api/sticker-packs/data-files")) {
    const originalItems = Array.isArray(payload.data) ? payload.data : [];
    clonedPayload.data = originalItems.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return item;
      }

      const relativePath =
        typeof item.relative_path === "string" ? item.relative_path : "";
      const proxyImageUrl = buildMediaProxyUrl({ relativePath });
      return {
        ...item,
        proxy_image_url: proxyImageUrl || undefined,
        client_id: CLIENT_ID,
      };
    });
  }

  if (endpointPath.startsWith("/api/sticker-packs?")) {
    const originalPacks = Array.isArray(payload.data) ? payload.data : [];
    clonedPayload.data = originalPacks.map((pack) => {
      if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
        return pack;
      }

      const coverUrl = typeof pack.cover_url === "string" ? pack.cover_url : "";
      const proxyCoverUrl = buildMediaProxyUrl({ resourceUrl: coverUrl });
      return {
        ...pack,
        proxy_cover_url: proxyCoverUrl || undefined,
        client_id: CLIENT_ID,
      };
    });
  }

  return clonedPayload;
};

const collectLocalRoutes = async () => {
  const routeData = {};

  for (const endpoint of endpoints) {
    const url = `${localBaseUrl}${endpoint.path}`;
    try {
      const data = await fetchJson(url);
      routeData[endpoint.key] = decorateRoutePayload(endpoint.path, data);
      console.log(`[omnizap-bridge] OK ${endpoint.path}`);
    } catch (error) {
      routeData[endpoint.key] = {
        error: String(error.message || error),
      };
      console.warn(`[omnizap-bridge] ERRO ${endpoint.path}:`, error.message || error);
    }
  }

  return routeData;
};

let ws = null;
let reconnectDelayMs = 1_000;
let reconnectTimer = null;
let syncTimer = null;
let heartbeatTimer = null;
let shuttingDown = false;

const clearTimers = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const sendJson = (payload) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  ws.send(JSON.stringify(payload));
  return true;
};

const pushRouteSnapshot = async (origin = "interval") => {
  const routeData = await collectLocalRoutes();
  const payload = {
    type: "route_snapshot",
    source: "omnizap-ws-bridge",
    payload: {
      origin,
      route_data: routeData,
      sent_at: new Date().toISOString(),
      client_id: CLIENT_ID,
    },
  };

  if (!sendJson(payload)) {
    console.warn("[omnizap-bridge] Socket fechado. Snapshot nao enviado.");
  }
};

const scheduleReconnect = () => {
  if (shuttingDown || reconnectTimer) {
    return;
  }

  const waitTimeMs = reconnectDelayMs;
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_MS);

  console.warn(`[omnizap-bridge] Reconectando em ${waitTimeMs}ms...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, waitTimeMs);
};

const fetchBinary = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha em ${url} (${response.status})`);
  }

  const contentType =
    (response.headers.get("content-type") || "application/octet-stream")
      .split(";")[0]
      .trim() || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    contentType,
    buffer,
  };
};

const sendMediaResponse = async (event) => {
  const requestId =
    (typeof event?.request_id === "string" && event.request_id.trim()) || "";
  if (!requestId) {
    return;
  }

  const relativePath = normalizeRelativePath(event.relative_path);
  const resourceUrl = normalizeResourceUrl(event.resource_url);
  const maxBytesFromServer = Number(event.max_bytes || 0);
  const maxBytes =
    Number.isFinite(maxBytesFromServer) && maxBytesFromServer > 0
      ? Math.min(maxBytesFromServer, WS_MEDIA_MAX_BYTES)
      : WS_MEDIA_MAX_BYTES;

  if (!relativePath && !resourceUrl) {
    sendJson({
      type: "media_response",
      request_id: requestId,
      payload: {
        ok: false,
        error: "relative_path ou resource_url obrigatorio.",
      },
    });
    return;
  }

  const fetchUrl = relativePath
    ? buildLocalDataUrl(relativePath)
    : buildLocalResourceUrl(resourceUrl);
  if (!fetchUrl) {
    sendJson({
      type: "media_response",
      request_id: requestId,
      payload: {
        ok: false,
        error: "URL local invalida para obter midia.",
      },
    });
    return;
  }

  try {
    const media = await fetchBinary(fetchUrl);
    if (media.buffer.length === 0) {
      throw new Error("Arquivo vazio.");
    }

    if (media.buffer.length > maxBytes) {
      throw new Error(
        `Arquivo excede limite (${media.buffer.length} bytes > ${maxBytes} bytes).`
      );
    }

    sendJson({
      type: "media_response",
      request_id: requestId,
      payload: {
        ok: true,
        content_type: media.contentType,
        size_bytes: media.buffer.length,
        data_base64: media.buffer.toString("base64"),
      },
    });
  } catch (error) {
    sendJson({
      type: "media_response",
      request_id: requestId,
      payload: {
        ok: false,
        error: String(error?.message || error),
      },
    });
  }
};

const handleServerEvent = async (message) => {
  const deliveryId = Number(message?.delivery_id || 0);
  const event = message?.event;

  if (deliveryId > 0) {
    sendJson({ type: "ack", delivery_id: deliveryId });
  }

  if (!event || typeof event !== "object") {
    return;
  }

  const eventType = event.type;
  if (eventType === "request_sync") {
    console.log("[omnizap-bridge] Comando request_sync recebido.");
    await pushRouteSnapshot("server-command");
    return;
  }

  if (eventType === "fetch_media") {
    await sendMediaResponse(event);
    return;
  }

  if (eventType === "webhook_ingest") {
    console.log("[omnizap-bridge] Evento webhook_ingest recebido do site.");
    return;
  }

  console.log(`[omnizap-bridge] Evento recebido: ${eventType || "sem tipo"}`);
};

const connect = () => {
  clearTimers();

  const url = buildWsUrl();
  console.log(`[omnizap-bridge] Conectando em ${url.replace(WS_TOKEN, "***")}`);

  ws = new WebSocket(url);

  ws.on("open", async () => {
    reconnectDelayMs = 1_000;
    console.log("[omnizap-bridge] Conectado na VPS.");

    sendJson({
      type: "hello",
      source: "omnizap-ws-bridge",
      client_id: CLIENT_ID,
      started_at: new Date().toISOString(),
    });

    await pushRouteSnapshot("startup");

    syncTimer = setInterval(() => {
      pushRouteSnapshot("interval").catch((error) => {
        console.warn("[omnizap-bridge] Falha no sync periodico:", error.message || error);
      });
    }, SYNC_INTERVAL_MS);

    heartbeatTimer = setInterval(() => {
      sendJson({ type: "ping", ts: Date.now() });
    }, HEARTBEAT_INTERVAL_MS);
  });

  ws.on("message", (rawData, isBinary) => {
    if (isBinary) {
      return;
    }

    let message = null;
    try {
      message = JSON.parse(rawData.toString("utf8"));
    } catch {
      return;
    }

    const messageType = message?.type;

    if (messageType === "pong" || messageType === "hello_ack" || messageType === "welcome") {
      return;
    }

    if (messageType === "server_event") {
      handleServerEvent(message).catch((error) => {
        console.warn("[omnizap-bridge] Falha ao processar evento do servidor:", error);
      });
      return;
    }

    if (messageType === "error") {
      console.warn("[omnizap-bridge] Erro retornado pelo servidor:", message.message || message);
    }
  });

  ws.on("close", (code, reason) => {
    clearTimers();
    const reasonText = reason ? reason.toString("utf8") : "";
    console.warn(`[omnizap-bridge] Socket fechado (code=${code}) ${reasonText}`);
    ws = null;
    if (shuttingDown) {
      process.exit(0);
      return;
    }
    scheduleReconnect();
  });

  ws.on("error", (error) => {
    console.warn("[omnizap-bridge] Erro de conexao:", error.message || error);
  });
};

const shutdown = () => {
  shuttingDown = true;
  clearTimers();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(1000, "shutdown");
    return;
  }

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

connect();
