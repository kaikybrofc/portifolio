import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const envFilePath = join(process.cwd(), ".env");
if (existsSync(envFilePath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envFilePath);
}

const SITE_URL = (
  process.env.VITE_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://omnizap.shop"
).replace(/\/+$/, "");

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  "";

const OUTPUT_DIR = join(process.cwd(), "public");
const SITEMAP_PATH = join(OUTPUT_DIR, "sitemap.xml");
const RSS_PATH = join(OUTPUT_DIR, "rss.xml");

const escapeXml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const toIsoDate = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const toRssDate = (value) => {
  if (!value) return new Date().toUTCString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
};

const stripMarkdown = (value) =>
  String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildSitemap = (posts) => {
  const staticEntries = [
    {
      loc: `${SITE_URL}/`,
      lastmod: new Date().toISOString().slice(0, 10),
      changefreq: "weekly",
      priority: "1.0",
    },
    {
      loc: `${SITE_URL}/blog`,
      lastmod: new Date().toISOString().slice(0, 10),
      changefreq: "weekly",
      priority: "0.8",
    },
  ];

  const postEntries = posts.map((post) => ({
    loc: `${SITE_URL}/blog/${post.id}`,
    lastmod: toIsoDate(post.updated_at || post.created_at),
    changefreq: "monthly",
    priority: "0.7",
  }));

  const allEntries = [...staticEntries, ...postEntries];

  const body = allEntries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
};

const buildRss = (posts) => {
  const items = posts
    .map((post) => {
      const descriptionBase =
        post.excerpt || stripMarkdown(post.content || "").slice(0, 200);
      const description = descriptionBase || "Novo artigo no blog.";

      return `  <item>
    <title>${escapeXml(post.title || "Sem titulo")}</title>
    <link>${escapeXml(`${SITE_URL}/blog/${post.id}`)}</link>
    <guid>${escapeXml(`${SITE_URL}/blog/${post.id}`)}</guid>
    <pubDate>${toRssDate(post.created_at)}</pubDate>
    <description>${escapeXml(description)}</description>
  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Kaiky Brito Blog</title>
  <link>${escapeXml(`${SITE_URL}/blog`)}</link>
  <description>Artigos sobre backend, Node.js e desenvolvimento web.</description>
  <language>pt-BR</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;
};

const fetchPosts = async () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(
      "[seo] Supabase URL/chave nao configurados. Gerando sitemap/rss apenas com rotas estaticas."
    );
    return [];
  }

  const endpoint =
    `${SUPABASE_URL}/rest/v1/blog_posts` +
    "?select=id,title,excerpt,content,created_at,updated_at&order=created_at.desc";

  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`[seo] Falha ao buscar posts (${response.status}): ${details}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const main = async () => {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let posts = [];
  try {
    posts = await fetchPosts();
  } catch (error) {
    console.error(String(error));
    console.log("[seo] Continuando com sitemap/rss sem posts dinamicos.");
  }

  const sitemap = buildSitemap(posts);
  const rss = buildRss(posts);

  writeFileSync(SITEMAP_PATH, sitemap, "utf8");
  writeFileSync(RSS_PATH, rss, "utf8");

  console.log(`[seo] sitemap.xml gerado com ${posts.length + 2} URLs.`);
  console.log(`[seo] rss.xml gerado com ${posts.length} itens.`);
};

main().catch((error) => {
  console.error("[seo] Erro inesperado ao gerar assets de SEO:", error);
  process.exitCode = 1;
});
