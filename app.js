/* ============================================================
   VIP LUXÚRIA — App (roteamento + render + WhatsApp)
   Usa CIDADES, PERFIS e ADMIN_WHATSAPP de data.js
   ============================================================ */

/* ---------- Helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");

const bairroNome = (cidade, slug) =>
  (CIDADES[cidade]?.bairros.find(b => b.slug === slug)?.nome) || slug;

const perfilBySlug = slug => PERFIS.find(p => p.slug === slug);

/* WhatsApp da acompanhante (com mensagem contextual) */
function waPerfil(p, contexto) {
  const msg = contexto
    ? `Olá ${p.nome}! Vi seu anúncio na Vip Luxúria e tenho interesse em ${contexto} 💎`
    : `Olá ${p.nome}! Vi seu anúncio na Vip Luxúria e gostaria de saber mais 😊`;
  return `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(msg)}`;
}
/* WhatsApp do administrador (home / anuncie) */
function waAdmin(msg) {
  const t = msg || "Olá! Gostaria de informações sobre a Vip Luxúria.";
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(t)}`;
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
    <circle cx='300' cy='300' r='150' fill='none' stroke='hsla(45,70%,70%,.25)' stroke-width='1.5'/>
    <text x='300' y='350' font-family='Playfair Display,serif' font-size='200'
          fill='hsla(45,75%,80%,.55)' text-anchor='middle'>${inicial}</text>
    <text x='300' y='720' font-family='Inter,sans-serif' font-size='34' letter-spacing='6'
          fill='hsla(45,60%,82%,.7)' text-anchor='middle'>${p.nome.toUpperCase()}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

/* ---------- Componentes ---------- */
function tagsHtml(p) {
  let t = "";
  if (p.nova)      t += `<span class="tag tag--nova">Nova</span>`;
  if (p.exclusiva) t += `<span class="tag tag--excl">Exclusiva</span>`;
  if (p.temVideo)  t += `<span class="tag tag--video">▶ Vídeo</span>`;
  return t;
}

function cardHtml(p) {
  return `
  <article class="card">
    <a class="card__media" href="#/perfil/${p.slug}">
      <div class="card__tags">${tagsHtml(p)}</div>
      <img src="${foto(p)}" alt="${p.nome}" loading="lazy" />
      <div class="card__local">${bairroNome(p.cidade, p.bairro)} • ${CIDADES[p.cidade].uf}</div>
    </a>
    <div class="card__body">
      <a href="#/perfil/${p.slug}"><h3 class="card__name">${p.nome}</h3></a>
      <div class="card__attrs">
        <span><b>${p.altura}</b> altura</span>
        <span><b>${p.idade}</b> anos</span>
        <span>MAN <b>${p.manequim}</b></span>
        ${p.possuiLocal ? `<span>📍 <b>Local</b></span>` : ""}
      </div>
      <a class="btn btn--wa btn--block" href="${waPerfil(p)}" target="_blank" rel="noopener">
        WhatsApp
      </a>
    </div>
  </article>`;
}

function gridHtml(list) {
  if (!list.length) return `<div class="empty">Nenhum perfil encontrado nesta seleção.</div>`;
  return `<div class="grid">${list.map(cardHtml).join("")}</div>`;
}

/* Ordena: novidades e destaques primeiro */
const ordena = list => [...list].sort((a, b) =>
  (b.nova - a.nova) || (b.destaque - a.destaque) || (b.exclusiva - a.exclusiva));

/* ============================================================
   VIEWS
   ============================================================ */

function viewHome() {
  const destaques = ordena(PERFIS.filter(p => p.destaque));
  const novidades = ordena(PERFIS.filter(p => p.nova));
  const exclusivas = ordena(PERFIS.filter(p => p.exclusiva));

  const cidadeCard = key => {
    const c = CIDADES[key];
    const n = PERFIS.filter(p => p.cidade === key).length;
    return `<a class="hero__city" href="#/cidade/${key}">
      <b>${c.nome}</b><span>${c.uf} • ${n} acompanhantes</span></a>`;
  };

  app.innerHTML = `
  <section class="hero">
    <div class="container hero__content">
      <p class="hero__eyebrow">Discrição · Elegância · Alto padrão</p>
      <h1>Acompanhantes de <em>luxo</em><br/>no Rio de Janeiro &amp; Cuiabá</h1>
      <p>Perfis selecionados, fotos reais e atendimento exclusivo. Escolha sua cidade
         e fale diretamente pelo WhatsApp, com total sigilo.</p>
      <div class="hero__cities">
        ${cidadeCard("rio-de-janeiro")}
        ${cidadeCard("cuiaba")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section__head">
        <div><h2>Em <span>destaque</span></h2><p class="lead">As mais procuradas do momento</p></div>
      </div>
      ${gridHtml(destaques)}
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      <div class="section__head">
        <div><h2><span>Novidades</span></h2><p class="lead">Perfis recém-chegados</p></div>
      </div>
      ${gridHtml(novidades)}
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section__head">
        <div><h2>Acompanhantes <span>exclusivas</span></h2><p class="lead">Seleção premium verificada</p></div>
      </div>
      ${gridHtml(exclusivas)}
    </div>
  </section>`;
}

function viewCidade(cidade, filtro) {
  const c = CIDADES[cidade];
  if (!c) return view404();

  let list = PERFIS.filter(p => p.cidade === cidade);
  let titulo = c.nome, sub = `${list.length} acompanhantes em ${c.nome} (${c.uf})`;

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
    `<a class="chip${filtro?.valor === b.slug ? " active" : ""}" href="#/cidade/${cidade}/bairro/${b.slug}">${b.nome}</a>`
  ).join("");

  app.innerHTML = `
  <section class="page">
    <div class="container">
      <a class="back-link" href="#/">‹ Início</a>
      <div class="section__head">
        <div><h2>${titulo} <span>${c.uf}</span></h2><p class="lead">${sub}</p></div>
      </div>

      <div class="chips">
        <a class="chip${!filtro ? " active" : ""}" href="#/cidade/${cidade}">Todos</a>
        ${chips}
      </div>
      <div class="chips">
        <a class="chip${filtro?.tipo === "novidades" ? " active" : ""}" href="#/cidade/${cidade}/novidades">✨ Novidades</a>
        <a class="chip${filtro?.tipo === "exclusivas" ? " active" : ""}" href="#/cidade/${cidade}/exclusivas">💎 Exclusivas</a>
        <a class="chip${filtro?.tipo === "videos" ? " active" : ""}" href="#/cidade/${cidade}/videos">▶ Vídeos</a>
      </div>

      <div class="toolbar">
        <div class="search">
          🔍 <input id="busca" type="text" placeholder="Buscar por nome..." />
        </div>
      </div>

      <div id="resultados">${gridHtml(ordena(list))}</div>
    </div>
  </section>`;

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

  const galeria = [0, 1, 2, 3].map(i =>
    `<img src="${foto(p, i)}" alt="${p.nome} ${i + 1}" data-i="${i}" class="lb-trigger" />`
  ).join("");

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
    <a class="back-link" href="#/cidade/${p.cidade}">‹ Voltar para ${c.nome}</a>

    <div class="profile__top">
      <div class="profile__gallery">${galeria}</div>

      <div class="profile__info">
        <h1>${p.nome}</h1>
        <div class="profile__loc">${bairroNome(p.cidade, p.bairro)} • ${c.nome} ${c.uf}</div>
        <div class="profile__badges">${tagsHtml(p) || ""}${p.possuiLocal ? `<span class="tag tag--excl">Possui Local</span>` : ""}</div>

        <p class="profile__desc">${p.descricao}</p>

        <div class="spec">
          <div><span>Idade</span><b>${p.idade} anos</b></div>
          <div><span>Altura</span><b>${p.altura}</b></div>
          <div><span>Manequim</span><b>${p.manequim}</b></div>
          <div><span>Medidas</span><b>${p.medidas}</b></div>
          <div><span>Idiomas</span><b>${(p.idiomas || ["Português"]).join(", ")}</b></div>
          <div><span>Horário</span><b>${p.horario}</b></div>
        </div>

        <div class="profile__actions">
          <a class="btn btn--wa btn--lg" href="${waPerfil(p)}" target="_blank" rel="noopener">💬 Falar no WhatsApp</a>
          <a class="btn btn--ghost btn--lg" href="${waPerfil(p, "agendar um horário")}" target="_blank" rel="noopener">Agendar</a>
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
  const fotos = [0, 1, 2, 3].map(i => foto(p, i));
  $$(".lb-trigger").forEach(img =>
    img.addEventListener("click", () => openLightbox(fotos, +img.dataset.i)));
}

function viewAnuncie() {
  app.innerHTML = `
  <section class="page">
    <div class="container">
      <a class="back-link" href="#/">‹ Início</a>
      <h1>Anuncie aqui</h1>
      <p>Faça parte da Vip Luxúria e divulgue seu perfil para o público de alto padrão do
         Rio de Janeiro e de Cuiabá. Preencha os dados abaixo: ao enviar, abriremos o WhatsApp
         da nossa central com tudo preenchido — é só confirmar e enviar suas fotos.</p>

      <form class="form" id="form-anuncie">
        <div>
          <label>Nome artístico</label>
          <input name="nome" required placeholder="Ex.: Luna Sophie" />
        </div>
        <div class="row">
          <div>
            <label>Cidade</label>
            <select name="cidade" id="sel-cidade" required>
              <option value="">Selecione...</option>
              ${Object.keys(CIDADES).map(k => `<option value="${k}">${CIDADES[k].nome} — ${CIDADES[k].uf}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Bairro</label>
            <select name="bairro" id="sel-bairro" required><option value="">Selecione a cidade...</option></select>
          </div>
        </div>
        <div class="row">
          <div><label>Idade</label><input name="idade" type="number" min="18" required placeholder="18+" /></div>
          <div><label>Seu WhatsApp</label><input name="whats" required placeholder="(00) 00000-0000" /></div>
        </div>
        <div>
          <label>Descrição / apresentação</label>
          <textarea name="desc" placeholder="Conte um pouco sobre você, atendimento, serviços..."></textarea>
        </div>
        <button class="btn btn--gold btn--lg" type="submit">Enviar pelo WhatsApp</button>
      </form>
    </div>
  </section>`;

  const selCidade = $("#sel-cidade"), selBairro = $("#sel-bairro");
  selCidade.addEventListener("change", () => {
    const c = CIDADES[selCidade.value];
    selBairro.innerHTML = c
      ? `<option value="">Selecione...</option>` + c.bairros.map(b => `<option value="${b.slug}">${b.nome}</option>`).join("")
      : `<option value="">Selecione a cidade...</option>`;
  });

  $("#form-anuncie").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    const cidadeNome = CIDADES[f.cidade.value]?.nome || f.cidade.value;
    const bairroN = bairroNome(f.cidade.value, f.bairro.value);
    const msg =
`*Novo anúncio — Vip Luxúria*
Nome: ${f.nome.value}
Cidade: ${cidadeNome}
Bairro: ${bairroN}
Idade: ${f.idade.value}
WhatsApp: ${f.whats.value}
Descrição: ${f.desc.value || "-"}`;
    window.open(waAdmin(msg), "_blank", "noopener");
  });
}

