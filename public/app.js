/* ============================================================
   ALIANÇA — App (roteamento + render + WhatsApp)
   Usa CIDADES, PERFIS e ADMIN_WHATSAPP de data.js
   ============================================================ */

/* ---------- Helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");

/* ============================================================
   ROTAS COM URLs REAIS (History API)
   BASE_PATH é detectado a partir de onde o app.js foi carregado,
   assim o site funciona tanto em /site18/ (preview) quanto em /
   (domínio final aliancamodels.com).
   ============================================================ */
const BASE_PATH = "";

/** Constrói URL absoluta (path-only) respeitando BASE_PATH */
const pathTo = (path) => {
  if (!path) return BASE_PATH || "/";
  const clean = path.startsWith("/") ? path : "/" + path;
  return (BASE_PATH || "") + clean + (clean === "/" ? "" : "");
};

/** Extrai a rota lógica (sem BASE_PATH) do pathname atual */
function currentRoute() {
  let path = location.pathname || "/";
  if (BASE_PATH && path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length);
  if (path.endsWith("/index.html")) path = path.slice(0, -"/index.html".length) || "/";
  if (!path) path = "/";
  return path;
}

/** Navega para uma rota interna (com pushState) */
function navigate(path, { replace = false } = {}) {
  const url = pathTo(path);
  if (replace) history.replaceState({}, "", url);
  else history.pushState({}, "", url);
  router();
}

