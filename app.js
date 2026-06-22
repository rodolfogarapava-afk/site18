/* ============================================================
   ALIANÇA — App (roteamento + render + WhatsApp)
   Usa CIDADES, PERFIS e ADMIN_WHATSAPP de data.js
   ============================================================ */

/* ---------- Helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");

const bairroNome = (cidade, slug) =>
  (CIDADES[cidade]?.bairros.find(b => b.slug === slug)?.nome) || slug;

const perfilBySlug = slug => PERFIS.find(p => p.slug === slug);

/* Ícone oficial do WhatsApp (mesmo glifo do botão flutuante) */
const WA_ICON = '<svg class="ico-wa" viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.18 1.62 6L4 29l8.16-1.58a12.02 12.02 0 0 0 3.88.64h.01c6.64 0 12.04-5.4 12.04-12.04C28.09 8.4 22.68 3 16.04 3zm0 21.93h-.01c-1.2 0-2.38-.32-3.41-.94l-.24-.14-4.84.94.97-4.72-.16-.25a9.9 9.9 0 0 1-1.52-5.29c0-5.5 4.48-9.98 9.99-9.98 2.67 0 5.17 1.04 7.06 2.93a9.9 9.9 0 0 1 2.92 7.06c0 5.5-4.48 9.98-9.99 9.98zm5.48-7.47c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/></svg>';

