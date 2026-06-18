/* ============================================================
   VIP LUXÚRIA — Painel Admin
   CRUD de perfis, cidades, upload de imagens, backup e publicação.
   Dados via window.VIPStore (store.js).
   ============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Estado de trabalho (cópia editável) */
let DATA = VIPStore.current();   // { adminWhatsapp, cidades, perfis }
let fotos = [];                  // fotos do perfil em edição
let editIndex = -1;              // índice do perfil em edição (-1 = novo)

/* ---------- Utilidades ---------- */
const PASS_KEY = "vip_admin_pass";
const AUTH_KEY = "vip_admin_auth";

function getPass() {
  try { return localStorage.getItem(PASS_KEY) || "admin"; } catch (e) { return "admin"; }
}
function setPass(p) { try { localStorage.setItem(PASS_KEY, p); } catch (e) {} }

function slugify(s) {
  return (s || "").toString().toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
function uniqueSlug(base, ignoreIndex) {
  let slug = base || "perfil", i = 2;
  const exists = s => DATA.perfis.some((p, idx) => p.slug === s && idx !== ignoreIndex);
  while (exists(slug)) slug = `${base}-${i++}`;
  return slug;
}
const splitList = v => (v || "").split(",").map(s => s.trim()).filter(Boolean);

function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.className = "toast", 2600);
}

function persist() { VIPStore.save(DATA); updateBadge(); }
function updateBadge() { $("#count-badge").textContent = DATA.perfis.length + " perfis"; }

