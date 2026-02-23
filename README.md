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

- `sitemap.xml`
- `robots.txt`
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
- `npm run build`: gera build de producao em `dist/`
- `npm run preview`: serve o build localmente
- `npm run lint`: executa lint sem warnings
- `npm run lint:warn`: executa lint com warnings

## Cache GitHub (SQLite)

Para reduzir chamadas diretas no GitHub e evitar rate limit, os dados de:

- `/users/:username`
- `/users/:username/repos`

sao cacheados em SQLite (`data/github-cache.sqlite`).

Variaveis opcionais:

- `API_PORT` (padrao `8787`)
- `GITHUB_CACHE_TTL_MS` (padrao `900000`, 15 min)
- `GITHUB_CACHE_DB_PATH` (caminho do arquivo `.sqlite`)
- `GITHUB_TOKEN` (token opcional para aumentar limite da API do GitHub)
- `VITE_SUPABASE_URL` (obrigatoria para login GitHub via Supabase)
- `VITE_SUPABASE_ANON_KEY` ou `VITE_SUPABASE_PUBLISHABLE_KEY` (obrigatoria para login GitHub via Supabase)
- `VITE_SUPABASE_AUTH_REDIRECT_URL` (opcional: forca callback OAuth para um dominio fixo)
- `VITE_API_BASE_URL` (URL base da API para o frontend; util em deploy com frontend/API separados)
- `VITE_USE_RELATIVE_API` (padrao: `true`)
- `VITE_ALLOW_DIRECT_GITHUB_FALLBACK` (padrao: `true` no `npm run dev`; em producao publica fica desabilitado para evitar CSP)
- `VITE_ENABLE_VISIT_TRACKING` (padrao: `true` no `npm run dev`, `false` em producao)

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

## Tags no Blog (Supabase)

Para salvar tags no editor e filtrar posts por tag, garanta a coluna `tags` na tabela `blog_posts`:

```sql
alter table public.blog_posts
add column if not exists tags text[] default '{}';
```

## Build de producao

```bash
npm run build
npm run preview
```

## Estrutura principal

```text
src/
  components/
  lib/
  pages/
public/
  preview.png
  robots.txt
  sitemap.xml
```

## Licenca

Este projeto esta sob a licenca MIT. Veja o arquivo `LICENSE`.