/** Redireciona hash antigos (#/cidade/xxx) para a URL nova, uma vez */
(function migrateLegacyHash() {
  const h = location.hash || "";
  if (h.startsWith("#/") || h === "#") {
    const target = h.replace(/^#\/?/, "/") || "/";
    history.replaceState({}, "", pathTo(target));
  }
})();

/** Delegação de cliques em <a> internos para SPA sem reload */
document.addEventListener("click", (ev) => {
  const a = ev.target.closest("a[href]");
  if (!a) return;
  if (a.target === "_blank" || a.hasAttribute("download")) return;
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
  const href = a.getAttribute("href");
  if (!href) return;
  // externos, mailto, tel, wa.me, âncoras puras: deixa o browser cuidar
  if (/^(https?:|mailto:|tel:|wa\.me|#)/i.test(href) && !href.startsWith(location.origin)) return;
  // URLs absolutas do mesmo host
  let url;
  try { url = new URL(href, location.href); } catch { return; }
  if (url.origin !== location.origin) return;
  // O painel administrativo precisa carregar sua própria página e autenticação.
  if (url.pathname === "/admin") return;
  // ignora arquivos estáticos (admin.html, .png, .xml, etc.)
  if (/\.(html|xml|txt|png|jpg|jpeg|gif|webp|svg|pdf|mp4|mp3)$/i.test(url.pathname)) return;
  ev.preventDefault();
  if (url.pathname + url.search === location.pathname + location.search) return;
  history.pushState({}, "", url.pathname + url.search);
  router();
});

/* ============================================================
   META TAGS DINÂMICAS POR ROTA (SEO)
   ============================================================ */
const SITE_ORIGIN = "https://aliancamodels.com";
const INFO_MODEL_SUPPORT_WHATSAPP = "5511996425680";
const INFO_CLIENT_CONTACT_WHATSAPP = "5515991906606";

function ensureMeta(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el && create) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function updateHead({ title, description, image, path: routePath, type = "website" }) {
  const url = SITE_ORIGIN + (routePath || "/");
  if (title) document.title = title;

  const set = (sel, attr, val) => {
    const el = ensureMeta(sel, () => {
      const [tag, ...rest] = sel.replace(/[[\]"]/g, "").split(/[.#]/);
      const m = sel.match(/\[([^=]+)="([^"]+)"\]/);
      const n = document.createElement(tag || "meta");
      if (m) n.setAttribute(m[1], m[2]);
      return n;
    });
    if (el && val != null) el.setAttribute(attr, val);
  };

  if (description) set('meta[name="description"]', "content", description);
  set('meta[property="og:title"]', "content", title || document.title);
  if (description) set('meta[property="og:description"]', "content", description);
  set('meta[property="og:url"]', "content", url);
  set('meta[property="og:type"]', "content", type);
  if (image) set('meta[property="og:image"]', "content", image);
  set('meta[name="twitter:title"]', "content", title || document.title);
  if (description) set('meta[name="twitter:description"]', "content", description);
  if (image) set('meta[name="twitter:image"]', "content", image);

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  // Reseta robots para index,follow em rotas válidas (view404 sobrescreve)
  const robots = document.head.querySelector('meta[name="robots"]');
  if (robots) robots.setAttribute("content", "index,follow");
}

function setJsonLd(data) {
  let el = document.getElementById("route-jsonld");
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "route-jsonld";
    document.head.appendChild(el);
  }
  el.textContent = data ? JSON.stringify(data) : "";
}



const bairroNome = (cidade, slug) =>
  (CIDADES[cidade]?.bairros?.find(b => b.slug === slug)?.nome) || slug || "";

const localCurtoPerfil = p =>
  [bairroNome(p.cidade, p.bairro), CIDADES[p.cidade]?.uf].filter(Boolean).join(" • ");

const perfilBySlug = slug => PERFIS.find(p => p.slug === slug);

/* Ícone oficial do WhatsApp (mesmo glifo do botão flutuante) */
const WA_ICON = '<svg class="ico-wa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.6 6.31999C16.8669 5.58141 15.9943 4.99596 15.033 4.59767C14.0716 4.19938 13.0406 3.99622 12 3.99999C10.6089 4.00135 9.24248 4.36819 8.03771 5.06377C6.83294 5.75935 5.83208 6.75926 5.13534 7.96335C4.4386 9.16745 4.07046 10.5335 4.06776 11.9246C4.06507 13.3158 4.42793 14.6832 5.12 15.89L4 20L8.2 18.9C9.35975 19.5452 10.6629 19.8891 11.99 19.9C14.0997 19.9001 16.124 19.0668 17.6222 17.5816C19.1205 16.0965 19.9715 14.0796 19.99 11.97C19.983 10.9173 19.7682 9.87634 19.3581 8.9068C18.948 7.93725 18.3505 7.05819 17.6 6.31999ZM12 18.53C10.8177 18.5308 9.65701 18.213 8.64 17.61L8.4 17.46L5.91 18.12L6.57 15.69L6.41 15.44C5.55925 14.0667 5.24174 12.429 5.51762 10.8372C5.7935 9.24545 6.64361 7.81015 7.9069 6.80322C9.1702 5.79628 10.7589 5.28765 12.3721 5.37368C13.9853 5.4597 15.511 6.13441 16.66 7.26999C17.916 8.49818 18.635 10.1735 18.66 11.93C18.6442 13.6859 17.9355 15.3645 16.6882 16.6006C15.441 17.8366 13.756 18.5301 12 18.53ZM15.61 13.59C15.41 13.49 14.44 13.01 14.26 12.95C14.08 12.89 13.94 12.85 13.81 13.05C13.6144 13.3181 13.404 13.5751 13.18 13.82C13.07 13.96 12.95 13.97 12.75 13.82C11.6097 13.3694 10.6597 12.5394 10.06 11.47C9.85 11.12 10.26 11.14 10.64 10.39C10.6681 10.3359 10.6827 10.2759 10.6827 10.215C10.6827 10.1541 10.6681 10.0941 10.64 10.04C10.64 9.93999 10.19 8.95999 10.03 8.56999C9.87 8.17999 9.71 8.23999 9.58 8.22999H9.19C9.08895 8.23154 8.9894 8.25465 8.898 8.29776C8.8066 8.34087 8.72546 8.403 8.66 8.47999C8.43562 8.69817 8.26061 8.96191 8.14676 9.25343C8.03291 9.54495 7.98287 9.85749 8 10.17C8.0627 10.9181 8.34443 11.6311 8.81 12.22C9.6622 13.4958 10.8301 14.5293 12.2 15.22C12.9185 15.6394 13.7535 15.8148 14.58 15.72C14.8552 15.6654 15.1159 15.5535 15.345 15.3915C15.5742 15.2296 15.7667 15.0212 15.91 14.78C16.0428 14.4856 16.0846 14.1583 16.03 13.84C15.94 13.74 15.81 13.69 15.61 13.59Z"/></svg>';
const ICON_SPARKLES = '<svg class="chip__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 14l.8 2.1L22 17l-2.2.9L19 20l-.8-2.1L16 17l2.2-.9L19 14z"/><path d="M5 14l.8 2.1L8 17l-2.2.9L5 20l-.8-2.1L2 17l2.2-.9L5 14z"/></svg>';
const ICON_DIAMOND = '<svg class="chip__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9l4-6z"/><path d="M2 9h20"/><path d="M9 3 8 9l4 12 4-12-1-6"/></svg>';
const ICON_PLAY = '<svg class="chip__icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l12-7z"/></svg>';
const ICON_PIN = '<svg class="inline-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s5-4.35 5-9a5 5 0 0 0-10 0c0 4.65 5 9 5 9z"/><circle cx="12" cy="12" r="1.8"/></svg>';
const ICON_ARROW = '<svg class="btn__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg>';
const ICON_CHAT = '<svg class="btn__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>';
const ICON_AUDIO_PLAY = '<svg class="btn__icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l12-7z"/></svg>';
const ICON_AUDIO_PAUSE = '<svg class="btn__icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7z"/><path d="M13 5h4v14h-4z"/></svg>';

/* WhatsApp da acompanhante (com mensagem contextual) */
function waPerfil(p, contexto) {
  const msg = contexto
    ? `Olá ${p.nome}! Vi seu anúncio na Aliança e tenho interesse em ${contexto}.`
    : `Olá ${p.nome}! Vi seu anúncio na Aliança e gostaria de saber mais.`;
  return `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(msg)}`;
}
/* WhatsApp do administrador (home / anuncie) */
function waAdmin(msg) {
  const t = msg || "Olá! Gostaria de informações sobre a Aliança.";
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(t)}`;
}

function formatWhatsappNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^55\d{11}$/.test(digits)) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return digits ? `+${digits}` : "";
}

/* Placeholder de foto elegante (SVG data URI) — funciona offline */
function foto(p, i = 0) {
  if (Array.isArray(p.fotos) && p.fotos[i]) return p.fotos[i];
  const hue = ((p.hue || 300) + i * 18) % 360;
  const inicial = p.nome.trim()[0].toUpperCase();
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='hsl(${hue},45%,22%)'/>
        <stop offset='1' stop-color='hsl(${(hue + 40) % 360},35%,8%)'/>
      </linearGradient>
      <radialGradient id='r' cx='50%' cy='35%' r='60%'>
        <stop offset='0' stop-color='hsla(${hue},60%,55%,.35)'/>
        <stop offset='1' stop-color='transparent'/>
      </radialGradient>
    </defs>
    <rect width='600' height='800' fill='url(#g)'/>
    <rect width='600' height='800' fill='url(#r)'/>
    <circle cx='300' cy='300' r='150' fill='none' stroke='hsla(344,70%,78%,.24)' stroke-width='1.5'/>
    <text x='300' y='350' font-family='Playfair Display,serif' font-size='200'
          fill='hsla(42,82%,86%,.56)' text-anchor='middle'>${inicial}</text>
    <text x='300' y='720' font-family='Inter,sans-serif' font-size='34' letter-spacing='6'
          fill='hsla(344,72%,86%,.72)' text-anchor='middle'>${p.nome.toUpperCase()}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

function cardResumo(p) {
  const raw = (p.descricao || p.desc || "").trim().replace(/\s+/g, " ");
  if (!raw) return "Perfil selecionado para quem busca presença, discrição e boa companhia.";
  return raw.length > 118 ? raw.slice(0, 115).trimEnd() + "..." : raw;
}

function perfilAudioUrl(p) {
  return (p && (p.audioUrl || p.audio || p.audio_url)) || "";
}

function storyCidadeSlug(s) {
  if (!s) return null;
  if (s.cidade) return s.cidade;
  const p = storyPerfil(s);
  return p ? p.cidade : null;
}

function storiesDaCidade(cidade) {
  return (window.STORIES || []).filter(s => storyCidadeSlug(s) === cidade);
}

function cidadesComConteudo() {
  return cidadesOrdenadas().filter(key => PERFIS.some(p => p.cidade === key));
}

/* ---------- Componentes ---------- */
function tagsHtml(p) {
  let t = "";
  if (p.nova)      t += `<span class="tag tag--nova">Nova</span>`;
  if (p.exclusiva) t += `<span class="tag tag--excl">Exclusiva</span>`;
  if (p.temVideo)  t += `<span class="tag tag--video">${ICON_PLAY}<span>Vídeo</span></span>`;
  return t;
}

function cardHtml(p, opts = {}) {
  const showCta = opts.showCta !== false;
  const showAudio = opts.showAudio !== false;
  const audio = perfilAudioUrl(p);
  return `
  <article class="card">
    <a class="card__media" href="${pathTo('/perfil/' + p.slug)}">
      <div class="card__tags">${tagsHtml(p)}</div>
      <img src="${foto(p)}" alt="${p.nome}" loading="lazy" />
      <div class="card__local">${localCurtoPerfil(p)}</div>
    </a>
    <div class="card__body">
      <a href="${pathTo('/perfil/' + p.slug)}"><h3 class="card__name">${p.nome}</h3></a>
      ${showAudio && audio ? `
      <div class="card__audio" data-card-audio="${p.slug}" data-audio-src="${audio}">
        <button class="card__audio-btn" type="button" aria-pressed="false" aria-label="Ouvir áudio do perfil ${p.nome}">
          <span class="card__audio-play" aria-hidden="true" data-card-audio-icon>${ICON_AUDIO_PLAY}</span>
          <span class="card__audio-copy">
            <span class="card__audio-label">Ouvir voz</span>
            <span class="card__audio-sub">áudio da acompanhante</span>
          </span>
        </button>
        <div class="card__audio-wave" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <span class="card__audio-time">Áudio</span>
      </div>` : ""}
      <p class="card__desc">${cardResumo(p)}</p>
      <div class="card__attrs">
        <span><b>${p.altura}</b> altura</span>
        <span><b>${p.idade}</b> anos</span>
        <span>MAN <b>${p.manequim}</b></span>
        ${p.possuiLocal ? `<span>${ICON_PIN}<b>Local</b></span>` : ""}
      </div>
      ${showCta ? `
      <div class="card__actions">
        <a class="btn btn--ghost btn--card" href="${pathTo('/perfil/' + p.slug)}">
          ${ICON_ARROW}<span>Abrir perfil</span>
        </a>
        <a class="btn btn--gold btn--card" href="${waPerfil(p)}" target="_blank" rel="noopener">
          ${ICON_CHAT}<span>Conversar</span>
        </a>
      </div>` : ""}
    </div>
  </article>`;
}

function gridHtml(list, opts = {}) {
  if (!list.length) return `<div class="empty">Nenhum perfil encontrado nesta seleção.</div>`;
  return `<div class="grid">${list.map(p => cardHtml(p, opts)).join("")}</div>`;
}

let activeCardAudio = null;
let activeCardAudioPlayer = null;

function resetCardAudio() {
  if (activeCardAudioPlayer) {
    activeCardAudioPlayer.pause();
    activeCardAudioPlayer.currentTime = 0;
    activeCardAudioPlayer = null;
  }
  if (activeCardAudio) {
    activeCardAudio.classList.remove("is-playing");
    const btn = $(".card__audio-btn", activeCardAudio);
    if (btn) {
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", `Ouvir áudio do perfil ${perfilBySlug(activeCardAudio.dataset.cardAudio)?.nome || "selecionado"}`);
      const icon = $("[data-card-audio-icon]", activeCardAudio);
      if (icon) icon.innerHTML = ICON_AUDIO_PLAY;
      const label = $(".card__audio-label", activeCardAudio);
      if (label) label.textContent = "Ouvir voz";
    }
  }
  activeCardAudio = null;
}

function toggleCardAudio(slug, btn) {
  const card = btn.closest(".card__audio");
  const p = perfilBySlug(slug);
  const src = perfilAudioUrl(p) || card?.dataset.audioSrc;
  if (!card || !p || !src) return;

  if (activeCardAudio === card) {
    resetCardAudio();
    return;
  }

  resetCardAudio();

  const audio = new Audio(src);
  audio.addEventListener("ended", () => {
    if (activeCardAudioPlayer === audio) resetCardAudio();
  });
  audio.addEventListener("error", () => {
    if (activeCardAudioPlayer === audio) resetCardAudio();
  });

  activeCardAudio = card;
  activeCardAudioPlayer = audio;
  card.classList.add("is-playing");
  btn.setAttribute("aria-pressed", "true");
  btn.setAttribute("aria-label", `Pausar áudio do perfil ${p.nome}`);
  const icon = $("[data-card-audio-icon]", card);
  if (icon) icon.innerHTML = ICON_AUDIO_PAUSE;
  const label = $(".card__audio-label", card);
  if (label) label.textContent = "Pausar áudio";
  audio.play().catch(() => {
    if (activeCardAudioPlayer === audio) resetCardAudio();
  });
}

document.addEventListener("click", e => {
  const btn = e.target.closest(".card__audio-btn");
  if (!btn) return;
  const wrap = btn.closest(".card__audio");
  if (!wrap) return;
  toggleCardAudio(wrap.dataset.cardAudio, btn);
});

window.addEventListener("popstate", resetCardAudio);

let metaPixelInitialized = false;

function initMetaPixel() {
  const id = String(window.META_PIXEL_ID || "").replace(/\D/g, "");
  if (!window.META_PIXEL_ENABLED || !id || metaPixelInitialized) return;

  (function(f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq("init", id);
  metaPixelInitialized = true;
}

function trackMetaPixel(eventName, params) {
  if (!metaPixelInitialized || !window.fbq) return;
  window.fbq("track", eventName, params || {});
}

/* Ordena: novidades e destaques primeiro */
const ordena = list => [...list].sort((a, b) =>
  (b.nova - a.nova) || (b.destaque - a.destaque) || (b.exclusiva - a.exclusiva));

/* ============================================================
   VIEWS
   ============================================================ */

/* Cartão de cidade da home/busca */
function cidadeCard(key) {
  const c = CIDADES[key];
  if (!c) return "";
  const n = PERFIS.filter(p => p.cidade === key).length;
  if (!n) return "";
  const info = n ? `${c.uf} • ${n} ${n === 1 ? "acompanhante" : "acompanhantes"}` : `${c.uf} • Em breve`;
  return `<a class="city-card${n ? "" : " city-card--soon"}" href="${pathTo('/cidade/' + key)}" data-nome="${(c.nome + " " + c.uf).toLowerCase()}">
    <span class="city-card__kicker">Cidade</span>
    <b>${c.nome}</b>
    <span class="city-card__info">${info}</span>
    <span class="city-card__badge">${n ? "Ativa" : "Em breve"}</span>
    <span class="city-card__arrow" aria-hidden="true">→</span>
  </a>`;
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const headerH = $(".header")?.offsetHeight || 0;
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerH - 12);
  window.scrollTo({ top, behavior: "smooth" });
}

/* Cidades ordenadas: as com mais perfis primeiro, depois alfabética */
function cidadesOrdenadas() {
  const cont = key => PERFIS.filter(p => p.cidade === key).length;
  return Object.keys(CIDADES || {}).sort((a, b) =>
    (cont(b) - cont(a)) || CIDADES[a].nome.localeCompare(CIDADES[b].nome, "pt-BR"));
}

/* Banner "3 garotas em destaque" — configurado no admin (window.BANNER) */
function bannerDestaqueHtml() {
  const b = window.BANNER;
  if (!b || !b.enabled || !Array.isArray(b.slots)) return "";
  const cards = b.slots.map((s, i) => {
    const perfil = s.perfilSlug ? perfilBySlug(s.perfilSlug) : null;
    const nome = s.nome || (perfil && perfil.nome) || "";
    const foto_ = s.foto || (perfil ? foto(perfil, 0) : "");
    const wa = (s.whatsapp || (perfil && perfil.whatsapp) || ADMIN_WHATSAPP || "").replace(/\D/g, "");
    if (!nome && !foto_) return "";
    const msg = `Olá ${nome || "!"}. Vi seu destaque na Aliança e gostaria de saber mais.`;
    const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}` : "#";
    const perfilHref = perfil ? pathTo(`/perfil/${perfil.slug}`) : "";
    const cidade = perfil ? (CIDADES[perfil.cidade]?.nome || "") : "";
    return `
      <article class="bnr__card bnr__card--pos${i + 1}">
        <a class="bnr__media" ${perfilHref ? `href="${perfilHref}"` : ""} aria-label="Ver ${nome}">
          ${foto_ ? `<img src="${foto_}" alt="${nome}" loading="lazy" />` : `<div class="bnr__media-empty"></div>`}
          <div class="bnr__scrim"></div>
          ${s.tag ? `<span class="bnr__tag">${s.tag}</span>` : ""}
          <div class="bnr__info">
            <h3>${nome}</h3>
            ${cidade ? `<p>${cidade}</p>` : ""}
          </div>
        </a>
      </article>`;
  }).join("");
  if (!cards.trim()) return "";
  return `
    <section class="bnr" aria-label="Garotas em destaque">
      <div class="container">
        <div class="bnr__head">
          ${b.titulo ? `<h2>${b.titulo}</h2>` : ""}
          ${b.subtitulo ? `<p>${b.subtitulo}</p>` : ""}
        </div>
        <div class="bnr__grid">${cards}</div>
      </div>
    </section>`;
}

/* Slides do hero a partir dos destaques (BANNER) */
function heroCarouselSlides() {
  const b = window.BANNER;
  if (!b || !b.enabled || !Array.isArray(b.slots)) return [];
  const isMobile = typeof window !== "undefined"
    && window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  return b.slots.map(s => {
    const perfil = s.perfilSlug ? perfilBySlug(s.perfilSlug) : null;
    const nome = s.nome || (perfil && perfil.nome) || "";
    const fotoDesktop = s.foto || (perfil ? foto(perfil, 0) : "");
    const fotoMobile  = s.fotoMobile || fotoDesktop;
    const foto_ = isMobile ? fotoMobile : fotoDesktop;
    const cidade = perfil ? (CIDADES[perfil.cidade]?.nome || "") : "";
    const href = perfil ? pathTo(`/perfil/${perfil.slug}`) : "";
    return { nome, foto: foto_, cidade, tag: s.tag || "", href };
  }).filter(s => s.foto && s.nome);
}


function viewHome() {
  updateHead({
    title: "Aliança Models — Acompanhantes de Luxo no Brasil",
    description: "Aliança Models: encontre acompanhantes de luxo, perfis verificados e contato direto com discrição em todo o Brasil.",
    image: SITE_ORIGIN + "/social-preview-national.png?v=1",
    path: "/",
    type: "website",
  });
  setJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Aliança",
    url: SITE_ORIGIN + "/",
    inLanguage: "pt-BR",
    description: "Acompanhantes de luxo, perfis verificados e contato direto em todo o Brasil.",
    audience: { "@type": "PeopleAudience", suggestedMinAge: 18 },
  });
  // Home: apenas Rio de Janeiro e Cuiabá (como era no começo)
  const HOME_CIDADES = ["rio-de-janeiro", "cuiaba"];
  const cidadesAtivas = HOME_CIDADES.filter(key => PERFIS.some(p => p.cidade === key)).length;
  const perfisAtivos = PERFIS.filter(p => HOME_CIDADES.includes(p.cidade)).length;
  const cardsCidades = cidadesComConteudo()
    .filter(key => HOME_CIDADES.includes(key))
    .map(cidadeCard).join("");

  const slides = heroCarouselSlides();
  const hasCarousel = slides.length >= 2;
  const firstImg = hasCarousel ? slides[0].foto : "instagram_post.webp?v=2";

  const slidesHtml = hasCarousel ? slides.map((s, i) => `
      <div class="hero__slide${i === 0 ? " is-active" : ""}" data-i="${i}" data-foto="${encodeURIComponent(s.foto)}" aria-hidden="${i === 0 ? "false" : "true"}"></div>
  `).join("") : "";

  const heroMiniRowHtml = "";


  const carouselChromeHtml = hasCarousel ? `
    <div class="hero__slides" aria-hidden="true">${slidesHtml}</div>
  ` : "";

  app.innerHTML = `
  <section class="hero hero--home${hasCarousel ? " hero--carousel" : ""}" style="--hero-image:url('${firstImg}')">
    ${carouselChromeHtml}
    <div class="hero__scrim" aria-hidden="true"></div>
    <div class="hero__layout">
      <div class="hero__content">
        ${heroMiniRowHtml}
        <div class="hero__bar">
          <div class="hero__bar-text">
            <h1>Acompanhantes de alto padrão no Brasil</h1>
            <p>Discrição absoluta. Contato direto. Momentos inesquecíveis.</p>
          </div>
          <button class="hero__bar-cta" type="button" id="hero-explore-cities" aria-label="Explorar cidades">
            <span>Explorar cidades</span>
            <span class="hero__bar-cta-ico" aria-hidden="true">${ICON_ARROW}</span>
          </button>
        </div>
      </div>
    </div>
  </section>

  ${hasCarousel ? "" : bannerDestaqueHtml()}

  ${storiesStripHtml({
    extraClass: "stories--home",
    limit: 3,
    showMore: true,
    title: "Stories em destaque",
    lead: "Toque em um perfil ou vá direto para as cidades",
    showMoreLabel: "Cidades",
    showMoreAria: "Ver cidades",
  })}

  <section class="section section--cities" id="sec-cidades">
    <div class="container">
      <div class="city-showcase">
        <div class="section__head city-showcase__head">
          <div>
            <h2>Escolha sua <span>cidade</span></h2>
            <p class="lead">Toque na sua cidade para ver as acompanhantes disponíveis</p>
          </div>
          <div class="city-showcase__stats" aria-label="Resumo da seleção">
            <span>${cidadesAtivas} cidades</span>
            <span>${perfisAtivos} perfis</span>
          </div>
        </div>
        <div class="city-showcase__grid" id="cidades-grid">${cardsCidades}</div>
      </div>
    </div>
  </section>

  `;

  initStoriesStrip();
  $("#hero-explore-cities")?.addEventListener("click", () => scrollToSection("sec-cidades"));
  if (hasCarousel) initHeroCarousel(slides);
}

