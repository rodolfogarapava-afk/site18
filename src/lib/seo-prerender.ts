/**
 * Pré-renderização leve de SEO para o shell SPA (public/app.html).
 *
 * O site público é uma SPA (public/app.js) que só desenha título, textos,
 * links e JSON-LD depois que o JavaScript roda no navegador. Para que
 * buscadores e ferramentas que não executam JS (ou que têm orçamento de
 * renderização limitado) vejam o conteúdo real da rota já na resposta
 * HTTP inicial, esta função:
 *   1) busca os dados públicos mínimos necessários (Supabase REST,
 *      mesma leitura pública já usada pelo site e pelo sitemap.xml);
 *   2) reescreve <title>, meta description, canonical, Open Graph,
 *      Twitter Card, JSON-LD e meta robots do shell;
 *   3) injeta um trecho de HTML real (H1 + texto + links) dentro de
 *      <main id="app">, que o app.js substitui normalmente ao montar.
 *
 * Se o Supabase não responder, devolve o shell original (o site
 * continua funcionando 100% via client-side, como antes).
 */
const SB_URL = "https://luwgedyzbxokosozhlwf.supabase.co";
const SB_ANON = "sb_publishable_yKN-Yy2Eu_Y-Bmw24eEpKQ_acLs0QET";
const SITE_ORIGIN = "https://aliancamodels.com";

interface CidadeRow {
  slug: string;
  nome: string;
  uf: string;
  ordem?: number;
}
interface PerfilRow {
  slug: string;
  nome: string;
  cidade?: string | null;
  descricao?: string | null;
  fotos?: string[] | null;
  meta_titulo?: string | null;
  meta_descricao?: string | null;
}

