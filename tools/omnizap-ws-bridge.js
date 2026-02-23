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

const collectLocalRoutes = async () => {
  const routeData = {};

  for (const endpoint of endpoints) {
    const url = `${localBaseUrl}${endpoint.path}`;
    try {
      const data = await fetchJson(url);
      routeData[endpoint.key] = data;
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
