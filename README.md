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

App local: `http://localhost:3005`  
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