function viewAcompanhantes() {
  const cidadesAtivas = cidadesComConteudo();
  updateHead({
    title: "Acompanhantes de Luxo no Brasil — Aliança Models",
    description: "Encontre acompanhantes de luxo em cidades atendidas pela Aliança Models. Veja perfis, fotos e informações para contato direto.",
    image: SITE_ORIGIN + "/social-preview-national.png?v=1",
    path: "/acompanhantes",
    type: "website",
  });
  setJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Acompanhantes de Luxo no Brasil",
    url: SITE_ORIGIN + "/acompanhantes",
    description: "Perfis de acompanhantes de luxo em cidades atendidas pela Aliança Models.",
    numberOfItems: PERFIS.length,
  });
  const cityLinks = cidadesAtivas.map(key => `<a class="pill" href="${pathTo('/cidade/' + key)}">Acompanhantes em ${CIDADES[key].nome}</a>`).join("");
  app.innerHTML = `<section class="page"><div class="container"><div class="section__head"><p class="hero__eyebrow">Aliança Models</p><h1>Acompanhantes de luxo no Brasil</h1><p class="lead">Encontre perfis verificados, fotos e contato direto com discrição. A disponibilidade varia conforme a cidade.</p></div><div class="chips chips--rail">${cityLinks}</div>${gridHtml(ordena(PERFIS))}</div></section>`;
}

/* Rotaciona slides do hero + preview "a seguir" com temporizador */
function initHeroCarousel(slides) {
  const DUR = 5200; // ms por slide
  const heroEl = document.querySelector(".hero--carousel");
  if (!heroEl) return;
  const slideEls = [...heroEl.querySelectorAll(".hero__slide")];
  slideEls.forEach(el => {
    const foto = decodeURIComponent(el.dataset.foto || "");
    if (foto) el.style.backgroundImage = `url("${foto.replace(/"/g,'%22')}")`;
  });


  let idx = 0, timer = null;

  function render() {
    const cur = slides[idx];
    slideEls.forEach((el, i) => el.classList.toggle("is-active", i === idx));
    heroEl.style.setProperty("--hero-image", `url('${cur.foto}')`);
  }
  function advance() { idx = (idx + 1) % slides.length; render(); }
  function start() { stop(); timer = setInterval(advance, DUR); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else start();
  });

  render();
  start();
}


function viewCidade(cidade, filtro) {
  const c = CIDADES[cidade];
  if (!c) return view404();

  const cidadeTotal = PERFIS.filter(x => x.cidade === cidade).length;
  if (!cidadeTotal) return view404();
  const routePathCidade = filtro?.tipo === "bairro"
    ? `/cidade/${cidade}/bairro/${filtro.valor}`
    : filtro?.tipo
      ? `/cidade/${cidade}/${filtro.tipo}`
      : `/cidade/${cidade}`;
  const filtroLabel = filtro?.tipo === "bairro"
    ? bairroNome(cidade, filtro.valor)
    : filtro?.tipo === "novidades" ? "Novidades"
    : filtro?.tipo === "exclusivas" ? "Exclusivas"
    : filtro?.tipo === "videos" ? "Vídeos" : "";
  const tituloHead = filtroLabel
    ? `${filtroLabel} em ${c.nome} — Acompanhantes • Aliança`
    : `Acompanhantes em ${c.nome} (${c.uf}) — Aliança`;
  updateHead({
    title: tituloHead,
    description: `${cidadeTotal} perfis verificados em ${c.nome} (${c.uf}). Encontre acompanhantes por bairro, novidades e exclusivas com total discrição.`,
    image: SITE_ORIGIN + "/logo.png",
    path: routePathCidade,
    type: "website",
  });
  setJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: tituloHead,
    url: SITE_ORIGIN + routePathCidade,
    inLanguage: "pt-BR",
    about: { "@type": "City", name: c.nome, addressRegion: c.uf, addressCountry: "BR" },
    numberOfItems: cidadeTotal,
  });


  let list = PERFIS.filter(p => p.cidade === cidade);
  let titulo = c.nome, sub = `${list.length} acompanhantes em ${c.nome} (${c.uf})`;
  const total = list.length;
  const filtroAtual = !filtro
    ? "Todos"
    : filtro.tipo === "novidades"
      ? "Novidades"
      : filtro.tipo === "exclusivas"
        ? "Exclusivas"
        : filtro.tipo === "videos"
          ? "Vídeos"
          : bairroNome(cidade, filtro.valor);

  if (filtro?.tipo === "bairro") {
    list = list.filter(p => p.bairro === filtro.valor);
    titulo = bairroNome(cidade, filtro.valor);
    sub = `Acompanhantes em ${titulo} • ${c.nome}`;
  } else if (filtro?.tipo === "novidades") {
    list = list.filter(p => p.nova); titulo = "Novidades " + c.uf; sub = "Perfis recém-chegados";
  } else if (filtro?.tipo === "exclusivas") {
    list = list.filter(p => p.exclusiva); titulo = "Exclusivas " + c.uf; sub = "Seleção premium";
  } else if (filtro?.tipo === "videos") {
    list = list.filter(p => p.temVideo); titulo = "Vídeos " + c.uf; sub = "Perfis com vídeo";
  }

  const chips = c.bairros.map(b =>
    `<a class="chip${filtro?.valor === b.slug ? " active" : ""}" href="${pathTo('/cidade/' + cidade + '/bairro/' + b.slug)}">${b.nome}</a>`
  ).join("");
  const resultados = ordena(list);
  const filterChips = [
    `<a class="chip${!filtro ? " active" : ""}" href="${pathTo('/cidade/' + cidade)}">Todos</a>`,
    `<a class="chip${filtro?.tipo === "novidades" ? " active" : ""}" href="${pathTo('/cidade/' + cidade + '/novidades')}">${ICON_SPARKLES}<span>Novidades</span></a>`,
    `<a class="chip${filtro?.tipo === "exclusivas" ? " active" : ""}" href="${pathTo('/cidade/' + cidade + '/exclusivas')}">${ICON_DIAMOND}<span>Exclusivas</span></a>`,
    `<a class="chip${filtro?.tipo === "videos" ? " active" : ""}" href="${pathTo('/cidade/' + cidade + '/videos')}">${ICON_PLAY}<span>Vídeos</span></a>`,
  ].join("");

  app.innerHTML = `
  <section class="page page--cidade">
    <div class="container">
      <a class="back-link" href="${pathTo('/')}">‹ Início</a>
      ${storiesStripHtml({ cidade })}
      <div class="page-divider" aria-hidden="true"></div>
      <header class="cidade-hero">
        <div class="cidade-hero__title">
          <h1>${titulo} <span>${c.uf}</span></h1>
          <p class="lead">${sub}</p>
        </div>
        <div class="cidade-hero__meta">${total} perfis • ${c.bairros.length} bairros • ${filtroAtual}</div>
      </header>

      <div class="filtros filtros--cidade">
        <div class="filtros__row filtros__row--search">
          <div class="search search--city">
            <span class="search__ico" aria-hidden="true"></span>
            <input id="busca" type="text" placeholder="Buscar por nome..." />
          </div>
        </div>

        <div class="filtros__row filtros__row--compact">
          <span class="filtros__label">Perfis</span>
          <div class="chips chips--rail">
            ${filterChips}
          </div>
        </div>

        ${c.bairros.length ? `
        <div class="filtros__row filtros__row--compact">
          <span class="filtros__label">Bairros</span>
          <div class="chips chips--rail">${chips}</div>
        </div>` : ""}
      </div>

      <div class="resultados-meta">${resultados.length} perfis encontrados</div>
      <div id="resultados">${gridHtml(resultados)}</div>
    </div>
  </section>`;

  initStoriesStrip();

  const busca = $("#busca");
  busca?.addEventListener("input", () => {
    const q = busca.value.trim().toLowerCase();
    const f = ordena(list.filter(p => p.nome.toLowerCase().includes(q)));
    $("#resultados").innerHTML = gridHtml(f);
  });
}