function viewInformacoes() {
  app.innerHTML = `
  <section class="page">
    <div class="container">
      <a class="back-link" href="#/">‹ Início</a>
      <h1>Informações &amp; Política</h1>

      <h2>Conteúdo adulto (+18)</h2>
      <p>Este site é destinado exclusivamente a maiores de 18 anos e contém material de
         natureza adulta. Ao acessar, o visitante declara ter a maioridade legal.</p>

      <h2>Natureza do serviço</h2>
      <p>A Vip Luxúria é uma <strong>plataforma de publicidade</strong> para profissionais
         autônomos(as). O site <strong>não intermedeia negociações</strong>, não cobra
         comissões sobre encontros e não se responsabiliza por acordos feitos entre as partes.
         Cada anunciante é o(a) único(a) responsável pelo conteúdo, fotos e informações do seu perfil.</p>

      <h2>Privacidade (LGPD)</h2>
      <p>Respeitamos a Lei Geral de Proteção de Dados. Não exigimos cadastro do visitante e não
         armazenamos dados pessoais de quem navega. A confirmação de idade fica salva apenas no
         seu próprio navegador. Os contatos acontecem diretamente via WhatsApp, fora do nosso sistema.</p>

      <h2>Discrição</h2>
      <p>Não divulgamos endereços exatos — apenas cidade e bairro. Todo contato é tratado com
         total sigilo entre você e o(a) anunciante.</p>

      <h2>Contato</h2>
      <p><a class="section__link" href="${waAdmin()}" target="_blank" rel="noopener">Falar com a central pelo WhatsApp</a></p>
    </div>
  </section>`;
}