interface SeoResult {
  status: number;
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: string;
  content?: string;
  jsonLd?: Record<string, unknown>[];
  robots?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function absoluteImage(value?: string | null): string {
  if (!value) return `${SITE_ORIGIN}/logo.png`;
  return value.startsWith("http")
    ? value
    : `${SITE_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

async function sbSelect<T>(table: string, query: string): Promise<T[]> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

/*
 * Uma cidade só é publicada quando tem ao menos um perfil cadastrado nela.
 * Isso substitui o antigo controle manual (`cidades.ativa`), que nunca chegou
 * a ser aplicado no banco de produção e vivia duplicado (com regras que podiam
 * divergir) no client (public/app.js), no sitemap e aqui. Fonte única: a
 * própria tabela `perfis`.
 */
async function cidadesPublicadasSeo(): Promise<CidadeRow[]> {
  const [cidades, perfis] = await Promise.all([
    sbSelect<CidadeRow>("cidades", "select=slug,nome,uf,ordem&order=ordem.asc"),
    sbSelect<{ cidade: string | null }>("perfis", "select=cidade"),
  ]);
  const cidadesComPerfil = new Set(perfis.map((p) => p.cidade).filter(Boolean));
  return cidades.filter((c) => cidadesComPerfil.has(c.slug));
}

function breadcrumbJsonLd(items: { label: string; path?: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      item: `${SITE_ORIGIN}${it.path ?? ""}`,
    })),
  };
}

const NOT_FOUND: SeoResult = {
  status: 404,
  title: "Página não encontrada — Aliança Models",
  description: "A página que você procura não existe ou foi removida.",
  path: "/",
  content: `<h1>Página não encontrada</h1><p>O perfil ou a página que você procura não existe.</p><p><a href="/">Voltar ao início</a></p>`,
};

/* Título/descrição das páginas institucionais — espelha updateHead() de public/app.js */
const STATIC_PAGES: Record<
  string,
  { title: string; description: string; h1: string; lead: string }
> = {
  anuncie: {
    title: "Anuncie na Aliança Models — Cadastro de Acompanhantes",
    description:
      "Cadastre-se para anunciar como acompanhante na Aliança Models. Sigilo total, análise manual, resposta direta pela central.",
    h1: "Anuncie com discrição",
    lead: "Envie seus dados para análise. A central recebe tudo no WhatsApp com a mensagem pronta.",
  },
  informacoes: {
    title: "Informações & Privacidade — Aliança Models",
    description:
      "Política de privacidade (LGPD), natureza do serviço e informações legais da Aliança Models. Conteúdo destinado a maiores de 18 anos.",
    h1: "Informações & Política",
    lead: "Natureza do serviço, privacidade e informações legais da Aliança Models.",
  },
  "termos-de-uso": {
    title: "Termos de Uso — Aliança Models",
    description: "Termos de Uso da plataforma Aliança Models.",
    h1: "Termos de Uso",
    lead: "Regras de acesso, cadastro e utilização da plataforma Aliança Models.",
  },
  "politicas-privacidade": {
    title: "Política de Privacidade — Aliança Models",
    description: "Política de Privacidade e proteção de dados da Aliança Models.",
    h1: "Política de Privacidade",
    lead: "Como a Aliança Models coleta, usa e protege dados pessoais, em conformidade com a LGPD.",
  },
  "politica-de-cookies": {
    title: "Política de Cookies — Aliança Models",
    description: "Saiba como a Aliança Models utiliza cookies e tecnologias semelhantes.",
    h1: "Política de Cookies",
    lead: "Como cookies e tecnologias semelhantes são usados no site.",
  },
  "diretrizes-da-comunidade": {
    title: "Diretrizes da Comunidade — Aliança Models",
    description: "Regras de segurança, respeito e integridade da comunidade Aliança Models.",
    h1: "Diretrizes da Comunidade",
    lead: "Regras de segurança, respeito e integridade para modelos e visitantes.",
  },
  "denuncias-e-suporte": {
    title: "Denúncias e Suporte — Aliança Models",
    description: "Canais oficiais para denúncias, suporte a visitantes e suporte às modelos.",
    h1: "Denúncias e Suporte",
    lead: "Canais oficiais para denúncias e suporte a visitantes e modelos.",
  },
};

async function seoForHome(): Promise<SeoResult> {
  const cidades = await cidadesPublicadasSeo();
  if (!cidades.length) {
    return {
      status: 200,
      title: "Aliança Models • Acompanhantes de Luxo no Brasil",
      description:
        "Aliança Models: acompanhantes de luxo em todo o Brasil. Perfis verificados e total discrição. Somente maiores de 18 anos.",
      path: "/",
    };
  }
  const links = cidades
    .map(
      (c) =>
        `<li><a href="/cidade/${escapeHtml(c.slug)}">Acompanhantes em ${escapeHtml(c.nome)} (${escapeHtml(c.uf)})</a></li>`,
    )
    .join("");
  return {
    status: 200,
    title: "Aliança Models • Acompanhantes de Luxo no Brasil",
    description:
      "Aliança Models: acompanhantes de luxo em todo o Brasil. Perfis verificados e total discrição. Somente maiores de 18 anos.",
    path: "/",
    content: `<h1>Acompanhantes de alto padrão no Brasil</h1><p>Discrição absoluta. Contato direto. Momentos inesquecíveis.</p><nav aria-label="Cidades atendidas"><ul>${links}</ul></nav>`,
  };
}

async function seoForCidade(slug: string): Promise<SeoResult> {
  const cidade = (await cidadesPublicadasSeo()).find((item) => item.slug === slug);
  if (!cidade) return { ...NOT_FOUND, path: `/cidade/${slug}` };

  const perfis = await sbSelect<PerfilRow>(
    "perfis",
    `cidade=eq.${encodeURIComponent(slug)}&select=slug,nome&order=ordem.asc`,
  );
  const path = `/cidade/${slug}`;
  const title = `Acompanhantes em ${cidade.nome} (${cidade.uf}) — Aliança Models`;
  const description = `${perfis.length} perfis verificados em ${cidade.nome} (${cidade.uf}). Encontre acompanhantes por bairro, novidades e exclusivas com total discrição.`;
  const breadcrumb = breadcrumbJsonLd([{ label: "Início", path: "/" }, { label: cidade.nome }]);
  const listHtml = perfis.length
    ? `<ul>${perfis.map((p) => `<li><a href="/perfil/${escapeHtml(p.slug)}">${escapeHtml(p.nome)} — acompanhante em ${escapeHtml(cidade.nome)}</a></li>`).join("")}</ul>`
    : `<p>Em breve, novos perfis em ${escapeHtml(cidade.nome)}.</p>`;

  return {
    status: 200,
    title,
    description,
    path,
    type: "website",
    content: `<h1>Acompanhantes em ${escapeHtml(cidade.nome)} <span>${escapeHtml(cidade.uf)}</span></h1><p>${perfis.length} acompanhantes em ${escapeHtml(cidade.nome)} (${escapeHtml(cidade.uf)})</p>${listHtml}`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        url: `${SITE_ORIGIN}${path}`,
        inLanguage: "pt-BR",
        about: {
          "@type": "City",
          name: cidade.nome,
          addressRegion: cidade.uf,
          addressCountry: "BR",
        },
        numberOfItems: perfis.length,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: perfis.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_ORIGIN}/perfil/${p.slug}`,
            name: p.nome,
          })),
        },
      },
      breadcrumb,
    ],
  };
}