function viewPerfil(slug) {
  const p = perfilBySlug(slug);
  if (!p) return view404();
  const c = CIDADES[p.cidade];

  const perfilFoto = (Array.isArray(p.fotos) && p.fotos[0]) ? p.fotos[0] : (SITE_ORIGIN + "/logo.png");
  const perfilDesc = (p.descricao || "").trim().replace(/\s+/g, " ").slice(0, 155)
    || `${p.nome}, acompanhante em ${c?.nome || p.cidade}. Total discrição. Contato direto pelo WhatsApp.`;
  updateHead({
    title: `${p.nome} — Acompanhante em ${c?.nome || p.cidade} • Aliança`,
    description: perfilDesc,
    image: perfilFoto.startsWith("http") ? perfilFoto : SITE_ORIGIN + perfilFoto,
    path: `/perfil/${p.slug}`,
    type: "profile",
  });
  setJsonLd({
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.nome,
    url: SITE_ORIGIN + `/perfil/${p.slug}`,
    image: perfilFoto.startsWith("http") ? perfilFoto : SITE_ORIGIN + perfilFoto,
    address: c ? { "@type": "PostalAddress", addressLocality: c.nome, addressRegion: c.uf, addressCountry: "BR" } : undefined,
    description: perfilDesc,
  });


  const fotos = [0, 1, 2, 3].map(i => foto(p, i));
  const galeria = `
    <button class="profile__photo profile__photo--hero lb-trigger" type="button" data-i="0" aria-label="Abrir foto principal de ${p.nome}">
      <img src="${fotos[0]}" alt="${p.nome} foto principal" loading="eager" />
      <span class="profile__photo-fade" aria-hidden="true"></span>
      <span class="profile__photo-count" aria-hidden="true">4 fotos</span>
    </button>
    <div class="profile__thumbs" aria-label="Miniaturas do perfil">
      ${fotos.slice(1).map((src, i) => `
        <button class="profile__photo profile__photo--thumb lb-trigger" type="button" data-i="${i + 1}" aria-label="Abrir foto ${i + 2} de ${p.nome}">
          <img src="${src}" alt="${p.nome} ${i + 2}" loading="lazy" />
        </button>
      `).join("")}
    </div>`;

  const servicos = p.servicos.map(s =>
    `<a class="pill" href="${waPerfil(p, s)}" target="_blank" rel="noopener">${s}</a>`
  ).join("");

  const atendimento = p.atendimento.map(a => `<span class="pill">${a}</span>`).join("");

  const valores = [
    { t: "1 hora", v: p.valorHora || "Sob consulta" },
    { t: "2 horas", v: "Sob consulta" },
    { t: "Pernoite", v: "Sob consulta" },
    { t: "Viagem / Diária", v: "Sob consulta" },
  ].map(r => `
    <div class="rate">
      <div><b>${r.t}</b> <small>— ${r.v}</small></div>
      <a class="btn btn--gold" href="${waPerfil(p, r.t)}" target="_blank" rel="noopener">Reservar</a>
    </div>`).join("");

  app.innerHTML = `
  <section class="profile container">
    <a class="back-link" href="${pathTo('/cidade/' + p.cidade)}">‹ Voltar para ${c.nome}</a>

    <div class="profile__top">
      <div class="profile__gallery">${galeria}</div>

      <div class="profile__info">
        <h1>${p.nome}</h1>
        <div class="profile__loc">${[bairroNome(p.cidade, p.bairro), `${c.nome} ${c.uf}`].filter(Boolean).join(" • ")}</div>
        <div class="profile__badges">${tagsHtml(p) || ""}${p.possuiLocal ? `<span class="tag tag--excl">Possui Local</span>` : ""}</div>

        <div class="profile__actions profile__actions--top">
          <a class="btn btn--wa btn--lg" href="${waPerfil(p)}" target="_blank" rel="noopener">${WA_ICON} Consultar</a>
          <a class="btn btn--ghost btn--lg" href="${waPerfil(p, "agendar um horário")}" target="_blank" rel="noopener">Agendar</a>
        </div>

        ${perfilAudioUrl(p) ? `
        <div class="profile__voice">
          <div class="card__audio" data-card-audio="${p.slug}" data-audio-src="${perfilAudioUrl(p)}">
            <button class="card__audio-btn" type="button" aria-pressed="false" aria-label="Ouvir áudio do perfil ${p.nome}">
              <span class="card__audio-play" aria-hidden="true" data-card-audio-icon>${ICON_AUDIO_PLAY}</span>
              <span class="card__audio-copy">
                <span class="card__audio-label">Ouvir voz</span>
                <span class="card__audio-sub">áudio da acompanhante</span>
              </span>
            </button>
            <div class="card__audio-wave" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <span class="card__audio-time">Áudio</span>
          </div>
        </div>` : ""}

        <p class="profile__desc">${p.descricao}</p>

        <div class="spec">
          <div><span>Idade</span><b>${p.idade} anos</b></div>
          <div><span>Altura</span><b>${p.altura}</b></div>
          <div><span>Manequim</span><b>${p.manequim}</b></div>
          <div><span>Medidas</span><b>${p.medidas}</b></div>
          ${p.corOlhos ? `<div><span>Olhos</span><b>${p.corOlhos}</b></div>` : ""}
          ${p.corPele ? `<div><span>Pele</span><b>${p.corPele}</b></div>` : ""}
          ${p.corCabelo ? `<div><span>Cabelo</span><b>${p.corCabelo}</b></div>` : ""}
          <div><span>Idiomas</span><b>${(p.idiomas || ["Português"]).join(", ")}</b></div>
          <div><span>Horário</span><b>${p.horario}</b></div>
          <div><span>Local p/ atendimento</span><b>${p.possuiLocal ? "Sim" : "Não"}</b></div>
        </div>

      </div>
    </div>

    <div class="block">
      <h3>Serviços</h3>
      <div class="pill-list">${servicos}</div>
    </div>

    <div class="block">
      <h3>Atendimento</h3>
      <div class="pill-list">${atendimento}</div>
    </div>

    <div class="block">
      <h3>Valores</h3>
      <div class="rates">${valores}</div>
      <p style="color:var(--muted);font-size:.82rem;margin-top:1rem">
        Valores e disponibilidade confirmados diretamente pelo WhatsApp. Total discrição.
      </p>
    </div>
  </section>`;

  // Lightbox
  $$(".lb-trigger").forEach(node =>
    node.addEventListener("click", () => openLightbox(fotos, +node.dataset.i)));
}

function viewAnuncie() {
  updateHead({
    title: "Anuncie na Aliança — Cadastro de Acompanhantes",
    description: "Cadastre-se para anunciar como acompanhante na Aliança. Sigilo total, análise manual, resposta direta pela central.",
    path: "/anuncie",
    type: "website",
  });
  setJsonLd(null);
  app.innerHTML = `
  <section class="page page--signup">
    <div class="container signup">
      <a class="back-link" href="${pathTo('/')}">‹ Início</a>
      <div class="signup__hero">
        <span>Cadastro de anunciante</span>
        <h1>Anuncie com discrição</h1>
        <p>Envie seus dados para análise. A central recebe tudo no WhatsApp com a mensagem pronta.</p>
        <div class="signup__proofs">
          <span>Sigilo total</span>
          <span>Análise manual</span>
          <span>Resposta direta</span>
        </div>
      </div>

      <form class="form" id="form-anuncie" novalidate>
        <div class="form__step">
          <span>01</span>
          <div>
            <b>Identificação</b>
            <small>Nome, cidade e contato para retorno.</small>
          </div>
        </div>

        <div class="form__field">
          <label>Nome artístico <span class="req">*</span></label>
          <input name="nome" required placeholder="Ex: Luna Sophie" autocomplete="name" />
        </div>

        <div class="row">
          <div class="form__field">
            <label>Cidade <span class="req">*</span></label>
            <select name="cidade" id="sel-cidade" required>
              <option value="">Selecione a cidade</option>
              ${Object.keys(CIDADES).map(k => `<option value="${k}">${CIDADES[k].nome} — ${CIDADES[k].uf}</option>`).join("")}
            </select>
          </div>
          <div class="form__field">
            <label>Bairro</label>
            <select name="bairro" id="sel-bairro" disabled><option value="">Selecione a cidade primeiro</option></select>
          </div>
        </div>

        <div class="row">
          <div class="form__field">
            <label>Idade <span class="req">*</span></label>
            <input name="idade" type="number" min="18" required placeholder="18" />
          </div>
          <div class="form__field">
            <label>Seu WhatsApp <span class="req">*</span></label>
            <input name="whats" required placeholder="(00) 00000-0000" inputmode="tel" autocomplete="tel" />
          </div>
        </div>

        <div class="form__step">
          <span>02</span>
          <div>
            <b>Apresentação</b>
            <small>Texto curto para entendermos o perfil.</small>
          </div>
        </div>

        <div class="form__field">
          <label>Descrição / apresentação</label>
          <textarea name="desc" placeholder="Conte um pouco sobre você, serviços, preferências de atendimento..."></textarea>
        </div>

        <div class="form__actions">
          <button class="btn btn--wa btn--lg" type="submit">
            ${WA_ICON} Enviar pelo WhatsApp
          </button>
          <p class="form__note">O envio abre uma conversa com a central. Nenhum dado fica publicado automaticamente.</p>
        </div>
      </form>
    </div>
  </section>`;

  const selCidade = $("#sel-cidade"), selBairro = $("#sel-bairro");
  selCidade.addEventListener("change", () => {
    const c = CIDADES[selCidade.value];
    selBairro.disabled = !c;
    selBairro.innerHTML = !c
      ? `<option value="">Selecione a cidade primeiro</option>`
      : (c.bairros && c.bairros.length
          ? `<option value="">Selecione o bairro</option>` + c.bairros.map(b => `<option value="${b.slug}">${b.nome}</option>`).join("")
          : `<option value="">Sem bairros cadastrados</option>`);
  });

  const form = $("#form-anuncie");
  const whatsInput = form.whats;
  whatsInput.addEventListener("input", () => {
    const n = whatsInput.value.replace(/\D/g, "").slice(0, 11);
    whatsInput.value = n.length > 10
      ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
      : n.length > 6
        ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
        : n.length > 2
          ? `(${n.slice(0, 2)}) ${n.slice(2)}`
          : n;
    whatsInput.closest(".form__field")?.classList.remove("is-invalid");
  });
  $$("input, select, textarea", form).forEach(el =>
    el.addEventListener("input", () => el.closest(".form__field")?.classList.remove("is-invalid")));

  form.addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    const required = [f.nome, f.cidade, f.idade, f.whats];
    const firstInvalid = required.find(el => !String(el.value || "").trim());
    $$(".form__field", f).forEach(field => field.classList.remove("is-invalid"));
    if (firstInvalid) {
      firstInvalid.closest(".form__field")?.classList.add("is-invalid");
      firstInvalid.focus();
      return;
    }
    const cidadeNome = CIDADES[f.cidade.value]?.nome || f.cidade.value;
    const bairroN = f.bairro.value ? bairroNome(f.cidade.value, f.bairro.value) : "-";
    const msg =
`*Novo anúncio — Aliança*
Nome: ${f.nome.value}
Cidade: ${cidadeNome}
Bairro: ${bairroN}
Idade: ${f.idade.value}
WhatsApp: ${f.whats.value}
Descrição: ${f.desc.value || "-"}`;
    trackMetaPixel("Lead", { content_name: "Anuncie aqui" });
    window.open(waAdmin(msg), "_blank", "noopener");
  });
}

function viewInformacoes() {
  updateHead({
    title: "Informações & Privacidade — Aliança",
    description: "Política de privacidade (LGPD), natureza do serviço e informações legais da Aliança. Conteúdo destinado a maiores de 18 anos.",
    path: "/informacoes",
    type: "website",
  });
  setJsonLd(null);
  app.innerHTML = `
  <section class="page">
    <div class="container">
      <a class="back-link" href="${pathTo('/')}">‹ Início</a>
      <h1>Informações &amp; Política</h1>

      <h2>Conteúdo adulto (+18)</h2>
      <p>Este site é destinado a maiores de 18 anos e contém conteúdo adulto.
         Ao acessar, você confirma ter 18 anos ou mais.</p>

      <h2>Natureza do serviço</h2>
      <p>A Aliança é uma plataforma de publicidade. Não intermediamos negociações,
         não cobramos comissões e não nos responsabilizamos por acordos entre as
         partes. Cada anunciante é responsável pelo conteúdo do seu próprio perfil.</p>

      <h2>Privacidade (LGPD)</h2>
      <p>Seguimos a Lei Geral de Proteção de Dados (LGPD). Não exigimos cadastro de visitantes.
         Para segurança, prevenção a fraudes e auditoria, registramos IP, data, dispositivo e
         páginas acessadas por até 90 dias. A confirmação de idade fica salva apenas no seu
         navegador. O contato é feito diretamente pelo WhatsApp.</p>

      <h2>Discrição</h2>
      <p>Não divulgamos endereços exatos, apenas cidade e bairro.
         Os contatos são tratados com sigilo.</p>

      <h2>Contato</h2>
      <div class="info-contacts" aria-label="Contatos oficiais da Aliança">
        <p class="info-contact-row"><span>Suporte às modelos:</span><a class="wa-phone-link" href="https://wa.me/${INFO_MODEL_SUPPORT_WHATSAPP}" target="_blank" rel="noopener" aria-label="Abrir conversa com o suporte às modelos no WhatsApp">${formatWhatsappNumber(INFO_MODEL_SUPPORT_WHATSAPP)}</a></p>
        <p class="info-contact-row"><span>Contato de clientes:</span><a class="wa-phone-link" href="https://wa.me/${INFO_CLIENT_CONTACT_WHATSAPP}?text=${encodeURIComponent("Olá! Gostaria de informações sobre a Aliança.")}" target="_blank" rel="noopener" aria-label="Abrir conversa com o atendimento a clientes no WhatsApp">${formatWhatsappNumber(INFO_CLIENT_CONTACT_WHATSAPP)}</a></p>
      </div>
    </div>
  </section>`;
}

function renderLegalPage({ title, eyebrow, description, path, content }) {
  updateHead({ title: `${title} — Aliança`, description, path, type: "article" });
  setJsonLd(null);
  app.innerHTML = `
  <section class="page legal-page">
    <div class="container legal-page__container">
      <a class="back-link" href="${pathTo('/')}">‹ Início</a>
      <article class="legal-card">
        <header class="legal-card__header">
          <span class="legal-card__eyebrow">${eyebrow}</span>
          <h1>${title}</h1>
          <p class="legal-card__updated">Última atualização: 12 de agosto de 2026</p>
        </header>
        <div class="legal-card__content">${content}</div>
      </article>
    </div>
  </section>`;
}

