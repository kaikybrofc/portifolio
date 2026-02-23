# Portifolio

Portfolio pessoal de **Kaiky Brito**, desenvolvido com React + Vite para apresentar projetos, habilidades e formas de contato.

## Stack

- React 18
- Vite 7
- Tailwind CSS
- Framer Motion
- Radix UI
- API local em Node + SQLite (cache do GitHub)

## SEO incluido

- `sitemap.xml` (gerado no build, incluindo posts do blog quando disponiveis)
- `robots.txt`
- `rss.xml` (feed do blog)
- Open Graph tags
- Twitter Cards
- Imagem de preview social (`public/preview.png`)

## Como rodar localmente

```bash
npm install
npm run dev
```

App local: `http://localhost:3000`  
API cache local: `http://localhost:8787`

## Scripts

- `npm run dev`: inicia frontend + API de cache em paralelo
- `npm run dev:web`: inicia apenas o frontend (Vite)
- `npm run dev:api`: inicia apenas a API de cache (SQLite)
- `npm run webhook:omnizap:push`: coleta rotas do OmniZap local e envia para o webhook secreto
- `npm run omnizap:bridge`: conecta o OmniZap local em canal WebSocket persistente com a VPS
- `npm run build`: gera `sitemap.xml` + `rss.xml` e depois build de producao em `dist/`
- `npm run preview`: serve o build localmente
- `npm run lint`: executa lint sem warnings
- `npm run lint:warn`: executa lint com warnings

## Cache GitHub (SQLite)

Para reduzir chamadas diretas no GitHub e evitar rate limit, os dados de:

- `/users/:username`
- `/users/:username/repos`
- `/repos/:owner/:repo`
- `/repos/:owner/:repo/languages`
- `/repos/:owner/:repo/commits`
- `/repos/:owner/:repo/contributors`
- `/repos/:owner/:repo/readme`
- `/repos/:owner/:repo/releases/latest`

sao cacheados em SQLite (`data/github-cache.sqlite`).

Variaveis opcionais:

- `API_PORT` (padrao `8787`)
- `GITHUB_CACHE_TTL_MS` (padrao `900000`, 15 min)
- `GITHUB_CACHE_DB_PATH` (caminho do arquivo `.sqlite`)
- `GITHUB_TOKEN` (token no backend para aumentar limite da API e servir dados aos visitantes sem login)
- `VITE_SUPABASE_URL` (obrigatoria para login GitHub via Supabase)
- `VITE_SUPABASE_ANON_KEY` ou `VITE_SUPABASE_PUBLISHABLE_KEY` (obrigatoria para login GitHub via Supabase)
- `VITE_SUPABASE_AUTH_REDIRECT_URL` (opcional: forca callback OAuth para um dominio fixo)
- `VITE_API_BASE_URL` (URL base da API para o frontend; util em deploy com frontend/API separados)
- `VITE_USE_RELATIVE_API` (padrao: `true`)
- `VITE_ALLOW_DIRECT_GITHUB_FALLBACK` (padrao: `true` no `npm run dev`; em producao publica fica desabilitado para evitar CSP)
- `VITE_ENABLE_VISIT_TRACKING` (padrao: `true` no `npm run dev`, `false` em producao)
- `VITE_SITE_URL` (URL canônica usada na geracao de `sitemap.xml` e `rss.xml`; padrao `https://omnizap.shop`)
- `VITE_LINKEDIN_URL` (URL do LinkedIn exibida em contato/footer)
- `VITE_CONTACT_EMAIL` (email exibido em contato/footer)
- `OMNIZAP_WEBHOOK_PATH` (rota secreta de ingestao; padrao `/api/webhooks/omnizap-ingest`)
- `OMNIZAP_WEBHOOK_TOKEN` (token obrigatorio para aceitar POST do webhook)
- `OMNIZAP_WEBHOOK_MAX_BODY_BYTES` (limite de payload; padrao `1048576`)
- `OMNIZAP_WS_PATH` (rota WebSocket na VPS; padrao `/api/omnizap/ws`)
- `OMNIZAP_WS_TOKEN` (token do canal WebSocket; fallback para `OMNIZAP_WEBHOOK_TOKEN`)
- `OMNIZAP_COMMANDS_PATH` (rota HTTP para enfileirar comandos; padrao `/api/omnizap/commands`)
- `OMNIZAP_CONTROL_TOKEN` (token dos comandos; fallback para `OMNIZAP_WEBHOOK_TOKEN`)
- `OMNIZAP_DEFAULT_TARGET_CLIENT` (cliente alvo padrao na fila; padrao `default`)
- `OMNIZAP_WS_HEARTBEAT_MS` (heartbeat backend WS; padrao `30000`)
- `OMNIZAP_WS_MAX_MESSAGE_BYTES` (limite de payload WS; padrao `1048576`)
- `OMNIZAP_WS_URL` (URL `ws://`/`wss://` usada pelo bridge local)
- `OMNIZAP_CLIENT_ID` (id fixo do cliente local; recomendado em producao)
- `OMNIZAP_WS_SYNC_INTERVAL_MS` (sync periodico do bridge; padrao `60000`)
- `OMNIZAP_WS_HEARTBEAT_INTERVAL_MS` (heartbeat do bridge; padrao `25000`)
- `OMNIZAP_WS_RECONNECT_MAX_MS` (backoff maximo do bridge; padrao `30000`)