async function seoForPerfil(slug: string): Promise<SeoResult> {
  const [perfil] = await sbSelect<PerfilRow>(
    "perfis",
    `slug=eq.${encodeURIComponent(slug)}&select=slug,nome,cidade,descricao,fotos,meta_titulo,meta_descricao&limit=1`,
  );
  if (!perfil) return { ...NOT_FOUND, path: `/perfil/${slug}` };

  let cidade: CidadeRow | undefined;
  if (perfil.cidade) {
    [cidade] = await sbSelect<CidadeRow>(
      "cidades",
      `slug=eq.${encodeURIComponent(perfil.cidade)}&select=slug,nome,uf&limit=1`,
    );
  }
  const cidadeNome = cidade?.nome || perfil.cidade || "Brasil";
  const path = `/perfil/${perfil.slug}`;
  const image = absoluteImage(perfil.fotos?.[0]);
  const description =
    (perfil.meta_descricao || "").trim().replace(/\s+/g, " ").slice(0, 300) ||
    (perfil.descricao || "").trim().replace(/\s+/g, " ").slice(0, 155) ||
    `${perfil.nome}, acompanhante em ${cidadeNome}. Total discrição. Contato direto pelo WhatsApp.`;
  const title =
    (perfil.meta_titulo || "").trim() ||
    `${perfil.nome} — Acompanhante em ${cidadeNome} • Aliança Models`;

  const breadcrumb = breadcrumbJsonLd(
    cidade
      ? [
          { label: "Início", path: "/" },
          { label: cidade.nome, path: `/cidade/${cidade.slug}` },
          { label: perfil.nome },
        ]
      : [{ label: "Início", path: "/" }, { label: perfil.nome }],
  );

  return {
    status: 200,
    title,
    description,
    path,
    type: "profile",
    image,
    content: `<article><h1>${escapeHtml(perfil.nome)}</h1><p>${escapeHtml(description)}</p><p><a href="/cidade/${escapeHtml(perfil.cidade || "")}">Ver acompanhantes em ${escapeHtml(cidadeNome)}</a></p></article>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: perfil.nome,
        url: `${SITE_ORIGIN}${path}`,
        inLanguage: "pt-BR",
        mainEntity: {
          "@type": "Person",
          name: perfil.nome,
          image,
          description,
          address: cidade
            ? {
                "@type": "PostalAddress",
                addressLocality: cidade.nome,
                addressRegion: cidade.uf,
                addressCountry: "BR",
              }
            : undefined,
        },
      },
      breadcrumb,
    ],
  };
}

function seoForStaticPage(key: string): SeoResult {
  const page = STATIC_PAGES[key];
  return {
    status: 200,
    title: page.title,
    description: page.description,
    path: `/${key}`,
    content: `<h1>${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.lead)}</p>`,
  };
}

async function resolveSeo(pathname: string): Promise<SeoResult> {
  const clean = pathname.replace(/\/index\.html$/, "/").replace(/(?!^)\/$/, "");
  const parts = clean.split("/").filter(Boolean);

  if (parts.length === 0) return seoForHome();
  if (parts.length === 1 && STATIC_PAGES[parts[0]]) return seoForStaticPage(parts[0]);
  if (parts[0] === "cidade" && parts[1] && parts.length === 2) return seoForCidade(parts[1]);
  if (parts[0] === "perfil" && parts[1] && parts.length === 2) return seoForPerfil(parts[1]);

  // Variações filtradas de cidade (bairro/novidades/exclusivas/vídeos): não
  // entram no sitemap por serem recortes do mesmo conteúdo. O client-side
  // app.js resolve título/descrição/conteúdo específicos, mas já marcamos
  // noindex,follow aqui para o caso de um crawler ler só o HTML inicial.
  if (parts[0] === "cidade" && parts[1] && parts.length > 2) {
    return { status: 200, title: "", description: "", path: clean, robots: "noindex,follow" };
  }

  // Demais rotas conhecidas sem tratamento específico: deixa o shell padrão.
  // Só devolve 404 pré-renderizado quando o primeiro segmento nem é uma rota
  // reconhecida.
  const knownFirstSegments = new Set(["cidade", "perfil", ...Object.keys(STATIC_PAGES)]);
  if (parts.length > 0 && !knownFirstSegments.has(parts[0])) return NOT_FOUND;

  return { status: 200, title: "", description: "", path: clean || "/" };
}

function injectSeo(shellHtml: string, seo: SeoResult): string {
  let html = shellHtml;

  if (seo.title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
    html = html.replace(
      /(<meta property="og:title" content=")[^"]*(")/,
      `$1${escapeHtml(seo.title)}$2`,
    );
    html = html.replace(
      /(<meta name="twitter:title" content=")[^"]*(")/,
      `$1${escapeHtml(seo.title)}$2`,
    );
  }
  if (seo.description) {
    html = html.replace(
      /(<meta name="description" content=")[^"]*(")/,
      `$1${escapeHtml(seo.description)}$2`,
    );
    html = html.replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      `$1${escapeHtml(seo.description)}$2`,
    );
    html = html.replace(
      /(<meta name="twitter:description" content=")[^"]*(")/,
      `$1${escapeHtml(seo.description)}$2`,
    );
  }

  const canonicalUrl = `${SITE_ORIGIN}${seo.path === "/" ? "/" : seo.path}`;
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escapeHtml(canonicalUrl)}$2`);
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*(")/,
    `$1${escapeHtml(canonicalUrl)}$2`,
  );
  if (seo.type)
    html = html.replace(
      /(<meta property="og:type" content=")[^"]*(")/,
      `$1${escapeHtml(seo.type)}$2`,
    );

  if (seo.image) {
    html = html.replace(
      /(<meta property="og:image" content=")[^"]*(")/,
      `$1${escapeHtml(seo.image)}$2`,
    );
    html = html.replace(
      /(<meta property="og:image:secure_url" content=")[^"]*(")/,
      `$1${escapeHtml(seo.image)}$2`,
    );
    html = html.replace(
      /(<meta name="twitter:image" content=")[^"]*(")/,
      `$1${escapeHtml(seo.image)}$2`,
    );
  }

  if (seo.content) {
    html = html.replace(
      '<main id="app"></main>',
      `<main id="app" data-seo-prerender="true">${seo.content}</main>`,
    );
  }

  if (seo.jsonLd?.length) {
    const scripts = seo.jsonLd
      .map((d) => `<script type="application/ld+json">${escapeJsonForScript(d)}</script>`)
      .join("");
    // Substitui o primeiro bloco JSON-LD estático (WebSite) — o segundo
    // bloco (Organization) permanece, pois é válido em qualquer rota.
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, scripts);
  }

  const robotsValue = seo.robots ?? (seo.status === 404 ? "noindex,follow" : undefined);
  if (robotsValue) {
    html = html.replace(
      '<meta name="robots" content="index,follow" />',
      `<meta name="robots" content="${escapeHtml(robotsValue)}" />`,
    );
  }

  return html;
}

export async function renderSeoShell(shellHtml: string, request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  let seo: SeoResult;
  try {
    seo = await resolveSeo(pathname);
  } catch {
    return new Response(shellHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }

  const html = injectSeo(shellHtml, seo);
  return new Response(html, {
    status: seo.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        seo.status === 200 ? "public, max-age=120, stale-while-revalidate=300" : "no-store",
    },
  });
}