function viewTermosDeUso() {
  renderLegalPage({
    title: "Termos de Uso",
    eyebrow: "Aliança",
    description: "Termos de Uso da plataforma Aliança Models.",
    path: "/termos-de-uso",
    content: `
      <p>Bem-vindo à <strong>Aliança Models</strong>. Estes Termos de Uso regulam o acesso, a navegação e a utilização da plataforma Aliança Models por visitantes, usuários, clientes e modelos cadastradas.</p>
      <p>Ao acessar ou utilizar a plataforma, você declara que leu, compreendeu e concorda integralmente com estes Termos de Uso e com a <a href="${pathTo('/politicas-privacidade')}">Política de Privacidade da Aliança Models</a>.</p>

      <h2>1. Identificação da Plataforma</h2>
      <p>A plataforma <strong>Aliança Models</strong>, inscrita no CNPJ nº 68.528.057/0001-00, tem sede no CEP 22631-280, Avenida Gastão Senges, nº 395, Barra da Tijuca, Rio de Janeiro — RJ.</p>
      <p>Para dúvidas relacionadas ao funcionamento da plataforma, entre em contato pelo e-mail: <a href="mailto:contato@aliancamodels.com">contato@aliancamodels.com</a>.</p>

      <h2>2. Objeto da Plataforma</h2>
      <p>A Aliança Models é uma plataforma digital destinada à divulgação de perfis de modelos acompanhantes e à facilitação do contato entre usuários interessados e modelos cadastradas.</p>
      <p>A plataforma <strong>não presta serviços de acompanhamento, não intermedeia negociações privadas, não define valores cobrados pelas modelos e não participa de encontros, pagamentos ou contratos celebrados entre usuários e modelos.</strong></p>

      <h2>3. Requisitos para Utilização</h2>
      <p>O acesso e a utilização da plataforma são permitidos apenas para pessoas com <strong>18 (dezoito) anos ou mais</strong>.</p>
      <p>Ao utilizar o site, o usuário declara possuir capacidade civil para celebrar contratos e utilizar os serviços disponibilizados.</p>
      <p>É expressamente proibido:</p>
      <ul><li>Cadastrar menores de idade;</li><li>Utilizar dados falsos ou de terceiros;</li><li>Utilizar imagens sem autorização;</li><li>Criar perfis fraudulentos;</li><li>Praticar qualquer atividade ilícita por meio da plataforma.</li></ul>

      <h2>4. Cadastro e Verificação de Modelos</h2>
      <p>Para criar um perfil na Aliança Models, a modelo deverá fornecer informações verdadeiras, completas e atualizadas.</p>
      <p>A plataforma poderá solicitar, a qualquer momento, documentos e procedimentos de verificação, incluindo:</p>
      <ul><li>Documento oficial com foto;</li><li>Fotografia segurando o documento;</li><li>Vídeo de verificação;</li><li>Confirmação de maioridade;</li><li>Outros elementos necessários para validação da identidade.</li></ul>
      <p>A Aliança Models poderá recusar, suspender ou remover cadastros que apresentem inconsistências, indícios de fraude ou violação destes Termos.</p>

      <h2>5. Categorias de Perfis</h2>
      <h3>Perfil Exclusivo</h3>
      <p>Destinado a modelos que optarem por manter divulgação exclusivamente na Aliança Models, observadas as condições específicas eventualmente contratadas.</p>
      <h3>Perfil Aliança</h3>
      <p>Destinado a modelos que poderão anunciar também em outras plataformas, conforme as regras vigentes da Aliança Models.</p>
      <p>Os benefícios, critérios, posicionamento e condições comerciais de cada categoria poderão ser alterados mediante atualização destes Termos ou dos planos disponibilizados.</p>

      <h2>6. Responsabilidades das Modelos</h2>
      <p>Ao utilizar a plataforma, a modelo declara e garante que:</p>
      <ul><li>Possui 18 anos ou mais;</li><li>É a legítima titular das imagens, vídeos e conteúdos publicados;</li><li>Possui autorização para utilização de todo o material enviado;</li><li>Manterá suas informações atualizadas;</li><li>Responderá integralmente pelas informações divulgadas em seu perfil;</li><li>Cumprirá a legislação brasileira aplicável.</li></ul>
      <p>É proibido utilizar imagens de terceiros, documentos falsificados, informações enganosas ou qualquer conteúdo que viole direitos de terceiros.</p>

      <h2>7. Responsabilidades dos Usuários</h2>
      <p>Os usuários comprometem-se a utilizar a plataforma de forma ética, respeitosa e em conformidade com a legislação vigente.</p>
      <p>É proibido:</p>
      <ul><li>Praticar assédio, ameaças ou perseguição;</li><li>Divulgar dados pessoais de terceiros;</li><li>Tentar obter acesso indevido a contas ou sistemas;</li><li>Utilizar a plataforma para atividades ilegais;</li><li>Copiar, reproduzir ou distribuir conteúdo das modelos sem autorização.</li></ul>

      <h2>8. Conteúdo Publicado</h2>
      <p>A modelo permanece titular dos direitos sobre as fotografias, vídeos, descrições e demais conteúdos enviados.</p>
      <p>Ao publicar conteúdo na plataforma, a modelo concede à Aliança Models autorização para hospedar, reproduzir, exibir, organizar e disponibilizar esse conteúdo dentro das funcionalidades do site enquanto o perfil permanecer ativo.</p>
      <p>A plataforma poderá remover conteúdos que violem estes Termos, direitos de terceiros, normas legais ou políticas internas.</p>

      <h2>9. Planos, Anúncios e Pagamentos</h2>
      <p>A Aliança Models poderá oferecer serviços pagos, incluindo:</p>
      <ul><li>Anúncios;</li><li>Planos de assinatura;</li><li>Destaque de perfis;</li><li>Funcionalidades premium;</li><li>Serviços adicionais.</li></ul>
      <p>Os valores, prazos e condições de cada plano serão informados previamente na plataforma. Os pagamentos poderão ser processados por empresas terceirizadas especializadas em meios de pagamento.</p>

      <h2>10. Cancelamento e Remoção de Perfis</h2>
      <p>A modelo poderá solicitar a exclusão de seu perfil a qualquer momento, observadas eventuais obrigações contratuais vigentes.</p>
      <p>A Aliança Models poderá remover ou suspender perfis, temporária ou permanentemente, quando houver:</p>
      <ul><li>Violação destes Termos;</li><li>Uso de documentos falsos;</li><li>Utilização de imagens sem autorização;</li><li>Tentativa de cadastro de menor de idade;</li><li>Fraude;</li><li>Atividade ilícita;</li><li>Comportamento que coloque em risco a plataforma, usuários ou modelos.</li></ul>

      <h2>11. Limitação de Responsabilidade</h2>
      <p>A Aliança Models atua exclusivamente como plataforma de divulgação e contato.</p>
      <p>A plataforma <strong>não garante</strong>:</p>
      <ul><li>A realização de encontros;</li><li>A disponibilidade das modelos;</li><li>A veracidade de todas as informações fornecidas por usuários;</li><li>A conclusão de negociações;</li><li>A qualidade de serviços eventualmente prestados entre as partes.</li></ul>
      <p>A Aliança Models não se responsabiliza por pagamentos realizados entre usuários e modelos, encontros presenciais, perdas financeiras, danos decorrentes de negociações privadas ou comportamentos praticados fora da plataforma.</p>

      <h2>12. Segurança da Plataforma</h2>
      <p>A Aliança Models adota medidas de segurança compatíveis com padrões de mercado para proteção da plataforma e dos dados dos usuários. Entretanto, nenhum sistema é absolutamente imune a falhas, ataques ou interrupções, motivo pelo qual a plataforma não garante disponibilidade contínua e ininterrupta.</p>

      <h2>13. Propriedade Intelectual</h2>
      <p>A marca <strong>Aliança Models</strong>, logotipo, identidade visual, layout, software, textos institucionais, banco de dados e demais elementos da plataforma são protegidos pela legislação de propriedade intelectual.</p>
      <p>É proibida a reprodução, distribuição, modificação ou utilização sem autorização prévia e expressa da empresa.</p>

      <h2>14. Privacidade e Proteção de Dados</h2>
      <p>O tratamento de dados pessoais é realizado conforme a <a href="${pathTo('/politicas-privacidade')}">Política de Privacidade da Aliança Models</a>, que integra estes Termos de Uso para todos os fins.</p>

      <h2>15. Alterações dos Termos</h2>
      <p>A Aliança Models poderá alterar estes Termos de Uso a qualquer momento. A versão atualizada será disponibilizada no site com indicação da data de revisão.</p>
      <p>A continuidade da utilização da plataforma após alterações constitui aceitação dos novos Termos.</p>

      <h2>16. Legislação Aplicável e Foro</h2>
      <p>Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.</p>
      <p>Fica eleito o foro da comarca da cidade onde estiver sediada a empresa responsável pela Aliança Models para resolver quaisquer conflitos ou controvérsias relacionados à utilização da plataforma, observadas as disposições legais aplicáveis.</p>
      <p>Essa cláusula não limita os direitos garantidos por lei aos usuários e consumidores, quando aplicável, mas estabelece que eventuais disputas relacionadas ao funcionamento da plataforma serão tratadas de acordo com a legislação brasileira e, preferencialmente, na comarca da sede da empresa.</p>

      <h2>17. Contato</h2>
      <address><strong>Aliança Models</strong><br>CNPJ: 68.528.057/0001-00<br>E-mail: <a href="mailto:contato@aliancamodels.com">contato@aliancamodels.com</a><br>Suporte às modelos: <a href="https://wa.me/${MODEL_SUPPORT_WHATSAPP}" target="_blank" rel="noopener">${formatWhatsappNumber(MODEL_SUPPORT_WHATSAPP)}</a><br>Endereço: CEP 22631-280, Avenida Gastão Senges, nº 395, Barra da Tijuca, Rio de Janeiro — RJ.</address>
    `,
  });
}