/* Placeholder igual ao do site (para a lista do admin) */
function fotoCapa(p, i = 0) {
  if (Array.isArray(p.fotos) && p.fotos[i]) return p.fotos[i];
  const hue = ((p.hue || 300) + i * 18) % 360;
  const inicial = (p.nome || "?").trim()[0].toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='hsl(${hue},45%,22%)'/><stop offset='1' stop-color='hsl(${(hue+40)%360},35%,8%)'/>
    </linearGradient></defs><rect width='300' height='400' fill='url(#g)'/>
    <text x='150' y='190' font-family='serif' font-size='110' fill='hsla(45,75%,80%,.5)' text-anchor='middle'>${inicial}</text>
    <text x='150' y='360' font-family='sans-serif' font-size='20' letter-spacing='3' fill='hsla(45,60%,82%,.7)' text-anchor='middle'>${(p.nome||"").toUpperCase()}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

/* ============================================================
   LOGIN
   ============================================================ */
function initLogin() {
  let authed = false;
  try { authed = sessionStorage.getItem(AUTH_KEY) === "1"; } catch (e) {}
  if (authed) return showAdmin();

  $("#login-form").addEventListener("submit", e => {
    e.preventDefault();
    const val = $("#login-pass").value;
    if (val === getPass()) {
      try { sessionStorage.setItem(AUTH_KEY, "1"); } catch (e) {}
      showAdmin();
    } else {
      $("#login-err").textContent = "Senha incorreta.";
    }
  });
}
function showAdmin() {
  $("#login").hidden = true;
  $("#admin").hidden = false;
  boot();
}
$("#logout").addEventListener("click", () => {
  try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
  location.reload();
});

/* ============================================================
   ABAS
   ============================================================ */
function showTab(name) {
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  $$(".tabpane").forEach(p => p.hidden = true);
  const pane = $("#tab-" + name);
  if (pane) pane.hidden = false;
  if (name === "perfis") renderLista();
  if (name === "cidades") renderCidades();
  if (name === "config") fillConfig();
  if (name === "backup") renderStorage();
}
$$(".tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));

/* ============================================================
   LISTA DE PERFIS
   ============================================================ */
function renderLista() {
  const q = ($("#busca").value || "").toLowerCase();
  const fc = $("#filtro-cidade").value;
  const list = DATA.perfis.filter(p =>
    (!q || p.nome.toLowerCase().includes(q)) && (!fc || p.cidade === fc));

  const box = $("#lista-perfis");
  if (!list.length) {
    box.innerHTML = `<div class="empty">Nenhum perfil. Clique em <b>+ Novo perfil</b> para começar.</div>`;
    return;
  }
  box.innerHTML = list.map(p => {
    const idx = DATA.perfis.indexOf(p);
    const c = DATA.cidades[p.cidade];
    return `
    <div class="adm-card">
      <div class="adm-card__img">
        <div class="adm-card__flags">
          ${p.nova ? `<span class="flag flag--nova">Nova</span>` : ""}
          ${p.exclusiva ? `<span class="flag flag--excl">Excl</span>` : ""}
          ${p.temVideo ? `<span class="flag">▶</span>` : ""}
        </div>
        <img src="${fotoCapa(p)}" alt="${p.nome}" />
      </div>
      <div class="adm-card__body">
        <div class="adm-card__name">${p.nome}</div>
        <div class="adm-card__meta">${c ? c.nome + " • " + c.uf : p.cidade} · ${p.idade || "?"} anos</div>
        <div class="adm-card__meta">📱 ${p.whatsapp || "—"}</div>
        <div class="adm-card__actions">
          <button class="btn btn--ghost btn--sm" data-edit="${idx}">Editar</button>
          <button class="btn btn--danger btn--sm" data-del="${idx}">Excluir</button>
        </div>
      </div>
    </div>`;
  }).join("");

  $$("[data-edit]", box).forEach(b => b.addEventListener("click", () => abrirForm(+b.dataset.edit)));
  $$("[data-del]", box).forEach(b => b.addEventListener("click", () => excluirPerfil(+b.dataset.del)));
}
$("#busca").addEventListener("input", renderLista);
$("#filtro-cidade").addEventListener("change", renderLista);
$("#novo-perfil").addEventListener("click", () => abrirForm(-1));

function excluirPerfil(idx) {
  const p = DATA.perfis[idx];
  if (!p) return;
  if (!confirm(`Excluir o perfil de "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
  DATA.perfis.splice(idx, 1);
  persist();
  renderLista();
  toast("Perfil excluído.");
}

/* ============================================================
   FORMULÁRIO DE PERFIL
   ============================================================ */
function preencherSelectCidades(selectEl, selecionada) {
  selectEl.innerHTML = Object.keys(DATA.cidades).map(key =>
    `<option value="${key}" ${key === selecionada ? "selected" : ""}>${DATA.cidades[key].nome} — ${DATA.cidades[key].uf}</option>`
  ).join("");
}
function preencherSelectBairros(cidadeKey, selecionado) {
  const c = DATA.cidades[cidadeKey];
  $("#f-bairro").innerHTML = (c ? c.bairros : []).map(b =>
    `<option value="${b.slug}" ${b.slug === selecionado ? "selected" : ""}>${b.nome}</option>`
  ).join("");
}

function abrirForm(idx) {
  editIndex = idx;
  const novo = idx < 0;
  const p = novo ? {} : DATA.perfis[idx];
  fotos = novo ? [] : [...(p.fotos || [])];

  $("#form-titulo").textContent = novo ? "Novo perfil" : "Editar: " + p.nome;
  $("#form-excluir").hidden = novo;

  $("#f-nome").value = p.nome || "";
  $("#f-whats").value = p.whatsapp || "";
  preencherSelectCidades($("#f-cidade"), p.cidade || Object.keys(DATA.cidades)[0]);
  preencherSelectBairros($("#f-cidade").value, p.bairro);
  $("#f-idade").value = p.idade || "";
  $("#f-altura").value = p.altura || "";
  $("#f-manequim").value = p.manequim || "";
  $("#f-medidas").value = p.medidas || "";
  $("#f-valor").value = p.valorHora || "";
  $("#f-hue").value = p.hue ?? "";
  $("#f-descricao").value = p.descricao || "";
  $("#f-servicos").value = (p.servicos || []).join(", ");
  $("#f-atendimento").value = (p.atendimento || []).join(", ");
  $("#f-idiomas").value = (p.idiomas || []).join(", ");
  $("#f-horario").value = p.horario || "";
  $("#f-nova").checked = !!p.nova;
  $("#f-exclusiva").checked = !!p.exclusiva;
  $("#f-temVideo").checked = !!p.temVideo;
  $("#f-possuiLocal").checked = !!p.possuiLocal;
  $("#f-destaque").checked = !!p.destaque;

  renderThumbs();
  $$(".tabpane").forEach(pane => pane.hidden = true);
  $("#tab-form").hidden = false;
  window.scrollTo(0, 0);
}

$("#f-cidade").addEventListener("change", () => preencherSelectBairros($("#f-cidade").value));

$("#form-cancelar").addEventListener("click", () => showTab("perfis"));
$("#form-excluir").addEventListener("click", () => {
  if (editIndex >= 0) { excluirPerfil(editIndex); showTab("perfis"); }
});

$("#form-salvar").addEventListener("click", () => {
  const nome = $("#f-nome").value.trim();
  if (!nome) return toast("Informe o nome.", true);
  const whats = $("#f-whats").value.replace(/\D/g, "");
  if (!whats) return toast("Informe o WhatsApp (só números).", true);

  const base = slugify(nome + "-" + ($("#f-bairro").value || ""));
  const perfil = {
    slug: editIndex >= 0 ? DATA.perfis[editIndex].slug : uniqueSlug(slugify(nome), editIndex),
    nome,
    cidade: $("#f-cidade").value,
    bairro: $("#f-bairro").value,
    whatsapp: whats,
    idade: +$("#f-idade").value || 0,
    altura: $("#f-altura").value.trim(),
    manequim: $("#f-manequim").value.trim(),
    medidas: $("#f-medidas").value.trim(),
    valorHora: $("#f-valor").value.trim() || "Sob consulta",
    hue: +$("#f-hue").value || 300,
    descricao: $("#f-descricao").value.trim(),
    servicos: splitList($("#f-servicos").value),
    atendimento: splitList($("#f-atendimento").value),
    idiomas: splitList($("#f-idiomas").value),
    horario: $("#f-horario").value.trim(),
    nova: $("#f-nova").checked,
    exclusiva: $("#f-exclusiva").checked,
    temVideo: $("#f-temVideo").checked,
    possuiLocal: $("#f-possuiLocal").checked,
    destaque: $("#f-destaque").checked,
    fotos: [...fotos],
  };

  try {
    if (editIndex >= 0) DATA.perfis[editIndex] = perfil;
    else DATA.perfis.unshift(perfil);
    persist();
  } catch (e) {
    return toast("Erro ao salvar (armazenamento cheio?). Reduza o nº de fotos.", true);
  }
  toast("Perfil salvo com sucesso!");
  showTab("perfis");
});

/* ============================================================
   UPLOAD DE IMAGENS (com otimização via canvas)
   ============================================================ */
function fileToDataURL(file, maxW = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL("image/jpeg", quality)); }
        catch (e) { resolve(fr.result); }
      };
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  const files = [...fileList].filter(f => f.type.startsWith("image/"));
  if (!files.length) return;
  toast("Otimizando imagens...");
  for (const f of files) {
    try { fotos.push(await fileToDataURL(f)); }
    catch (e) { toast("Falha ao ler uma imagem.", true); }
  }
  renderThumbs();
  toast(files.length + " imagem(ns) adicionada(s).");
}

function renderThumbs() {
  const box = $("#thumbs");
  box.innerHTML = fotos.map((src, i) => `
    <div class="thumb">
      <div class="thumb__bar">
        <button class="thumb__btn" data-left="${i}" title="Mover p/ esquerda">‹</button>
        <button class="thumb__btn thumb__btn--del" data-del="${i}" title="Remover">✕</button>
      </div>
      <img src="${src}" alt="foto ${i + 1}" />
      ${i === 0 ? `<span class="thumb__cover">Capa</span>` : ""}
    </div>`).join("");

  $$("[data-del]", box).forEach(b => b.addEventListener("click", () => {
    fotos.splice(+b.dataset.del, 1); renderThumbs();
  }));
  $$("[data-left]", box).forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.left;
    if (i > 0) { [fotos[i - 1], fotos[i]] = [fotos[i], fotos[i - 1]]; renderThumbs(); }
  }));
}

const drop = $("#drop"), fileInput = $("#file-input");
drop.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));

/* ============================================================
   CIDADES & BAIRROS
   ============================================================ */
function renderCidades() {
  const box = $("#cidades-lista");
  box.innerHTML = Object.keys(DATA.cidades).map(key => {
    const c = DATA.cidades[key];
    const bairros = c.bairros.map((b, bi) => `
      <div class="bairro-row" data-city="${key}" data-bi="${bi}">
        <input class="bnome" value="${b.nome.replace(/"/g, "&quot;")}" placeholder="Nome do bairro" />
        <span class="slug">${b.slug}</span>
        <button class="btn btn--danger btn--sm" data-delbairro="${key}:${bi}">✕</button>
      </div>`).join("");
    return `
    <div class="city-block" data-citykey="${key}">
      <div class="city-block__head">
        <input class="cnome" value="${c.nome.replace(/"/g, "&quot;")}" placeholder="Nome da cidade" style="background:#16151a;border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem;color:#fff;outline:none" />
        <input class="cuf" value="${c.uf}" maxlength="2" placeholder="UF" style="width:70px;background:#16151a;border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem;color:#fff;outline:none;text-transform:uppercase" />
        <span class="slug">${key}</span>
        <div style="flex:1"></div>
        <button class="btn btn--danger btn--sm" data-delcity="${key}">Remover cidade</button>
      </div>
      <div class="bairros">${bairros}</div>
      <button class="btn btn--ghost btn--sm" data-addbairro="${key}">+ Bairro</button>
    </div>`;
  }).join("");

  $$("[data-delcity]", box).forEach(b => b.addEventListener("click", () => {
    if (confirm("Remover a cidade e seus bairros?")) { delete DATA.cidades[b.dataset.delcity]; renderCidades(); }
  }));
  $$("[data-addbairro]", box).forEach(b => b.addEventListener("click", () => {
    DATA.cidades[b.dataset.addbairro].bairros.push({ slug: "novo-bairro-" + Date.now().toString().slice(-4), nome: "Novo bairro" });
    syncCidadesFromInputs(); renderCidades();
  }));
  $$("[data-delbairro]", box).forEach(b => b.addEventListener("click", () => {
    const [key, bi] = b.dataset.delbairro.split(":");
    DATA.cidades[key].bairros.splice(+bi, 1); syncCidadesFromInputs(); renderCidades();
  }));
}

/* Lê os inputs e atualiza DATA.cidades (sem salvar ainda) */
function syncCidadesFromInputs() {
  $$(".city-block").forEach(block => {
    const key = block.dataset.citykey;
    if (!DATA.cidades[key]) return;
    DATA.cidades[key].nome = $(".cnome", block).value.trim() || DATA.cidades[key].nome;
    DATA.cidades[key].uf = ($(".cuf", block).value.trim() || DATA.cidades[key].uf).toUpperCase();
    $$(".bairro-row", block).forEach(row => {
      const bi = +row.dataset.bi;
      const nome = $(".bnome", row).value.trim();
      if (DATA.cidades[key].bairros[bi]) {
        DATA.cidades[key].bairros[bi].nome = nome || DATA.cidades[key].bairros[bi].nome;
        if (!DATA.cidades[key].bairros[bi].slug || DATA.cidades[key].bairros[bi].slug.startsWith("novo-bairro"))
          DATA.cidades[key].bairros[bi].slug = slugify(nome) || DATA.cidades[key].bairros[bi].slug;
      }
    });
  });
}

$("#add-cidade").addEventListener("click", () => {
  const nome = prompt("Nome da nova cidade:");
  if (!nome) return;
  const uf = (prompt("UF (ex.: SP):") || "").toUpperCase().slice(0, 2);
  let key = slugify(nome);
  while (DATA.cidades[key]) key += "-2";
  DATA.cidades[key] = { nome: nome.trim(), uf, bairros: [] };
  renderCidades();
});

$("#salvar-cidades").addEventListener("click", () => {
  syncCidadesFromInputs();
  persist();
  toast("Cidades salvas!");
  renderCidades();
});

/* ============================================================
   CONFIG
   ============================================================ */
function fillConfig() {
  $("#cfg-admin-wa").value = DATA.adminWhatsapp || "";
  $("#cfg-pass").value = "";
}
$("#salvar-config").addEventListener("click", () => {
  DATA.adminWhatsapp = $("#cfg-admin-wa").value.replace(/\D/g, "") || DATA.adminWhatsapp;
  const np = $("#cfg-pass").value.trim();
  if (np) setPass(np);
  persist();
  toast("Configurações salvas!");
});

/* ============================================================
   BACKUP / PUBLICAR
   ============================================================ */
function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

$("#exportar-js").addEventListener("click", () => {
  const js =
`/* ============================================================
   VIP LUXÚRIA — data.js gerado pelo Painel Admin
   Substitua o data.js do site por este arquivo para publicar.
   ============================================================ */
const SEED = ${JSON.stringify(DATA, null, 2)};
if (typeof window !== "undefined") window.SEED = SEED;
`;
  download("data.js", js, "text/javascript");
  toast("data.js baixado! Substitua o arquivo no site para publicar.");
});

$("#exportar-json").addEventListener("click", () => {
  download("vip-backup.json", JSON.stringify(DATA, null, 2), "application/json");
  toast("Backup exportado.");
});

$("#importar-btn").addEventListener("click", () => $("#importar-file").click());
$("#importar-file").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (!d.cidades || !Array.isArray(d.perfis)) throw new Error("formato");
      DATA = d;
      persist();
      toast("Backup importado com sucesso!");
      showTab("perfis");
    } catch (err) {
      toast("Arquivo inválido.", true);
    }
  };
  fr.readAsText(file);
  e.target.value = "";
});

$("#reset-tudo").addEventListener("click", () => {
  if (!confirm("Restaurar tudo para o padrão de fábrica? Suas alterações salvas serão perdidas.")) return;
  VIPStore.reset();
  DATA = VIPStore.seed();
  persist();
  toast("Padrão de fábrica restaurado.");
  showTab("perfis");
});

function renderStorage() {
  const bytes = new Blob([JSON.stringify(DATA)]).size;
  const kb = (bytes / 1024).toFixed(0);
  const pct = Math.min(100, (bytes / (5 * 1024 * 1024)) * 100);
  $("#storage-info").innerHTML = `
    Espaço usado: <b>${kb} KB</b> de ~5 MB (limite do navegador).
    <div class="storage__bar"><div class="storage__fill" style="width:${pct}%"></div></div>
    ${pct > 80 ? `<span style="color:#e88">Atenção: perto do limite. Use menos fotos por perfil.</span>` : ""}`;
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  DATA = VIPStore.current();
  updateBadge();
  // filtro de cidade na lista
  $("#filtro-cidade").innerHTML = `<option value="">Todas as cidades</option>` +
    Object.keys(DATA.cidades).map(k => `<option value="${k}">${DATA.cidades[k].nome}</option>`).join("");
  renderLista();
}

initLogin();