/* WhatsApp da acompanhante (com mensagem contextual) */
function waPerfil(p, contexto) {
  const msg = contexto
    ? `Olá ${p.nome}! Vi seu anúncio na Aliança e tenho interesse em ${contexto} 💎`
    : `Olá ${p.nome}! Vi seu anúncio na Aliança e gostaria de saber mais 😊`;
  return `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(msg)}`;
}
/* WhatsApp do administrador (home / anuncie) */
function waAdmin(msg) {
  const t = msg || "Olá! Gostaria de informações sobre a Aliança.";
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
        ${WA_ICON} WhatsApp
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

/* Cartão de cidade da home/busca */
function cidadeCard(key) {
  const c = CIDADES[key];
  if (!c) return "";
  const n = PERFIS.filter(p => p.cidade === key).length;
  const info = n ? `${c.uf} • ${n} ${n === 1 ? "acompanhante" : "acompanhantes"}` : `${c.uf} • Em breve`;
  return `<a class="city-card${n ? "" : " city-card--soon"}" href="#/cidade/${key}" data-nome="${(c.nome + " " + c.uf).toLowerCase()}">
    <b>${c.nome}</b><span>${info}</span></a>`;
}

/* Cidades ordenadas: as com mais perfis primeiro, depois alfabética */
function cidadesOrdenadas() {
  const cont = key => PERFIS.filter(p => p.cidade === key).length;
  return Object.keys(CIDADES || {}).sort((a, b) =>
    (cont(b) - cont(a)) || CIDADES[a].nome.localeCompare(CIDADES[b].nome, "pt-BR"));
}

function viewHome() {
  const exclusivas = ordena(PERFIS.filter(p => p.exclusiva));
  const novidades = ordena(PERFIS.filter(p => p.nova));
  const modelos = ordena(PERFIS);

  const cardsCidades = cidadesOrdenadas().map(cidadeCard).join("");
  const totalCidades = Object.keys(CIDADES || {}).length;

  app.innerHTML = `
  <section class="hero">
    <div class="container hero__content">
      <p class="hero__eyebrow">Discrição · Elegância · Alto padrão</p>
      <h1>Acompanhantes de <em>luxo</em><br/>no Brasil</h1>
      <p>Perfis selecionados, fotos reais e atendimento exclusivo. Encontre na
         sua cidade e fale direto pelo WhatsApp, com total sigilo.</p>

      <div class="hero__search-wrap">
        <form class="hero__search" id="form-cidade" autocomplete="off" role="search">
          <span class="hero__search-ico" aria-hidden="true">🔍</span>
          <input id="busca-cidade" type="text" placeholder="Buscar acompanhantes por cidade…" autocomplete="off" />
          <button class="hero__search-btn" type="button" id="btn-busca-cidade" aria-label="Buscar">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </form>
        <ul class="hero__results" id="hero-results" hidden></ul>
      </div>
      <p class="hero__hint">${totalCidades} cidades em todo o Brasil — comece digitando a sua</p>
    </div>
  </section>

  <section class="section" id="sec-cidades">
    <div class="container">
      <div class="section__head">
        <div><h2>Escolha sua <span>cidade</span></h2><p class="lead">Toque na sua cidade para ver as acompanhantes disponíveis</p></div>
      </div>
      <div id="cidades-grid" class="city-grid">${cardsCidades}</div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      <div class="section__head">
        <div><h2>Acompanhantes <span>exclusivas</span></h2><p class="lead">Seleção premium verificada</p></div>
      </div>
      ${gridHtml(exclusivas)}
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section__head">
        <div><h2><span>Novidades</span></h2><p class="lead">Perfis recém-chegados</p></div>
      </div>
      ${gridHtml(novidades)}
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      <div class="section__head">
        <div><h2><span>Modelos</span></h2><p class="lead">Conheça todas as nossas acompanhantes</p></div>
      </div>
      ${gridHtml(modelos)}
    </div>
  </section>`;

  // ===== Busca de cidade do hero (autocomplete + ação do botão) =====
  initBuscaCidade();
}

/* Busca de cidade: dropdown ao digitar + botão/Enter sempre funcionais. */
function initBuscaCidade() {
  const input = document.getElementById("busca-cidade");
  const botao = document.getElementById("btn-busca-cidade");
  const form  = document.getElementById("form-cidade");
  const box   = document.getElementById("hero-results");
  if (!input || !box) return;

  // normaliza: minúsculas e SEM acentos (assim "sao", "goiania" etc. acham)
  const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const lista = cidadesOrdenadas().map(key => {
    const c = CIDADES[key];
    const n = PERFIS.filter(p => p.cidade === key).length;
    return { key, nome: c.nome, uf: c.uf, n, busca: norm(c.nome + " " + c.uf) };
  });

  function achar(q) {
    const termo = norm((q || "").trim());
    if (!termo) return [];
    return lista.filter(c => c.busca.includes(termo));
  }

  function mostrar(achados) {
    if (!achados.length) {
      box.innerHTML = `<li class="hero__result hero__result--empty">Nenhuma cidade encontrada.</li>`;
    } else {
      box.innerHTML = achados.map(c => {
        const info = c.n ? `${c.uf} • ${c.n} ${c.n === 1 ? "acompanhante" : "acompanhantes"}` : `${c.uf} • Em breve`;
        return `<li><a class="hero__result" href="#/cidade/${c.key}"><b>${c.nome}</b><span>${info}</span></a></li>`;
      }).join("");
    }
    box.hidden = false;
  }

  function esconder() { box.hidden = true; box.innerHTML = ""; }

  // Digitar: abre/atualiza o dropdown
  input.addEventListener("input", () => {
    const termo = input.value.trim();
    if (!termo) { esconder(); return; }
    mostrar(achar(termo));
  });

  // Pesquisar (botão ou Enter): vai para a 1ª cidade; se vazio, foca; se nada, avisa
  function pesquisar() {
    const termo = input.value.trim();
    if (!termo) { input.focus(); return; }
    const achados = achar(termo);
    if (achados.length) { esconder(); location.hash = "#/cidade/" + achados[0].key; }
    else { mostrar([]); }
  }

  if (botao) botao.onclick = pesquisar;
  if (form) form.onsubmit = (e) => { e.preventDefault(); pesquisar(); };

  // Fecha o dropdown ao clicar fora
  document.addEventListener("click", (e) => {
    if (!box.hidden && !e.target.closest(".hero__search-wrap")) esconder();
  });
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

      <div class="filtros">
        <div class="search">
          🔍 <input id="busca" type="text" placeholder="Buscar por nome..." />
        </div>

        <div class="filtros__row">
          <span class="filtros__label">Filtrar</span>
          <div class="chips">
            <a class="chip${!filtro ? " active" : ""}" href="#/cidade/${cidade}">Todos</a>
            <a class="chip${filtro?.tipo === "novidades" ? " active" : ""}" href="#/cidade/${cidade}/novidades">✨ Novidades</a>
            <a class="chip${filtro?.tipo === "exclusivas" ? " active" : ""}" href="#/cidade/${cidade}/exclusivas">💎 Exclusivas</a>
            <a class="chip${filtro?.tipo === "videos" ? " active" : ""}" href="#/cidade/${cidade}/videos">▶ Vídeos</a>
          </div>
        </div>

        ${c.bairros.length ? `
        <div class="filtros__row">
          <span class="filtros__label">Bairros</span>
          <div class="chips">${chips}</div>
        </div>` : ""}
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
          <div><span>Local p/ atendimento</span><b>${p.possuiLocal ? "Sim" : "Não"}</b></div>
        </div>

        <div class="profile__actions">
          <a class="btn btn--wa btn--lg" href="${waPerfil(p)}" target="_blank" rel="noopener">${WA_ICON} Falar no WhatsApp</a>
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
      <p>Faça parte da Aliança e divulgue seu perfil para o público de alto padrão em
         todo o Brasil. Preencha os dados abaixo: ao enviar, abriremos o WhatsApp
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
            <label>Bairro <small style="color:var(--muted)">(se houver)</small></label>
            <select name="bairro" id="sel-bairro"><option value="">Selecione a cidade...</option></select>
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
    selBairro.innerHTML = !c
      ? `<option value="">Selecione a cidade...</option>`
      : (c.bairros && c.bairros.length
          ? `<option value="">Selecione...</option>` + c.bairros.map(b => `<option value="${b.slug}">${b.nome}</option>`).join("")
          : `<option value="">Sem bairros cadastrados</option>`);
  });

  $("#form-anuncie").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
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
      <p>Este site é destinado a maiores de 18 anos e contém conteúdo adulto.
         Ao acessar, você confirma ter 18 anos ou mais.</p>

      <h2>Natureza do serviço</h2>
      <p>A Aliança é uma plataforma de publicidade. Não intermediamos negociações,
         não cobramos comissões e não nos responsabilizamos por acordos entre as
         partes. Cada anunciante é responsável pelo conteúdo do seu próprio perfil.</p>

      <h2>Privacidade (LGPD)</h2>
      <p>Seguimos a Lei Geral de Proteção de Dados (LGPD). Não exigimos cadastro e não
         armazenamos dados pessoais de quem navega. A confirmação de idade fica salva
         apenas no seu navegador. O contato é feito diretamente pelo WhatsApp.</p>

      <h2>Discrição</h2>
      <p>Não divulgamos endereços exatos, apenas cidade e bairro.
         Os contatos são tratados com sigilo.</p>

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
  fecharMenus();

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
  const links = cidadesOrdenadas().map(key => {
    const c = CIDADES[key];
    return `<a href="#/cidade/${key}" data-nome="${(c.nome + " " + c.uf).toLowerCase()}">${c.nome} <small>${c.uf}</small></a>`;
  }).join("");

  host.innerHTML = `<div class="nav__group">
      <button class="nav__btn" type="button" aria-haspopup="true" aria-expanded="false">
        Cidades <span class="nav__caret" aria-hidden="true">▾</span>
      </button>
      <div class="nav__menu nav__menu--cities">
        <div class="nav__menu-search">🔍 <input id="nav-busca-cidade" type="text" placeholder="Buscar cidade…" autocomplete="off" /></div>
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
    if (!location.hash || location.hash === "#") location.hash = "#/";
  });

  $("#age-no").addEventListener("click", () => { location.href = "https://www.google.com"; });
}

function initHeader() {
  const header = $("#header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScroll); onScroll();

  $("#burger").addEventListener("click", e => {
    e.stopPropagation();
    $("#nav").classList.toggle("open");
  });

  // Clicar fora fecha os menus de cidade abertos
  document.addEventListener("click", e => {
    if (!e.target.closest(".nav__group")) fecharMenus();
  });
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