## Deploy estatico e CSP

Se voce publicar apenas o frontend (sem a API Node), as rotas `/api/github/*` e `/api/visits` nao vao existir.
Nesses casos:

- Configure `VITE_API_BASE_URL` para apontar para sua API publicada (ex.: `https://api.seudominio.com`)
- Ou habilite `VITE_USE_RELATIVE_API=true` se seu frontend e backend compartilham o mesmo dominio com rota `/api`
- Para registrar visitas fora do `dev`, habilite `VITE_ENABLE_VISIT_TRACKING=true` e garanta `POST /api/visits`

Sem uma dessas opcoes, os dados do GitHub nao serao carregados em producao.

Importante: nao use `VITE_API_BASE_URL=http://localhost:8787` em build de producao.
`localhost` so funciona na sua maquina e sera bloqueado em navegadores dos visitantes.
Use esse valor apenas em `.env.development`.

Para OAuth com Supabase em producao (VPS), configure `VITE_SUPABASE_URL` e uma chave publica
(`VITE_SUPABASE_ANON_KEY` ou `VITE_SUPABASE_PUBLISHABLE_KEY`; tambem aceitamos variantes
`NEXT_PUBLIC_*`) antes de rodar `npm run build`. Se quiser evitar retorno para dominios de preview,
defina `VITE_SUPABASE_AUTH_REDIRECT_URL=https://seu-dominio.com`.
Em projetos Vite, variaveis publicas sao injetadas no build, entao alterar o `.env` apos o build
nao atualiza o `dist/`.

## Visitas da pagina (SQLite)

As visitas da pagina sao registradas automaticamente no carregamento do app.

Endpoints:

- `POST /api/visits` (registro da visita)
- `GET /api/visits/stats` (total, ultimas 24h, ultimos 7 dias, top paths)

Dashboard:

- `/analytics` (rota protegida: visivel apenas para o owner autenticado)
- `/projetos/omnizap-system` (pagina dedicada com detalhes avancados do projeto OmniZap System)

## OmniZap em tempo real (WebSocket + webhook + fila)

Arquitetura recomendada:

- O OmniZap local abre conexao WebSocket para a VPS (`wss://seu-dominio.com/api/omnizap/ws`)
- A VPS recebe eventos HTTP (`POST`) e enfileira no outbox SQLite
- Se o cliente local estiver conectado, a VPS entrega no WebSocket na hora
- Se estiver offline, a mensagem fica pendente e e entregue quando reconectar

Endpoints:

- `POST OMNIZAP_WEBHOOK_PATH` e alias `POST /api/omnizap/webhook/ingest` (ingestao de payload)
- `GET /api/omnizap/webhook/latest` (ultimo snapshot recebido)
- `POST OMNIZAP_COMMANDS_PATH` (enfileira comando para cliente local)
- `GET OMNIZAP_WS_PATH` (health rapido do canal WS; resposta `status: "ready"`)
- `GET /api/omnizap/ws/status` (status de conexoes e fila pendente)
- `GET /api/health` (health geral, inclui metrica do canal OmniZap)

Tokens aceitos no HTTP:

- `Authorization: Bearer <token>`
- `x-webhook-token: <token>`
- query/body `token` ou `webhook_token`

Cliente local (bridge WebSocket):

```bash
OMNIZAP_LOCAL_BASE_URL=http://localhost:3000 \
OMNIZAP_WS_URL=wss://seu-dominio.com/api/omnizap/ws \
OMNIZAP_WS_TOKEN=SEU_TOKEN_FORTE \
OMNIZAP_CLIENT_ID=omnizap-local-1 \
npm run omnizap:bridge
```

Pedir sincronizacao da VPS para o cliente local:

```bash
curl -X POST "https://seu-dominio.com/api/omnizap/commands" \
  -H "Authorization: Bearer SEU_TOKEN_CONTROLE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "request_sync",
    "target_client": "omnizap-local-1",
    "payload": { "reason": "manual-refresh" }
  }'
```

Enviar payload direto por POST (modo one-shot, sem WebSocket):

```bash
OMNIZAP_LOCAL_BASE_URL=http://localhost:3000 \
OMNIZAP_WEBHOOK_URL=https://seu-dominio.com/api/webhooks/omnizap-ingest \
OMNIZAP_WEBHOOK_TOKEN=SEU_TOKEN_FORTE \
npm run webhook:omnizap:push
```

Importante: os comandos `webhook:omnizap:push` e `omnizap:bridge` devem rodar na maquina que tem acesso ao OmniZap local. Nao precisam rodar na VPS.

## Anti-spam em formularios

Contato e comentarios possuem:

- honeypot invisivel
- limite de tentativas por janela de tempo (via `localStorage`)
- verificacao humana simples (soma)

## Tags no Blog (Supabase)

Para salvar tags no editor e filtrar posts por tag, garanta a coluna `tags` na tabela `blog_posts`:

```sql
alter table public.blog_posts
add column if not exists tags text[] default '{}';
```

## Reacoes (likes/dislikes) em blog e projetos

Para habilitar likes/dislikes no blog e na secao de projetos, crie a tabela abaixo no Supabase:

```sql
create extension if not exists pgcrypto;

create table if not exists public.content_reactions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id text not null,
  voter_key text not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_reactions_unique_vote
  on public.content_reactions (content_type, content_id, voter_key);

alter table public.content_reactions enable row level security;

drop policy if exists "content_reactions_select_all" on public.content_reactions;
create policy "content_reactions_select_all"
  on public.content_reactions
  for select
  using (true);

drop policy if exists "content_reactions_insert_all" on public.content_reactions;
create policy "content_reactions_insert_all"
  on public.content_reactions
  for insert
  with check (true);

drop policy if exists "content_reactions_update_all" on public.content_reactions;
create policy "content_reactions_update_all"
  on public.content_reactions
  for update
  using (true)
  with check (true);

drop policy if exists "content_reactions_delete_all" on public.content_reactions;
create policy "content_reactions_delete_all"
  on public.content_reactions
  for delete
  using (true);
```

## Build de producao

```bash
npm run build
npm run preview
```

Durante o `npm run build`, o script `tools/generate-seo-assets.js` tenta buscar posts no Supabase para incluir URLs individuais no `sitemap.xml` e itens no `rss.xml`.

## Estrutura principal

```text
src/
  components/
  lib/
  pages/
public/
  preview.png
  rss.xml
  robots.txt
  sitemap.xml
```

## Licenca

Este projeto esta sob a licenca MIT. Veja o arquivo `LICENSE`.