function viewPoliticaPrivacidade() {
  renderLegalPage({
    title: "Política de Privacidade",
    eyebrow: "Aliança · LGPD",
    description: "Política de Privacidade e proteção de dados da Aliança Models.",
    path: "/politicas-privacidade",
    content: `
      <p>A Aliança Models respeita a sua privacidade e está comprometida com a proteção dos dados pessoais de todos os usuários, visitantes, clientes e modelos cadastradas na plataforma. Esta Política de Privacidade explica como coletamos, utilizamos, armazenamos, compartilhamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</p>
      <p>Ao acessar ou utilizar o site da Aliança Models, você declara estar ciente desta Política de Privacidade.</p>

      <h2>1. Quem somos</h2>
      <p>A plataforma <strong>Aliança Models</strong>, inscrita no CNPJ sob o nº 68.528.057/0001-00, com sede no CEP 22631-280, Avenida Gastão Senges, nº 395, Barra da Tijuca, Rio de Janeiro — RJ, é responsável pelo tratamento dos dados pessoais coletados por meio deste site.</p>
      <p>Em caso de dúvidas, solicitações ou exercício de direitos relacionados aos seus dados pessoais, entre em contato pelo e-mail: <a href="mailto:contato@aliancamodels.com">contato@aliancamodels.com</a>.</p>

      <h2>2. Dados que coletamos</h2>
      <p>Podemos coletar diferentes categorias de dados pessoais, conforme a forma de utilização da plataforma.</p>
      <h3>2.1 Dados fornecidos pelo usuário</h3>
      <p>Quando você cria uma conta, entra em contato conosco ou utiliza nossos serviços, podemos coletar:</p>
      <ul><li>Nome ou nome de exibição;</li><li>Endereço de e-mail;</li><li>Número de telefone;</li><li>Cidade e estado;</li><li>Informações de perfil;</li><li>Fotografias, vídeos e demais conteúdos enviados para publicação;</li><li>Documentos de identificação enviados para verificação de cadastro, quando aplicável;</li><li>Dados necessários para pagamentos, assinaturas ou contratação de serviços.</li></ul>
      <h3>2.2 Dados coletados automaticamente</h3>
      <p>Durante a navegação, poderemos coletar automaticamente:</p>
      <ul><li>Endereço IP;</li><li>Data e hora de acesso;</li><li>Tipo de navegador e dispositivo;</li><li>Sistema operacional;</li><li>Páginas acessadas;</li><li>Tempo de permanência;</li><li>Cookies e tecnologias semelhantes.</li></ul>

      <h2>3. Finalidade do tratamento dos dados</h2>
      <p>Os dados pessoais são utilizados para:</p>
      <ul><li>Criar e gerenciar contas de usuários e modelos;</li><li>Realizar verificação de identidade e segurança da plataforma;</li><li>Disponibilizar perfis e funcionalidades do site;</li><li>Processar pagamentos e assinaturas;</li><li>Entrar em contato com usuários e modelos;</li><li>Prestar suporte ao cliente;</li><li>Prevenir fraudes, abusos e atividades ilícitas;</li><li>Cumprir obrigações legais e regulatórias;</li><li>Melhorar a experiência de navegação e os serviços oferecidos.</li></ul>

      <h2>4. Base legal para o tratamento</h2>
      <p>Tratamos dados pessoais com fundamento nas hipóteses previstas na LGPD, incluindo:</p>
      <ul><li>Execução de contrato;</li><li>Cumprimento de obrigação legal;</li><li>Exercício regular de direitos;</li><li>Legítimo interesse da plataforma;</li><li>Consentimento do titular, quando necessário.</li></ul>

      <h2>5. Compartilhamento de dados</h2>
      <p>A Aliança Models poderá compartilhar dados pessoais apenas quando necessário, incluindo:</p>
      <ul><li>Prestadores de serviços de hospedagem, tecnologia, armazenamento e segurança;</li><li>Processadores de pagamento;</li><li>Ferramentas de análise de desempenho e marketing;</li><li>Autoridades públicas, quando exigido por lei ou ordem judicial.</li></ul>
      <p><strong>Não comercializamos dados pessoais dos usuários ou modelos.</strong></p>

      <h2>6. Conteúdo publicado por modelos</h2>
      <p>As modelos cadastradas autorizam a publicação das informações, fotografias, vídeos e demais conteúdos disponibilizados em seus perfis, conforme os termos da plataforma.</p>
      <p>Os documentos enviados para verificação de identidade são utilizados exclusivamente para validação do cadastro, prevenção de fraudes e cumprimento de obrigações legais, não sendo exibidos publicamente.</p>

      <h2>7. Cookies e tecnologias semelhantes</h2>
      <p>Utilizamos cookies para:</p>
      <ul><li>Manter a sessão do usuário ativa;</li><li>Lembrar preferências de navegação;</li><li>Medir audiência e desempenho da plataforma;</li><li>Melhorar funcionalidades e segurança.</li></ul>
      <p>O usuário pode configurar seu navegador para bloquear ou remover cookies, embora algumas funcionalidades do site possam ser afetadas.</p>

      <h2>8. Armazenamento e segurança</h2>
      <p>Adotamos medidas técnicas e administrativas adequadas para proteger os dados pessoais contra acesso não autorizado, destruição, perda, alteração, divulgação ou qualquer forma de tratamento inadequado.</p>
      <p>Os dados são armazenados em servidores e serviços de terceiros que seguem padrões de segurança compatíveis com o mercado.</p>

      <h2>9. Tempo de retenção</h2>
      <p>Os dados pessoais serão mantidos pelo período necessário para cumprir as finalidades descritas nesta Política, respeitando obrigações legais, regulatórias, fiscais, de segurança e de prevenção a fraudes.</p>
      <p>Os registros técnicos de acesso, incluindo endereço IP, páginas acessadas, dispositivo e eventos de login administrativo, são mantidos por até 90 dias, salvo necessidade de preservação por incidente de segurança, exercício regular de direitos ou obrigação legal.</p>
      <p>Quando não houver mais necessidade de tratamento, os dados poderão ser eliminados ou anonimizados, salvo quando a legislação permitir ou exigir sua conservação.</p>

      <h2>10. Direitos do titular</h2>
      <p>Nos termos da LGPD, o titular dos dados pode solicitar, a qualquer momento:</p>
      <ul><li>Confirmação da existência de tratamento;</li><li>Acesso aos dados pessoais;</li><li>Correção de dados incompletos, inexatos ou desatualizados;</li><li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li><li>Portabilidade dos dados, quando aplicável;</li><li>Eliminação de dados tratados mediante consentimento;</li><li>Informações sobre compartilhamento de dados;</li><li>Revogação do consentimento, quando aplicável.</li></ul>
      <p>As solicitações podem ser enviadas para <a href="mailto:contato@aliancamodels.com">contato@aliancamodels.com</a>.</p>

      <h2>11. Privacidade de menores de idade</h2>
      <p>A plataforma é destinada exclusivamente a pessoas <strong>maiores de 18 anos</strong>.</p>
      <p>Não coletamos intencionalmente dados pessoais de menores de idade. Caso seja identificado cadastro de pessoa menor de 18 anos, o conteúdo e os dados poderão ser removidos imediatamente.</p>

      <h2>12. Links para sites de terceiros</h2>
      <p>O site pode conter links para plataformas ou serviços de terceiros. A presente Política não se aplica a esses sites, sendo recomendável que o usuário consulte as respectivas políticas de privacidade.</p>

      <h2>13. Alterações desta Política</h2>
      <p>Esta Política de Privacidade poderá ser atualizada a qualquer momento para refletir alterações legais, regulatórias ou operacionais da plataforma.</p>
      <p>A versão mais recente estará sempre disponível nesta página, com indicação da data de atualização.</p>

      <h2>14. Contato</h2>
      <address><strong>Aliança Models</strong><br>CNPJ: 68.528.057/0001-00<br>E-mail: <a href="mailto:contato@aliancamodels.com">contato@aliancamodels.com</a><br>Suporte às modelos: <a href="https://wa.me/${MODEL_SUPPORT_WHATSAPP}" target="_blank" rel="noopener">${formatWhatsappNumber(MODEL_SUPPORT_WHATSAPP)}</a><br>Endereço: CEP 22631-280, Avenida Gastão Senges, nº 395, Barra da Tijuca, Rio de Janeiro — RJ.</address>
    `,
  });
}

function viewPoliticaCookies() {
  renderLegalPage({
    title: "Política de Cookies",
    eyebrow: "Aliança · Transparência",
    description: "Saiba como a Aliança Models utiliza cookies e tecnologias semelhantes.",
    path: "/politica-de-cookies",
    content: `
      <p>Esta Política explica como a <strong>Aliança Models</strong> utiliza cookies e tecnologias semelhantes para operar, proteger e melhorar a plataforma.</p>
      <h2>1. O que são cookies</h2>
      <p>Cookies são pequenos arquivos armazenados no navegador durante a visita a um site. Eles permitem reconhecer preferências, manter sessões e compreender como a plataforma é utilizada.</p>
      <h2>2. Cookies utilizados</h2>
      <ul><li><strong>Essenciais:</strong> necessários para segurança, navegação e confirmação de maioridade;</li><li><strong>Funcionais:</strong> guardam preferências, como cidade selecionada;</li><li><strong>Desempenho:</strong> ajudam a identificar erros e melhorar velocidade e usabilidade;</li><li><strong>Marketing:</strong> medem campanhas quando ferramentas de rastreamento estiverem habilitadas.</li></ul>
      <h2>3. Tecnologias de terceiros</h2>
      <p>Serviços de hospedagem, análise e publicidade podem utilizar suas próprias tecnologias, conforme suas políticas. A Aliança Models configura essas ferramentas apenas quando necessárias às finalidades informadas.</p>
      <h2>4. Como gerenciar cookies</h2>
      <p>Você pode bloquear ou apagar cookies nas configurações do navegador. A desativação de cookies essenciais pode impedir o funcionamento correto de partes do site.</p>
      <h2>5. Atualizações e contato</h2>
      <p>Esta Política poderá ser atualizada para refletir mudanças técnicas ou legais. Dúvidas podem ser enviadas para <a href="mailto:contato@aliancamodels.com">contato@aliancamodels.com</a>.</p>
    `,
  });
}

function viewDiretrizesComunidade() {
  renderLegalPage({
    title: "Diretrizes da Comunidade",
    eyebrow: "Aliança · Regras da Plataforma",
    description: "Regras de segurança, respeito e integridade da comunidade Aliança Models.",
    path: "/diretrizes-da-comunidade",
    content: `
      <p>Estas diretrizes existem para preservar uma experiência segura, respeitosa e confiável para modelos, visitantes e equipe da <strong>Aliança Models</strong>.</p>
      <h2>1. Somente maiores de 18 anos</h2>
      <p>É proibido cadastrar, representar, divulgar ou tentar acessar conteúdo em nome de pessoa menor de 18 anos. Suspeitas serão removidas e poderão ser comunicadas às autoridades.</p>
      <h2>2. Identidade e consentimento</h2>
      <ul><li>Use somente informações verdadeiras e atualizadas;</li><li>Publique apenas imagens e conteúdos próprios ou devidamente autorizados;</li><li>Não se passe por terceiros;</li><li>Respeite pedidos de retirada e direitos de imagem.</li></ul>
      <h2>3. Respeito e segurança</h2>
      <p>Não toleramos assédio, ameaça, perseguição, discriminação, chantagem, exposição de dados pessoais, violência ou tentativa de coerção. Interações devem ocorrer entre adultos capazes e mediante consentimento.</p>
      <h2>4. Conteúdo e condutas proibidas</h2>
      <ul><li>Exploração, tráfico de pessoas ou qualquer atividade ilegal;</li><li>Fraude, documentos falsos e informações enganosas;</li><li>Spam, golpes, malware ou tentativa de acesso indevido;</li><li>Conteúdo que viole direitos autorais, privacidade ou dignidade de terceiros.</li></ul>
      <h2>5. Aplicação das regras</h2>
      <p>Conteúdos e perfis podem ser revisados, limitados, suspensos ou removidos. Violações graves podem resultar em bloqueio permanente e comunicação às autoridades competentes.</p>
      <h2>6. Denúncias</h2>
      <p>Encontrou uma violação? Utilize a página de <a href="${pathTo('/denuncias-e-suporte')}">Denúncias e Suporte</a> e envie o link do perfil, uma descrição objetiva e, quando possível, evidências.</p>
    `,
  });
}

function viewDenunciasSuporte() {
  const clienteWa = waAdmin("Olá! Preciso de suporte sobre o site Aliança Models.");
  const modeloWa = `https://wa.me/${MODEL_SUPPORT_WHATSAPP}?text=${encodeURIComponent("Olá! Sou modelo e preciso de suporte na Aliança Models.")}`;
  renderLegalPage({
    title: "Denúncias e Suporte",
    eyebrow: "Aliança · Atendimento",
    description: "Canais oficiais para denúncias, suporte a visitantes e suporte às modelos.",
    path: "/denuncias-e-suporte",
    content: `
      <p>Use os canais abaixo para solicitar ajuda ou comunicar conteúdo e condutas que violem os Termos de Uso e as Diretrizes da Comunidade.</p>
      <div class="legal-contact-grid">
        <article class="legal-contact"><span>Visitantes e clientes</span><h3>Suporte ao usuário</h3><p>Dúvidas de navegação, funcionamento do site ou atendimento geral.</p><a class="btn btn--gold" href="${clienteWa}" target="_blank" rel="noopener">Falar com o suporte</a></article>
        <article class="legal-contact"><span>Canal exclusivo</span><h3>Suporte às modelos</h3><p>Cadastro, perfil, mídia, publicação e suporte para anunciantes.</p><a class="legal-contact__phone wa-phone-link" href="${modeloWa}" target="_blank" rel="noopener" aria-label="Abrir conversa com o suporte às modelos no WhatsApp">${formatWhatsappNumber(MODEL_SUPPORT_WHATSAPP)}</a><a class="btn btn--gold" href="${modeloWa}" target="_blank" rel="noopener">Suporte às modelos</a></article>
      </div>
      <h2>Como fazer uma denúncia</h2>
      <p>Informe o link do perfil ou conteúdo, descreva o ocorrido objetivamente e envie evidências disponíveis. Não compartilhe documentos ou dados sensíveis desnecessários.</p>
      <h2>O que pode ser denunciado</h2>
      <ul><li>Suspeita de menor de idade;</li><li>Uso indevido de imagens ou identidade;</li><li>Perfil falso, fraude ou golpe;</li><li>Assédio, ameaça, exploração ou atividade ilegal;</li><li>Exposição de dados pessoais;</li><li>Violação dos Termos ou das Diretrizes da Comunidade.</li></ul>
      <h2>Análise e providências</h2>
      <p>As denúncias são analisadas com discrição. A plataforma poderá solicitar informações adicionais, restringir preventivamente um conteúdo, remover perfis e colaborar com autoridades quando necessário. O envio de denúncia não garante resposta pública ou divulgação das medidas internas adotadas.</p>
      <h2>Contato por e-mail</h2>
      <p>Você também pode escrever para <a href="mailto:contato@aliancamodels.com">contato@aliancamodels.com</a>.</p>
    `,
  });
}

