import { existsSync } from "node:fs";
import { join } from "node:path";

const envFilePath = join(process.cwd(), ".env");
if (existsSync(envFilePath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envFilePath);
}

const LOCAL_BASE_URL =
  process.env.OMNIZAP_LOCAL_BASE_URL ||
  process.env.OMNIZAP_API_BASE_URL ||
  "http://localhost:3000";
const WEBHOOK_URL = process.env.OMNIZAP_WEBHOOK_URL || "";
const WEBHOOK_TOKEN = process.env.OMNIZAP_WEBHOOK_TOKEN || "";
const STICKER_LIMIT = Number(process.env.OMNIZAP_STICKER_LIMIT || 100);

const normalizeBaseUrl = (value) =>
  value && value.endsWith("/") ? value.slice(0, -1) : value;

const localBaseUrl = normalizeBaseUrl(LOCAL_BASE_URL);

if (!WEBHOOK_URL) {
  console.error(
    "[omnizap-webhook] Defina OMNIZAP_WEBHOOK_URL com a rota secreta da VPS."
  );
  process.exit(1);
}

if (!WEBHOOK_TOKEN) {
  console.error(
    "[omnizap-webhook] Defina OMNIZAP_WEBHOOK_TOKEN para autenticar no webhook."
  );
  process.exit(1);
}

const endpoints = [
  {
    key: `GET /api/sticker-packs?visibility=all&limit=${STICKER_LIMIT}&offset=0`,
    path: `/api/sticker-packs?visibility=all&limit=${STICKER_LIMIT}&offset=0`,
  },
  {
    key: `GET /api/sticker-packs/orphan-stickers?limit=${STICKER_LIMIT}&offset=0`,
    path: `/api/sticker-packs/orphan-stickers?limit=${STICKER_LIMIT}&offset=0`,
  },
  {
    key: `GET /api/sticker-packs/data-files?limit=${STICKER_LIMIT}&offset=0`,
    path: `/api/sticker-packs/data-files?limit=${STICKER_LIMIT}&offset=0`,
  },
];

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
  let successCount = 0;
  let failureCount = 0;

  for (const endpoint of endpoints) {
    const url = `${localBaseUrl}${endpoint.path}`;
    try {
      routeData[endpoint.key] = await fetchJson(url);
      successCount += 1;
      console.log(`[omnizap-webhook] OK ${endpoint.path}`);
    } catch (error) {
      routeData[endpoint.key] = {
        error: String(error),
      };
      failureCount += 1;
      console.warn(`[omnizap-webhook] ERRO ${endpoint.path}:`, error.message);
    }
  }

  return {
    routeData,
    successCount,
    failureCount,
  };
};

const pushWebhook = async () => {
  const { routeData, successCount, failureCount } = await collectLocalRoutes();

  console.log(
    `[omnizap-webhook] Resumo coleta local: ${successCount} sucesso(s), ${failureCount} falha(s)`
  );

  if (successCount === 0) {
    throw new Error(
      "[omnizap-webhook] Nenhuma rota local respondeu. Verifique OMNIZAP_LOCAL_BASE_URL e se o OmniZap esta acessivel desta maquina."
    );
  }

  const payload = {
    source: "omnizap-local",
    sent_at: new Date().toISOString(),
    route_data: routeData,
  };

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WEBHOOK_TOKEN}`,
      "X-Omnizap-Source": "omnizap-local-script",
    },
    body: JSON.stringify(payload),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    body = { raw: await response.text() };
  }

  if (!response.ok) {
    throw new Error(
      `[omnizap-webhook] Falha ao enviar webhook (${response.status}): ${JSON.stringify(body)}`
    );
  }

  console.log("[omnizap-webhook] Envio concluido:", body);
};

pushWebhook().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