function view404() {
  app.innerHTML = `<section class="page"><div class="container" style="text-align:center">
    <h1>Página não encontrada</h1>
    <p>O perfil ou a página que você procura não existe.</p>
    <a class="btn btn--gold btn--lg" href="#/">Voltar ao início</a>
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
   ROTEADOR (hash)
   ============================================================ */
function router() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  window.scrollTo(0, 0);
  $("#nav")?.classList.remove("open");

  if (parts.length === 0)                 return viewHome();
  if (parts[0] === "anuncie")             return viewAnuncie();
  if (parts[0] === "informacoes")         return viewInformacoes();
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
window.addEventListener("hashchange", router);

/* ============================================================
   INICIALIZAÇÃO (age gate, header, menus)
   ============================================================ */
function montarMenus() {
  $$("[data-city-menu]").forEach(menu => {
    const key = menu.dataset.cityMenu;
    const c = CIDADES[key];
    menu.innerHTML =
      `<a href="#/cidade/${key}">Todas em ${c.nome}</a>
       <a href="#/cidade/${key}/novidades">✨ Novidades</a>
       <a href="#/cidade/${key}/exclusivas">💎 Exclusivas</a>
       <a href="#/cidade/${key}/videos">▶ Vídeos</a>
       <div class="nav__menu-head">Bairros</div>` +
      c.bairros.map(b => `<a href="#/cidade/${key}/bairro/${b.slug}">${b.nome}</a>`).join("");
  });
}

function initAgeGate() {
  const gate = $("#age-gate");
  let ok = false;
  try { ok = localStorage.getItem("vip_maior18_v2") === "1"; } catch (e) {}
  if (ok) { gate.hidden = true; return; }
  gate.hidden = false;

  // Cada cidade confirma +18 e leva direto para a listagem da cidade
  $$(".age-city[data-city]").forEach(btn => {
    btn.addEventListener("click", () => {
      try { localStorage.setItem("vip_maior18_v2", "1"); } catch (e) {}
      gate.hidden = true;
      location.hash = "#/cidade/" + btn.dataset.city;
    });
  });

  $("#age-no").addEventListener("click", () => { location.href = "https://www.google.com"; });
}

function initHeader() {
  const header = $("#header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScroll); onScroll();

  $("#burger").addEventListener("click", () => $("#nav").classList.toggle("open"));
  $("#header-wa").addEventListener("click", () => window.open(waAdmin(), "_blank", "noopener"));

  // Botão flutuante: na home -> admin; em perfil -> acompanhante
  const float = $("#float-wa");
  const updateFloat = () => {
    const m = location.hash.match(/^#\/perfil\/(.+)$/);
    const p = m && perfilBySlug(m[1]);
    float.href = p ? waPerfil(p) : waAdmin();
  };
  window.addEventListener("hashchange", updateFloat); updateFloat();
}

document.addEventListener("DOMContentLoaded", async () => {
  $("#year").textContent = new Date().getFullYear();
  initAgeGate();
  initHeader();

  // Estado de carregamento enquanto buscamos os dados no Supabase
  app.innerHTML = `<section class="page"><div class="container" style="text-align:center;padding:4rem 0;color:var(--muted)">
    <p>Carregando…</p></div></section>`;

  // Aguarda os dados (Supabase, com fallback para o SEED) antes de montar a UI
  if (window.VIPData && window.VIPData.ready) {
    try { await window.VIPData.ready; } catch (e) {}
  }

  montarMenus();
  router();
});