function view404() {
  updateHead({
    title: "Página não encontrada — Aliança",
    description: "A página que você procura não existe ou foi removida.",
    path: currentRoute(),
    type: "website",
  });
  // sinaliza aos crawlers que essa rota não deve ser indexada
  let robots = document.head.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    document.head.appendChild(robots);
  }
  robots.setAttribute("content", "noindex,follow");
  setJsonLd(null);
  app.innerHTML = `<section class="page"><div class="container" style="text-align:center">
    <h1>Página não encontrada</h1>
    <p>O perfil ou a página que você procura não existe.</p>
    <a class="btn btn--gold btn--lg" href="${pathTo('/')}">Voltar ao início</a>
  </div></section>`;
}

/* ============================================================
   LIGHTBOX
   ============================================================ */
let lbList = [], lbIndex = 0;
const lb = $("#lightbox"), lbImg = $("#lb-img");
function openLightbox(list, i) { lbList = list; lbIndex = i; lbImg.src = list[i]; lb.hidden = false; }
function lbMove(d) { lbIndex = (lbIndex + d + lbList.length) % lbList.length; lbImg.src = lbList[lbIndex]; }
$("#lb-close").addEventListener("click", () => lb.hidden = true);
$("#lb-prev").addEventListener("click", () => lbMove(-1));
$("#lb-next").addEventListener("click", () => lbMove(1));
lb.addEventListener("click", e => { if (e.target === lb) lb.hidden = true; });
document.addEventListener("keydown", e => {
  if (lb.hidden) return;
  if (e.key === "Escape") lb.hidden = true;
  if (e.key === "ArrowLeft") lbMove(-1);
  if (e.key === "ArrowRight") lbMove(1);
});

/* ============================================================
   STORIES — faixa de destaques + visualizador (estilo Instagram)
   Usa window.STORIES (preparado em store.js: ativos, com mídia e
   não expirados, já ordenados).
   ============================================================ */
function storyPerfil(s) {
  return s && s.perfilId ? PERFIS.find(p => p.id === s.perfilId) : null;
}
function storyTitulo(s) {
  if (s.titulo) return s.titulo;
  const p = storyPerfil(s);
  return p ? p.nome : "Story";
}
function storyCapa(s) {
  if (s.capa) return s.capa;
  const p = storyPerfil(s);
  if (p) return foto(p, 0);
  const img = (s.midias || []).find(m => (m.tipo || "image") === "image");
  if (img) return img.url;
  return foto({ nome: s.titulo || "Aliança", hue: 300, fotos: [] });
}

/* HTML da faixa (vazio se não houver stories) */
function storiesStripHtml(opts = {}) {
  if (typeof opts === "string") opts = { extraClass: opts };
  const {
    extraClass = "",
    cidade = null,
    limit = null,
    showMore = false,
    title = "",
    lead = "",
    showMoreLabel = "Ver mais",
    showMoreAria = "Ver mais cidades",
  } = opts;
  const list = window.STORIES || [];
  const filtered = cidade ? list.filter(s => storyCidadeSlug(s) === cidade) : list;
  const curated = filtered;
  const shown = Number.isFinite(limit) ? curated.slice(0, limit) : curated;
  if (!shown.length) return "";
  const items = shown.map((s, i) => `
    <button class="story-av" type="button" data-story="${i}">
      <span class="story-av__ring"><span class="story-av__img"><img src="${storyCapa(s)}" alt="${storyTitulo(s)}" loading="lazy" /></span></span>
      <span class="story-av__name">${storyTitulo(s)}</span>
    </button>`).join("");
  const moreBtn = showMore ? `
    <button class="story-av story-av--more" type="button" id="home-stories-more" aria-label="${showMoreAria}">
      <span class="story-av__ring story-av__ring--more">
        <span class="story-av__img story-av__img--more"><span class="story-av__plus">+</span></span>
      </span>
      <span class="story-av__name">${showMoreLabel}</span>
    </button>` : "";
  const header = title ? `
    <div class="stories__head">
      <div>
        <p class="stories__eyebrow">${title}</p>
        ${lead ? `<p class="stories__lead">${lead}</p>` : ""}
      </div>
    </div>` : "";
  const homeWrap = `${header}<div class="stories__track">${items}${moreBtn}</div>`;
  return `
  <section class="stories ${extraClass}" aria-label="Destaques"${cidade ? ` data-cidade="${cidade}"` : ""}>
    <div class="container">
      ${homeWrap}
    </div>
  </section>`;
}

/* Liga os cliques da faixa ao visualizador (chamado após render da home) */
function initStoriesStrip() {
  $$(".story-av").forEach(btn =>
    btn.addEventListener("click", () => {
      if (btn.id === "home-stories-more") {
        openCityPicker();
        return;
      }
      const wrap = btn.closest(".stories");
      const cidade = wrap?.dataset.cidade || "";
      const list = cidade ? storiesDaCidade(cidade) : (window.STORIES || []);
      openStoryViewer(+btn.dataset.story, list);
    }));
}

/* ---------- Visualizador ---------- */
const SV_IMG_DUR = 5000;                 // duração padrão de uma foto (ms)
const sv         = $("#story-viewer");
const svStage    = $("#sv-stage");
const svProgress = $("#sv-progress");
const svAuthorImg  = $("#sv-author-img");
const svAuthorName = $("#sv-author-name");
const svAuthorSub  = $("#sv-author-sub");
const svCta      = $("#sv-cta");
const cityPicker = $("#city-picker");
const cityPickerGrid = $("#city-picker-grid");
const cityPickerClose = $("#city-picker-close");
const cityPickerLead = $("#city-picker-lead");

function renderCityPicker() {
  if (!cityPickerGrid) return;
  const cities = cidadesComConteudo();
  cityPickerGrid.innerHTML = cities.map(key => {
    const c = CIDADES[key];
    const perfis = PERFIS.filter(p => p.cidade === key).length;
    const stories = storiesDaCidade(key).length;
    return `
      <button class="city-picker__item" type="button" data-city-key="${key}">
        <span class="city-picker__name">${c.nome}</span>
        <span class="city-picker__uf">${c.uf}</span>
        <span class="city-picker__meta">${perfis} perfis • ${stories} stories</span>
      </button>`;
  }).join("");
  if (cityPickerLead) cityPickerLead.textContent = "Os stories e perfis mudam conforme a cidade escolhida.";
}

function openCityPicker() {
  if (!cityPicker) return;
  renderCityPicker();
  cityPicker.hidden = false;
  document.body.classList.add("city-picker-open");
}

function closeCityPicker() {
  if (!cityPicker) return;
  cityPicker.hidden = true;
  document.body.classList.remove("city-picker-open");
}

cityPickerGrid?.addEventListener("click", e => {
  const btn = e.target.closest("[data-city-key]");
  if (!btn) return;
  closeCityPicker();
  navigate(`/cidade/${btn.dataset.cityKey}`);
});
cityPickerClose?.addEventListener("click", closeCityPicker);
cityPicker?.addEventListener("click", e => {
  if (e.target.closest("[data-city-picker-close]")) closeCityPicker();
});
document.addEventListener("keydown", e => {
  if (!cityPicker || cityPicker.hidden) return;
  if (e.key === "Escape") closeCityPicker();
});

let svStories = [];      // lista em exibição
let svSI = 0;            // índice do story atual
let svMI = 0;            // índice da mídia (slide) atual
let svRAF = null;        // requestAnimationFrame da barra
let svPaused = false;
let svCurVideo = null;   // <video> atual (ou null se foto)
let svCurBar = null;     // <i> da barra de progresso atual
let svCurDur = SV_IMG_DUR;
let svStartTs = 0;       // início do slide (performance.now)
let svElapsed = 0;       // tempo já decorrido antes de pausar (fotos)

function openStoryViewer(si, list = window.STORIES || []) {
  svStories = list || [];
  if (!svStories.length) return;
  svSI = Math.max(0, Math.min(si | 0, svStories.length - 1));
  svMI = 0;
  sv.hidden = false;
  document.body.classList.add("sv-open");
  renderStory();
}

function clearSvTimers() {
  if (svRAF) { cancelAnimationFrame(svRAF); svRAF = null; }
}

function closeStoryViewer() {
  clearSvTimers();
  if (svCurVideo) { try { svCurVideo.pause(); } catch (e) {} svCurVideo = null; }
  svStage.innerHTML = "";
  sv.hidden = true;
  svPaused = false;
  sv.classList.remove("sv--paused");
  document.body.classList.remove("sv-open");
}

function renderStory() {
  const s = svStories[svSI];
  if (!s) return closeStoryViewer();
  const media = s.midias || [];
  if (!media.length) return svNextStory();
  if (svMI >= media.length) svMI = media.length - 1;

  // Cabeçalho (autor)
  svAuthorImg.src = storyCapa(s);
  svAuthorName.textContent = storyTitulo(s);
  const p = storyPerfil(s);
  svAuthorSub.textContent = p && CIDADES[p.cidade]
    ? localCurtoPerfil(p) : "";

  // Barras de progresso (uma por slide)
  svProgress.innerHTML = media.map((_, i) =>
    `<span class="sv__seg"><i style="width:${i < svMI ? 100 : 0}%"></i></span>`).join("");

  // CTA (WhatsApp / Ver perfil)
  renderSvCta(s);

  // Mídia atual
  renderSvMedia(media[svMI]);
}

function renderSvMedia(m) {
  clearSvTimers();
  if (svCurVideo) { try { svCurVideo.pause(); } catch (e) {} svCurVideo = null; }
  svStage.innerHTML = "";
  svPaused = false;
  sv.classList.remove("sv--paused");

  const seg = svProgress.children[svMI];
  svCurBar = seg ? seg.firstElementChild : null;

  const tipo = (m.tipo || "image");
  if (tipo === "video") {
    const v = document.createElement("video");
    v.className = "sv__media";
    v.src = m.url;
    v.setAttribute("playsinline", "");
    v.playsInline = true;
    v.autoplay = true;
    v.preload = "auto";
    svStage.appendChild(v);
    svCurVideo = v;
    // tenta tocar com som; se o navegador bloquear, toca mudo
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    v.addEventListener("ended", svNext);
    v.addEventListener("error", svNext);
    svStartVideoProgress(v);
  } else {
    const img = document.createElement("img");
    img.className = "sv__media";
    img.alt = "";
    img.src = m.url;
    svStage.appendChild(img);
    svCurDur = (m.dur ? m.dur * 1000 : SV_IMG_DUR);
    svElapsed = 0;
    svStartTs = performance.now();
    svRAF = requestAnimationFrame(svImageTick);
  }
}

function svImageTick() {
  if (svPaused) return;
  const elapsed = svElapsed + (performance.now() - svStartTs);
  const pct = Math.min(100, (elapsed / svCurDur) * 100);
  if (svCurBar) svCurBar.style.width = pct + "%";
  if (pct >= 100) return svNext();
  svRAF = requestAnimationFrame(svImageTick);
}

function svStartVideoProgress(v) {
  const tick = () => {
    if (!svCurVideo) return;
    if (v.duration && isFinite(v.duration) && svCurBar)
      svCurBar.style.width = Math.min(100, (v.currentTime / v.duration) * 100) + "%";
    svRAF = requestAnimationFrame(tick);
  };
  svRAF = requestAnimationFrame(tick);
}

function renderSvCta(s) {
  const p = storyPerfil(s);
  const wa = (s.whatsapp || (p && p.whatsapp) || ADMIN_WHATSAPP || "").replace(/\D/g, "");
  let html = "";
  if (p) html += `<a class="sv__btn sv__btn--ghost" href="${pathTo('/perfil/' + p.slug)}" data-sv-link>Ver perfil</a>`;
  if (wa) {
    const msg = p
      ? `Olá ${p.nome}! Vi seu story na Aliança.`
      : "Olá! Vi os stories na Aliança e gostaria de saber mais.";
    html += `<a class="sv__btn sv__btn--wa" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${WA_ICON} WhatsApp</a>`;
  }
  svCta.innerHTML = html;
}

