import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Sitemap dinâmico para aliancamodels.com.
 * Consulta as tabelas `cidades` e `perfis` do Supabase público
 * do site18 (mesmo projeto, mesma anon key já expostos no front).
 */
const BASE_URL = "https://aliancamodels.com";
const SB_URL = "https://luwgedyzbxokosozhlwf.supabase.co";
const SB_ANON = "sb_publishable_yKN-Yy2Eu_Y-Bmw24eEpKQ_acLs0QET";

interface CityRow { slug: string }
interface PerfilRow { slug: string; cidade?: string; created_at?: string }

async function sbSelect<T>(table: string, query: string): Promise<T[]> {
  const url = `${SB_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: SB_ANON,
      Authorization: `Bearer ${SB_ANON}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  return (await res.json()) as T[];
}

function urlXml(loc: string, lastmod?: string, changefreq?: string, priority?: string) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [cidades, perfis] = await Promise.all([
          sbSelect<CityRow>("cidades", "select=slug"),
          sbSelect<PerfilRow>("perfis", "select=slug,cidade,created_at"),
        ]);
        // Uma cidade só entra no sitemap quando tem ao menos um perfil
        // cadastrado nela — mesma fonte única usada pelo site público e pelo
        // SSR de SEO (ver src/lib/seo-prerender.ts).
        const cidadesComPerfil = new Set(perfis.map((p) => p.cidade).filter(Boolean));

        const entries: string[] = [
          urlXml(`${BASE_URL}/`, undefined, "weekly", "1.0"),
          urlXml(`${BASE_URL}/anuncie`, undefined, "monthly", "0.5"),
          urlXml(`${BASE_URL}/informacoes`, undefined, "yearly", "0.3"),
          urlXml(`${BASE_URL}/termos-de-uso`, undefined, "yearly", "0.2"),
          urlXml(`${BASE_URL}/politicas-privacidade`, undefined, "yearly", "0.2"),
          urlXml(`${BASE_URL}/politica-de-cookies`, undefined, "yearly", "0.2"),
          urlXml(`${BASE_URL}/diretrizes-da-comunidade`, undefined, "yearly", "0.2"),
          urlXml(`${BASE_URL}/denuncias-e-suporte`, undefined, "yearly", "0.2"),
        ];
        if (perfis.length) entries.splice(1, 0, urlXml(`${BASE_URL}/acompanhantes`, undefined, "daily", "0.9"));

        for (const c of cidades) {
          if (!c.slug || !cidadesComPerfil.has(c.slug)) continue;
          entries.push(urlXml(`${BASE_URL}/cidade/${c.slug}`, undefined, "weekly", "0.8"));
        }
        for (const p of perfis) {
          if (!p.slug) continue;
          entries.push(urlXml(`${BASE_URL}/perfil/${p.slug}`, p.created_at, "weekly", "0.7"));
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
