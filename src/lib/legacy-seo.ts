const SB_URL = "https://luwgedyzbxokosozhlwf.supabase.co";
const SB_ANON = "sb_publishable_yKN-Yy2Eu_Y-Bmw24eEpKQ_acLs0QET";
const SITE_ORIGIN = "https://aliancamodels.com";

interface CityRow { slug: string; nome?: string; uf?: string; ativa?: boolean; ordem?: number }
interface PerfilRow { slug: string; nome?: string; cidade?: string; descricao?: string; fotos?: string[] }
interface SeoResult { status: number; title?: string; description?: string; content?: string; image?: string; type?: string; jsonLd?: Record<string, unknown> }

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteImage(value?: string): string {
  if (!value) return `${SITE_ORIGIN}/logo.png`;
  return value.startsWith("http") ? value : `${SITE_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

async function select<T>(table: string, query: string): Promise<T[] | null> {
  try {
    const response = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data as T[] : null;
  } catch {
    return null;
  }
}

function seoBlock(pathname: string, cities: CityRow[], profiles: PerfilRow[]): SeoResult {
  const cityBySlug = new Map(cities.map((city) => [city.slug, city]));
  const cityIsActive = (city?: CityRow) => !!city && (
    typeof city.ativa === "boolean"
      ? city.ativa
      : typeof city.ordem === "number" && city.ordem >= 10000
        ? (city.ordem - 10000) % 2 === 0
        : city.slug === "rio-de-janeiro"
  );
  const profilesByCity = new Map<string, PerfilRow[]>();
  for (const profile of profiles) {
    if (!profile.cidade) continue;
    const list = profilesByCity.get(profile.cidade) ?? [];
    list.push(profile);
    profilesByCity.set(profile.cidade, list);
  }

  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) {
    const activeCities = cities.filter(cityIsActive);
    return {
      status: 200,
      title: "Aliança Models — Acompanhantes de Luxo no Brasil",
      description: "Aliança Models: encontre acompanhantes de luxo, perfis verificados e contato direto com discrição em todo o Brasil.",
      content: `<h1>Acompanhantes de luxo no Brasil</h1><p>Conheça perfis de acompanhantes disponíveis, com fotos, informações e contato direto.</p><nav aria-label="Cidades">${activeCities.map((city) => `<a href="/cidade/${escapeHtml(city.slug)}">Acompanhantes em ${escapeHtml(city.nome || city.slug)}</a>`).join(" · ")}</nav><p><a href="/acompanhantes">Ver todos os perfis de acompanhantes</a></p>`,
      image: `${SITE_ORIGIN}/logo.png`,
      type: "website",
      jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "Aliança Models", url: `${SITE_ORIGIN}/`, inLanguage: "pt-BR", description: "Acompanhantes de luxo e perfis verificados no Brasil." },
    };
  }

  if (parts[0] === "acompanhantes") {
    const activeCities = cities.filter(cityIsActive);
    return {
      status: 200,
      title: "Acompanhantes de Luxo no Brasil — Aliança Models",
      description: "Encontre acompanhantes de luxo em cidades atendidas pela Aliança Models. Veja perfis, fotos e informações para contato direto.",
      content: `<h1>Acompanhantes de luxo no Brasil</h1><p>Encontre perfis verificados, fotos e contato direto com discrição. A disponibilidade varia conforme a cidade.</p><nav aria-label="Cidades atendidas">${activeCities.map((city) => `<a href="/cidade/${escapeHtml(city.slug)}">Acompanhantes em ${escapeHtml(city.nome || city.slug)}</a>`).join(" · ")}</nav><ul>${profiles.map((profile) => `<li><a href="/perfil/${escapeHtml(profile.slug)}">${escapeHtml(profile.nome || profile.slug)}${profile.cidade && cityBySlug.get(profile.cidade)?.nome ? ` — acompanhante em ${escapeHtml(cityBySlug.get(profile.cidade)?.nome)}` : ""}</a></li>`).join("")}</ul>`,
      image: `${SITE_ORIGIN}/social-preview-national.png?v=1`,
      type: "website",
      jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: "Acompanhantes de Luxo no Brasil", url: `${SITE_ORIGIN}/acompanhantes`, description: "Perfis de acompanhantes de luxo em cidades atendidas pela Aliança Models.", numberOfItems: profiles.length },
    };
  }

  if (parts[0] === "cidade" && parts[1]) {
    const city = cityBySlug.get(parts[1]);
    const cityProfiles = profilesByCity.get(parts[1]) ?? [];
    if (!cityIsActive(city)) return { status: 404, title: "Página não encontrada — Aliança Models", description: "Esta cidade não possui acompanhantes disponíveis ou não está publicada." };
    const cityName = city.nome || city.slug;
    return {
      status: 200,
      title: `Acompanhantes em ${cityName} (${city.uf || "BR"}) — Aliança Models`,
      description: `Acompanhantes disponíveis em ${cityName}. Veja perfis, fotos e informações para contato direto com discrição.`,
      content: `<article><p>Aliança Models · ${escapeHtml(city.uf || "")}</p><h1>Acompanhantes em ${escapeHtml(cityName)}</h1><p>Confira ${cityProfiles.length} ${cityProfiles.length === 1 ? "perfil disponível" : "perfis disponíveis"} em ${escapeHtml(cityName)}.</p><ul>${cityProfiles.map((profile) => `<li><a href="/perfil/${escapeHtml(profile.slug)}">${escapeHtml(profile.nome || profile.slug)} — acompanhante em ${escapeHtml(cityName)}</a></li>`).join("")}</ul></article>`,
      image: `${SITE_ORIGIN}/logo.png`,
      type: "website",
      jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: `Acompanhantes em ${cityName}`, url: `${SITE_ORIGIN}/cidade/${city.slug}`, isPartOf: { "@type": "WebSite", name: "Aliança Models", url: `${SITE_ORIGIN}/` }, about: { "@type": "City", name: cityName, addressRegion: city.uf, addressCountry: "BR" }, numberOfItems: cityProfiles.length },
    };
  }

  if (parts[0] === "perfil" && parts[1]) {
    const profile = profiles.find((item) => item.slug === parts[1]);
    const city = profile?.cidade ? cityBySlug.get(profile.cidade) : undefined;
    if (!profile) return { status: 404, title: "Página não encontrada — Aliança Models", description: "Este perfil não existe ou foi removido." };
    const name = profile.nome || profile.slug;
    const cityName = city?.nome || profile.cidade || "Brasil";
    const description = (profile.descricao || `Perfil de ${name}, acompanhante em ${cityName}.`).replace(/\s+/g, " ").slice(0, 155);
    return {
      status: 200,
      title: `${name} — Acompanhante em ${cityName} · Aliança Models`,
      description,
      content: `<article><p>Aliança Models · ${escapeHtml(cityName)}</p><h1>${escapeHtml(name)}</h1><p>${escapeHtml(description)}</p><p><a href="/cidade/${escapeHtml(profile.cidade || "")}">Ver acompanhantes em ${escapeHtml(cityName)}</a></p></article>`,
      image: absoluteImage(profile.fotos?.[0]),
      type: "profile",
      jsonLd: { "@context": "https://schema.org", "@type": "ProfilePage", name, url: `${SITE_ORIGIN}/perfil/${profile.slug}`, mainEntity: { "@type": "Person", name, image: absoluteImage(profile.fotos?.[0]), description, address: { "@type": "PostalAddress", addressLocality: cityName, addressRegion: city?.uf, addressCountry: "BR" } } },
    };
  }

  const known = ["anuncie", "informacoes", "termos-de-uso", "politicas-privacidade", "politica-de-cookies", "diretrizes-da-comunidade", "denuncias-e-suporte"];
  return known.includes(parts[0]) ? { status: 200 } : { status: 404, title: "Página não encontrada — Aliança Models", description: "A página que você procura não existe ou foi removida." };
}

export async function renderLegacySeoShell(shellHtml: string, request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname.replace(/\/$/, "") || "/";
  const [citiesWithActive, profiles] = await Promise.all([
    select<CityRow>("cidades", "select=slug,nome,uf,ativa&order=ordem.asc"),
    select<PerfilRow>("perfis", "select=slug,nome,cidade,descricao,fotos&order=ordem.asc"),
  ]);
  const cities = citiesWithActive ?? await select<CityRow>("cidades", "select=slug,nome,uf,ordem&order=ordem.asc");
  if (!cities || !profiles) {
    return new Response(shellHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const seo = seoBlock(pathname, cities, profiles);
  let html = shellHtml;
  if (seo.content) html = html.replace('<main id="app"></main>', `<main id="app" data-seo-prerender="true">${seo.content}</main>`);
  if (seo.title) html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  if (seo.description) html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(seo.description)}$2`);
  if (seo.jsonLd) html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c")}</script>`);
  if (seo.status === 404) html = html.replace('<meta name="robots" content="index,follow" />', '<meta name="robots" content="noindex,follow" />');
  return new Response(html, {
    status: seo.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": seo.status === 200 ? "public, max-age=0, must-revalidate" : "no-store",
    },
  });
}