/* Navegação */
function svNext() {
  const s = svStories[svSI];
  const media = s ? (s.midias || []) : [];
  if (svMI < media.length - 1) { svMI++; renderStory(); }
  else svNextStory();
}
function svPrev() {
  if (svMI > 0) { svMI--; renderStory(); }
  else svPrevStory();
}
function svNextStory() {
  if (svSI < svStories.length - 1) { svSI++; svMI = 0; renderStory(); }
  else closeStoryViewer();
}
function svPrevStory() {
  if (svSI > 0) { svSI--; svMI = 0; renderStory(); }
  else { svMI = 0; renderStory(); }   // reinicia o primeiro
}

/* Pausar / retomar (segurar pressionado) */
function svPause() {
  if (svPaused) return;
  svPaused = true;
  sv.classList.add("sv--paused");
  if (svCurVideo) { try { svCurVideo.pause(); } catch (e) {} }
  else {
    if (svRAF) { cancelAnimationFrame(svRAF); svRAF = null; }
    svElapsed += performance.now() - svStartTs;
  }
}
function svResume() {
  if (!svPaused) return;
  svPaused = false;
  sv.classList.remove("sv--paused");
  if (svCurVideo) { svCurVideo.play().catch(() => {}); }
  else { svStartTs = performance.now(); svRAF = requestAnimationFrame(svImageTick); }
}

/* Zonas de toque: tap = navega; segurar = pausa */
function bindSvZone(el, dir) {
  let holdT = null, held = false;
  const cancelHold = () => { if (holdT) { clearTimeout(holdT); holdT = null; } };
  el.addEventListener("pointerdown", () => {
    held = false;
    holdT = setTimeout(() => { held = true; svPause(); }, 220);
  });
  el.addEventListener("pointerup", () => {
    cancelHold();
    if (held) { svResume(); held = false; return; }
    dir < 0 ? svPrev() : svNext();
  });
  el.addEventListener("pointercancel", () => { cancelHold(); if (held) { svResume(); held = false; } });
  el.addEventListener("pointerleave", () => { cancelHold(); if (held) { svResume(); held = false; } });
}

if (sv) {
  $("#sv-close").addEventListener("click", closeStoryViewer);
  bindSvZone($("#sv-prev"), -1);
  bindSvZone($("#sv-next"), 1);
  svCta.addEventListener("click", e => { if (e.target.closest("[data-sv-link]")) closeStoryViewer(); });
  document.addEventListener("keydown", e => {
    if (sv.hidden) return;
    if (e.key === "Escape") closeStoryViewer();
    else if (e.key === "ArrowLeft") svPrev();
    else if (e.key === "ArrowRight") svNext();
    else if (e.key === " ") { e.preventDefault(); svPaused ? svResume() : svPause(); }
  });
}

/* ============================================================
   ROTEADOR (hash)
   ============================================================ */
function fecharNav() {
  $("#nav")?.classList.remove("open");
  document.body.classList.remove("nav-open");
  $("#burger")?.setAttribute("aria-expanded", "false");
  fecharMenus();
}

function router() {
  const route = currentRoute();
  const parts = route.split("/").filter(Boolean);
  window.scrollTo(0, 0);
  fecharNav();
  closeCityPicker();
  setTimeout(() => trackMetaPixel("PageView", {
    page_path: location.pathname,
  }), 0);
  window.VIPStore?.logAccess("page_view", location.pathname).catch(() => {});

  if (parts.length === 0)                 return viewHome();
  if (parts[0] === "acompanhantes")      return viewAcompanhantes();
  if (parts[0] === "anuncie")             return viewAnuncie();
  if (parts[0] === "informacoes")         return viewInformacoes();
  if (parts[0] === "termos-de-uso")       return viewTermosDeUso();
  if (parts[0] === "politicas-privacidade") return viewPoliticaPrivacidade();
  if (parts[0] === "politica-de-cookies") return viewPoliticaCookies();
  if (parts[0] === "diretrizes-da-comunidade") return viewDiretrizesComunidade();
  if (parts[0] === "denuncias-e-suporte") return viewDenunciasSuporte();
  if (parts[0] === "perfil" && parts[1])  return viewPerfil(parts[1]);

  if (parts[0] === "cidade" && parts[1]) {
    const cidade = parts[1];
    if (parts[2] === "bairro" && parts[3]) return viewCidade(cidade, { tipo: "bairro", valor: parts[3] });
    if (["novidades", "exclusivas", "videos"].includes(parts[2]))
      return viewCidade(cidade, { tipo: parts[2] });
    return viewCidade(cidade);
  }
  return view404();
}
window.addEventListener("popstate", router);

/* ============================================================
   INICIALIZAÇÃO (age gate, header, menus)
   ============================================================ */
function fecharMenus() {
  $$(".nav__group.open").forEach(g => {
    g.classList.remove("open");
    g.querySelector(".nav__btn")?.setAttribute("aria-expanded", "false");
  });
}

function montarMenus() {
  const host = $("#nav-cities");
  if (!host) return;

  // Um único menu "Cidades" com busca e rolagem (27 capitais)
  const links = cidadesComConteudo().map(key => {
    const c = CIDADES[key];
    const total = PERFIS.filter(p => p.cidade === key).length;
    return `<a href="${pathTo('/cidade/' + key)}" data-nome="${(c.nome + " " + c.uf).toLowerCase()}">
      <span class="nav__city-main"><b>${c.nome}</b>${total ? `<em>${total} ${total === 1 ? "perfil" : "perfis"}</em>` : ""}</span>
      <small>${c.uf}</small>
    </a>`;
  }).join("");

  host.innerHTML = `<div class="nav__group">
      <button class="nav__btn" type="button" aria-haspopup="true" aria-expanded="false">
        Cidades <span class="nav__caret" aria-hidden="true">▾</span>
      </button>
      <div class="nav__menu nav__menu--cities">
        <div class="nav__menu-title">Todas as cidades</div>
        <div class="nav__menu-search"><span class="nav__search-ico" aria-hidden="true"></span><input id="nav-busca-cidade" type="text" placeholder="Buscar cidade…" autocomplete="off" /></div>
        <div class="nav__menu-list">${links}</div>
      </div>
    </div>`;

  // Abrir/fechar no clique (funciona no mobile e no desktop)
  $$("#nav-cities .nav__btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const grupo = btn.closest(".nav__group");
      const abrir = !grupo.classList.contains("open");
      fecharMenus();
      grupo.classList.toggle("open", abrir);
      btn.setAttribute("aria-expanded", abrir ? "true" : "false");
      if (abrir) setTimeout(() => $("#nav-busca-cidade")?.focus(), 30);
    });
  });

  // Busca dentro do menu
  const nb = $("#nav-busca-cidade");
  nb?.addEventListener("input", () => {
    const q = nb.value.trim().toLowerCase();
    $$("#nav-cities .nav__menu-list a").forEach(a => {
      a.hidden = !a.dataset.nome.includes(q);
    });
  });
  // Não fechar o menu ao clicar na busca
  nb?.addEventListener("click", e => e.stopPropagation());

  // Ao clicar num link do menu, fecha tudo
  $$("#nav-cities .nav__menu a").forEach(a =>
    a.addEventListener("click", fecharMenus));
}

function initAgeGate() {
  const gate = $("#age-gate");
  let ok = false;
  try { ok = localStorage.getItem("vip_maior18_v2") === "1"; } catch (e) {}
  if (ok) { gate.hidden = true; return; }
  gate.hidden = false;

  // Confirma +18 e entra no site (home), onde o cliente escolhe a cidade
  $("#age-yes").addEventListener("click", () => {
    try { localStorage.setItem("vip_maior18_v2", "1"); } catch (e) {}
    gate.hidden = true;
    document.dispatchEvent(new Event("age-accepted"));
  });

  $("#age-no").addEventListener("click", () => { location.href = "https://www.google.com"; });
}

function initLaunchGate() {
  const gate = $("#launch-gate");
  if (!gate) return;
  const target = new Date("2026-09-08T00:00:00-03:00").getTime();
  const els = {
    days: $("#launch-days"), hours: $("#launch-hours"), minutes: $("#launch-minutes"), seconds: $("#launch-seconds"),
  };
  const pad = n => String(Math.max(0, n)).padStart(2, "0");
  const renderTimer = () => {
    const diff = Math.max(0, target - Date.now());
    const total = Math.floor(diff / 1000);
    els.days.textContent = pad(Math.floor(total / 86400));
    els.hours.textContent = pad(Math.floor((total % 86400) / 3600));
    els.minutes.textContent = pad(Math.floor((total % 3600) / 60));
    els.seconds.textContent = pad(total % 60);
  };
  renderTimer();
  const timer = setInterval(renderTimer, 1000);
  const show = () => { gate.hidden = false; document.body.classList.add("launch-gate-open"); };
  const hide = () => { gate.hidden = true; document.body.classList.remove("launch-gate-open"); clearInterval(timer); };
  $("#launch-gate-close")?.addEventListener("click", hide);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !gate.hidden) hide();
  });
  let ageAccepted = false;
  try { ageAccepted = localStorage.getItem("vip_maior18_v2") === "1"; } catch (e) {}
  if (ageAccepted) show();
  else document.addEventListener("age-accepted", show, { once: true });
  // A exceção é validada pelo mesmo RPC usado no painel administrativo.
  const checkAdmin = () => window.VIPStore?.auth?.isAdmin?.().then(isAdmin => {
    if (!isAdmin) return;
    if (ageAccepted) hide();
    else document.addEventListener("age-accepted", hide, { once: true });
  }).catch(() => {});
  checkAdmin();
  window.VIPStore?.auth?.onChange?.(() => checkAdmin());
  window.addEventListener("pageshow", checkAdmin);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkAdmin(); });
}

function initHeader() {
  const header = $("#header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScroll); onScroll();

  const nav = $("#nav");
  const burger = $("#burger");
  const navClose = $("#nav-close");

  const abrirNav = abrir => {
    nav?.classList.toggle("open", abrir);
    document.body.classList.toggle("nav-open", abrir);
    burger?.setAttribute("aria-expanded", abrir ? "true" : "false");
    if (!abrir) fecharMenus();
  };

  burger?.addEventListener("click", e => {
    e.stopPropagation();
    abrirNav(!nav?.classList.contains("open"));
  });

  navClose?.addEventListener("click", () => abrirNav(false));

  nav?.addEventListener("click", e => e.stopPropagation());
  nav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => abrirNav(false)));

  // Clicar fora fecha o drawer mobile e os menus de cidade abertos
  document.addEventListener("click", e => {
    if (nav?.classList.contains("open") && !e.target.closest("#nav") && !e.target.closest("#burger")) {
      abrirNav(false);
      return;
    }
    if (!e.target.closest(".nav__group")) fecharMenus();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") abrirNav(false);
  });
  $("#header-wa").addEventListener("click", () => window.open(waAdmin(), "_blank", "noopener"));

}

/** Reescreve hrefs estáticos "#/..." no HTML fixo (header, footer, age gate) */
function rewriteStaticHashLinks() {
  document.querySelectorAll('a[href^="#/"]').forEach(a => {
    const raw = a.getAttribute("href").replace(/^#\/?/, "/") || "/";
    a.setAttribute("href", pathTo(raw));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  $("#year").textContent = new Date().getFullYear();
  rewriteStaticHashLinks();
  initAgeGate();
  initLaunchGate();
  initHeader();

  // Estado de carregamento enquanto buscamos os dados no Supabase
  app.innerHTML = `<section class="page"><div class="container" style="text-align:center;padding:4rem 0;color:var(--muted)">
    <p>Carregando…</p></div></section>`;

  // Aguarda os dados (Supabase, com fallback para o SEED) antes de montar a UI
  if (window.VIPData && window.VIPData.ready) {
    try { await window.VIPData.ready; } catch (e) {}
  }

  initMetaPixel();
  montarMenus();
  rewriteStaticHashLinks(); // repete após montar o menu de cidades
  router();
});
