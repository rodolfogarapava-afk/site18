/* ============================================================
   ALIANÇA — Painel Admin (Supabase)
   Login (Supabase Auth) + CRUD de perfis/cidades/config no banco
   + upload de fotos no Storage + backup.
   Dados via window.VIPStore (store.js).
   ============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Estado de trabalho (cópia editável carregada do banco) */
let DATA = { adminWhatsapp: "", cidades: {}, perfis: [], stories: [] };
let fotos = [];                  // fotos (URLs) do perfil em edição
let editIndex = -1;              // índice do perfil em edição (-1 = novo)

/* Estado do story em edição */
let storyMidias = [];            // [{url, tipo, dur}]
let storyCapaUrl = "";           // URL da capa (avatar)
let storyEditId = null;          // id do story em edição (null = novo)

/* ---------- Utilidades ---------- */
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
  toast._t = setTimeout(() => t.className = "toast", 3200);
}

function updateBadge() { $("#count-badge").textContent = DATA.perfis.length + " perfis"; }

/* Recarrega DATA do banco (após gravações). */
async function reload() {
  DATA = await VIPStore.loadAll();
  updateBadge();
}

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
   LOGIN  (Supabase Auth: e-mail + senha)
   ============================================================ */
async function initLogin() {
  try {
    const session = await VIPStore.auth.getSession();
    if (session) return showAdmin();
  } catch (e) {}

  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#login-email").value;
    const pass  = $("#login-pass").value;
    $("#login-err").textContent = "";
    const btn = $("#login-form button[type=submit]");
    btn.disabled = true;
    try {
      await VIPStore.auth.signIn(email, pass);
      await showAdmin();
    } catch (err) {
      $("#login-err").textContent = "E-mail ou senha incorretos.";
    } finally {
      btn.disabled = false;
    }
  });
}
async function showAdmin() {
  $("#login").hidden = true;
  $("#admin").hidden = false;
  await boot();
}
$("#logout").addEventListener("click", async () => {
  try { await VIPStore.auth.signOut(); } catch (e) {}
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
  if (name === "stories") renderStories();
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
        <div class="adm-card__meta">${c ? c.nome + " • " + c.uf : (p.cidade || "—")} · ${p.idade || "?"} anos</div>
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

async function excluirPerfil(idx) {
  const p = DATA.perfis[idx];
  if (!p) return;
  if (!confirm(`Excluir o perfil de "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await VIPStore.deletePerfil(p);
    await reload();
    renderLista();
    toast("Perfil excluído.");
  } catch (e) {
    toast("Erro ao excluir: " + (e.message || e), true);
  }
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
$("#form-excluir").addEventListener("click", async () => {
  if (editIndex >= 0) { await excluirPerfil(editIndex); showTab("perfis"); }
});

$("#form-salvar").addEventListener("click", async () => {
  const nome = $("#f-nome").value.trim();
  if (!nome) return toast("Informe o nome.", true);
  const whats = $("#f-whats").value.replace(/\D/g, "");
  if (!whats) return toast("Informe o WhatsApp (só números).", true);

  const editando = editIndex >= 0;
  const perfil = {
    id:   editando ? DATA.perfis[editIndex].id : undefined,
    slug: editando ? DATA.perfis[editIndex].slug : uniqueSlug(slugify(nome), editIndex),
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

  const btn = $("#form-salvar");
  btn.disabled = true;
  try {
    await VIPStore.savePerfil(perfil);
    await reload();
    toast("Perfil salvo com sucesso!");
    showTab("perfis");
  } catch (e) {
    toast("Erro ao salvar: " + (e.message || e), true);
  } finally {
    btn.disabled = false;
  }
});

/* ============================================================
   UPLOAD DE IMAGENS (otimiza via canvas e envia ao Storage)
   ============================================================ */
function fileToBlob(file, maxW = 1000, quality = 0.82) {
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
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Falha ao processar a imagem.")), "image/jpeg", quality);
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
  toast("Enviando imagens...");
  let ok = 0;
  for (const f of files) {
    try {
      const blob = await fileToBlob(f);
      const url = await VIPStore.uploadFoto(blob, "jpg");
      fotos.push(url);
      ok++;
      renderThumbs();
    } catch (e) {
      console.error(e);
      toast("Falha ao enviar uma imagem.", true);
    }
  }
  if (ok) toast(ok + " imagem(ns) enviada(s).");
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
   STORIES
   ============================================================ */
function storyThumb(s) {
  if (s.capa) return s.capa;
  const p = s.perfilId ? DATA.perfis.find(x => x.id === s.perfilId) : null;
  if (p) return fotoCapa(p, 0);
  const img = (s.midias || []).find(m => (m.tipo || "image") === "image");
  if (img) return img.url;
  return fotoCapa({ nome: s.titulo || "Story", hue: 300, fotos: [] });
}
function storyTituloAdmin(s) {
  if (s.titulo) return s.titulo;
  const p = s.perfilId ? DATA.perfis.find(x => x.id === s.perfilId) : null;
  return p ? p.nome : "Story";
}
function storyExpiraLabel(s) {
  if (!s.expiraEm) return "Não expira";
  const t = new Date(s.expiraEm).getTime();
  if (!t || t <= Date.now()) return "⚠ Expirado";
  const h = Math.round((t - Date.now()) / 3600000);
  return h >= 1 ? `Expira em ~${h}h` : "Expira em <1h";
}

function renderStories() {
  const box = $("#lista-stories");
  const list = DATA.stories || [];
  if (!list.length) {
    box.innerHTML = `<div class="empty">Nenhum story ainda. Clique em <b>+ Novo story</b> para criar o primeiro.</div>`;
    return;
  }
  box.innerHTML = list.map((s, idx) => {
    const p = s.perfilId ? DATA.perfis.find(x => x.id === s.perfilId) : null;
    const nMid = (s.midias || []).length;
    return `
    <div class="adm-card">
      <div class="adm-card__img">
        <div class="adm-card__flags">
          ${s.ativo ? `<span class="flag flag--nova">Ativo</span>` : `<span class="flag">Oculto</span>`}
        </div>
        <img src="${storyThumb(s)}" alt="${storyTituloAdmin(s)}" />
      </div>
      <div class="adm-card__body">
        <div class="adm-card__name">${storyTituloAdmin(s)}</div>
        <div class="adm-card__meta">${nMid} mídia(s)${p ? " · " + p.nome : ""}</div>
        <div class="adm-card__meta">${storyExpiraLabel(s)}</div>
        <div class="adm-card__actions">
          <button class="btn btn--ghost btn--sm" data-up="${idx}" ${idx === 0 ? "disabled" : ""} title="Subir">↑</button>
          <button class="btn btn--ghost btn--sm" data-down="${idx}" ${idx === list.length - 1 ? "disabled" : ""} title="Descer">↓</button>
          <button class="btn btn--ghost btn--sm" data-edit="${s.id}">Editar</button>
          <button class="btn btn--danger btn--sm" data-del="${s.id}">Excluir</button>
        </div>
      </div>
    </div>`;
  }).join("");

  $$("[data-edit]", box).forEach(b => b.addEventListener("click", () => abrirStoryForm(b.dataset.edit)));
  $$("[data-del]", box).forEach(b => b.addEventListener("click", () => excluirStory(b.dataset.del)));
  $$("[data-up]", box).forEach(b => b.addEventListener("click", () => moverStory(+b.dataset.up, -1)));
  $$("[data-down]", box).forEach(b => b.addEventListener("click", () => moverStory(+b.dataset.down, 1)));
}

async function moverStory(idx, dir) {
  const list = DATA.stories;
  const j = idx + dir;
  if (j < 0 || j >= list.length) return;
  [list[idx], list[j]] = [list[j], list[idx]];
  renderStories();
  try {
    await VIPStore.saveStoriesOrder(list);
    await reload();
    renderStories();
  } catch (e) {
    toast("Erro ao reordenar: " + (e.message || e), true);
  }
}

function abrirStoryForm(id) {
  storyEditId = id || null;
  const s = id ? DATA.stories.find(x => x.id === id) : null;
  storyMidias = s ? (s.midias || []).map(m => ({ ...m })) : [];
  storyCapaUrl = s ? (s.capa || "") : "";

  $("#story-form-titulo").textContent = s ? "Editar story" : "Novo story";
  $("#story-excluir").hidden = !s;

  $("#s-titulo").value = s ? (s.titulo || "") : "";
  $("#s-perfil").innerHTML = `<option value="">— Nenhuma —</option>` +
    DATA.perfis.map(p => `<option value="${p.id}" ${s && s.perfilId === p.id ? "selected" : ""}>${p.nome}${DATA.cidades[p.cidade] ? " — " + DATA.cidades[p.cidade].uf : ""}</option>`).join("");
  $("#s-whats").value = s ? (s.whatsapp || "") : "";
  $("#s-expira").value = "";
  if (s && s.expiraEm) {
    const h = Math.round((new Date(s.expiraEm).getTime() - Date.now()) / 3600000);
    if (h > 0) $("#s-expira").value = h;
  }
  $("#s-ativo").checked = s ? s.ativo !== false : true;

  renderStoryCapa();
  renderStoryMidias();
  $$(".tabpane").forEach(p => p.hidden = true);
  $("#tab-story-form").hidden = false;
  window.scrollTo(0, 0);
}

function renderStoryCapa() {
  const box = $("#s-capa-thumb");
  if (!storyCapaUrl) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="thumb">
    <div class="thumb__bar"><button class="thumb__btn thumb__btn--del" data-capadel="1" title="Remover capa">✕</button></div>
    <img src="${storyCapaUrl}" alt="capa" /></div>`;
  const del = $("[data-capadel]", box);
  if (del) del.addEventListener("click", () => { storyCapaUrl = ""; renderStoryCapa(); });
}

function renderStoryMidias() {
  const box = $("#s-midias");
  box.innerHTML = storyMidias.map((m, i) => {
    const isVid = (m.tipo || "image") === "video";
    const media = isVid
      ? `<video src="${m.url}" muted playsinline preload="metadata"></video><span class="thumb__type">▶ vídeo</span>`
      : `<img src="${m.url}" alt="mídia ${i + 1}" />`;
    return `<div class="thumb">
      <div class="thumb__bar">
        <button class="thumb__btn" data-left="${i}" title="Mover p/ esquerda">‹</button>
        <button class="thumb__btn thumb__btn--del" data-del="${i}" title="Remover">✕</button>
      </div>
      ${media}
      ${i === 0 ? `<span class="thumb__cover">1ª</span>` : ""}
    </div>`;
  }).join("");

  $$("[data-del]", box).forEach(b => b.addEventListener("click", () => {
    storyMidias.splice(+b.dataset.del, 1); renderStoryMidias();
  }));
  $$("[data-left]", box).forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.left;
    if (i > 0) { [storyMidias[i - 1], storyMidias[i]] = [storyMidias[i], storyMidias[i - 1]]; renderStoryMidias(); }
  }));
}

async function uploadStoryCapa(file) {
  if (!file || !file.type.startsWith("image/")) return;
  toast("Enviando capa...");
  try {
    const blob = await fileToBlob(file, 400, 0.85);
    storyCapaUrl = await VIPStore.uploadFoto(blob, "jpg");
    renderStoryCapa();
    toast("Capa enviada.");
  } catch (e) {
    toast("Falha ao enviar a capa.", true);
  }
}

async function addStoryMidias(fileList) {
  const files = [...fileList].filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
  if (!files.length) return;
  toast("Enviando mídias...");
  let ok = 0;
  for (const f of files) {
    try {
      if (f.type.startsWith("video/")) {
        const ext = (f.name.split(".").pop() || "mp4").toLowerCase();
        const url = await VIPStore.uploadArquivo(f, ext, "stories");
        storyMidias.push({ url, tipo: "video" });
      } else {
        const blob = await fileToBlob(f, 1080, 0.85);
        const url = await VIPStore.uploadFoto(blob, "jpg");
        storyMidias.push({ url, tipo: "image" });
      }
      ok++; renderStoryMidias();
    } catch (e) {
      console.error(e);
      toast("Falha ao enviar uma mídia.", true);
    }
  }
  if (ok) toast(ok + " mídia(s) enviada(s).");
}

async function salvarStory() {
  if (!storyMidias.length) return toast("Adicione ao menos uma foto ou vídeo.", true);
  const expiraH = parseInt($("#s-expira").value, 10);
  const expiraEm = (expiraH && expiraH > 0)
    ? new Date(Date.now() + expiraH * 3600000).toISOString() : null;

  const editing = !!storyEditId;
  const atual = editing ? DATA.stories.find(x => x.id === storyEditId) : null;
  const ordem = atual && typeof atual.ordem === "number" ? atual.ordem : (DATA.stories.length);

  const story = {
    id: storyEditId || undefined,
    perfilId: $("#s-perfil").value || null,
    titulo: $("#s-titulo").value.trim(),
    capa: storyCapaUrl || "",
    whatsapp: $("#s-whats").value.replace(/\D/g, ""),
    midias: storyMidias,
    ativo: $("#s-ativo").checked,
    expiraEm,
    ordem,
  };

  const btn = $("#story-salvar");
  btn.disabled = true;
  try {
    await VIPStore.saveStory(story, ordem);
    await reload();
    toast("Story salvo com sucesso!");
    showTab("stories");
  } catch (e) {
    toast("Erro ao salvar: " + (e.message || e), true);
  } finally {
    btn.disabled = false;
  }
}

async function excluirStory(id) {
  const s = DATA.stories.find(x => x.id === id);
  if (!s) return;
  if (!confirm("Excluir este story? Esta ação não pode ser desfeita.")) return;
  try {
    await VIPStore.deleteStory(s);
    await reload();
    renderStories();
    toast("Story excluído.");
  } catch (e) {
    toast("Erro ao excluir: " + (e.message || e), true);
  }
}

/* Eventos do formulário de story */
$("#novo-story").addEventListener("click", () => abrirStoryForm(null));
$("#story-cancelar").addEventListener("click", () => showTab("stories"));
$("#story-salvar").addEventListener("click", salvarStory);
$("#story-excluir").addEventListener("click", async () => {
  if (storyEditId) { await excluirStory(storyEditId); showTab("stories"); }
});

const sDropCapa = $("#s-drop-capa"), sFileCapa = $("#s-file-capa");
sDropCapa.addEventListener("click", () => sFileCapa.click());
sFileCapa.addEventListener("change", () => { uploadStoryCapa(sFileCapa.files[0]); sFileCapa.value = ""; });

const sDropMidia = $("#s-drop-midia"), sFileMidia = $("#s-file-midia");
sDropMidia.addEventListener("click", () => sFileMidia.click());
sFileMidia.addEventListener("change", () => { addStoryMidias(sFileMidia.files); sFileMidia.value = ""; });
["dragenter", "dragover"].forEach(ev => sDropMidia.addEventListener(ev, e => { e.preventDefault(); sDropMidia.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => sDropMidia.addEventListener(ev, e => { e.preventDefault(); sDropMidia.classList.remove("over"); }));
sDropMidia.addEventListener("drop", e => addStoryMidias(e.dataTransfer.files));

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
    if (confirm("Remover a cidade e seus bairros? (Salve as cidades para aplicar.)")) { delete DATA.cidades[b.dataset.delcity]; renderCidades(); }
  }));
  $$("[data-addbairro]", box).forEach(b => b.addEventListener("click", () => {
    DATA.cidades[b.dataset.addbairro].bairros.push({ slug: "novo-bairro-" + String(DATA.cidades[b.dataset.addbairro].bairros.length + 1), nome: "Novo bairro" });
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

$("#salvar-cidades").addEventListener("click", async () => {
  syncCidadesFromInputs();
  const btn = $("#salvar-cidades");
  btn.disabled = true;
  try {
    await VIPStore.saveCidades(DATA.cidades);
    await reload();
    toast("Cidades salvas!");
    renderCidades();
  } catch (e) {
    toast("Erro ao salvar cidades: " + (e.message || e), true);
  } finally {
    btn.disabled = false;
  }
});

/* ============================================================
   CONFIG
   ============================================================ */
function fillConfig() {
  $("#cfg-admin-wa").value = DATA.adminWhatsapp || "";
  $("#cfg-pass").value = "";
}
$("#salvar-config").addEventListener("click", async () => {
  const wa = $("#cfg-admin-wa").value.replace(/\D/g, "") || DATA.adminWhatsapp;
  const np = $("#cfg-pass").value.trim();
  const btn = $("#salvar-config");
  btn.disabled = true;
  try {
    await VIPStore.saveConfig(wa);
    DATA.adminWhatsapp = wa;
    if (np) {
      if (np.length < 6) throw new Error("a nova senha precisa de ao menos 6 caracteres.");
      await VIPStore.auth.updatePassword(np);
    }
    $("#cfg-pass").value = "";
    toast("Configurações salvas!");
  } catch (e) {
    toast("Erro ao salvar: " + (e.message || e), true);
  } finally {
    btn.disabled = false;
  }
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

$("#exportar-json").addEventListener("click", async () => {
  try {
    const d = await VIPStore.exportAll();
    download("vip-backup.json", JSON.stringify(d, null, 2), "application/json");
    toast("Backup exportado.");
  } catch (e) {
    toast("Erro ao exportar: " + (e.message || e), true);
  }
});

$("#importar-btn").addEventListener("click", () => $("#importar-file").click());
$("#importar-file").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = async () => {
    try {
      const d = JSON.parse(fr.result);
      if (!d.cidades || !Array.isArray(d.perfis)) throw new Error("formato inválido");
      if (!confirm("Importar este backup vai SUBSTITUIR os dados atuais do site. Continuar?")) return;
      await VIPStore.importAll(d);
      await reload();
      toast("Backup importado com sucesso!");
      showTab("perfis");
    } catch (err) {
      toast("Erro ao importar: " + (err.message || err), true);
    }
  };
  fr.readAsText(file);
  e.target.value = "";
});

$("#reset-tudo").addEventListener("click", async () => {
  if (!confirm("Restaurar tudo para o padrão de fábrica? Os dados atuais do site serão substituídos.")) return;
  try {
    await VIPStore.resetToSeed();
    await reload();
    toast("Padrão de fábrica restaurado.");
    showTab("perfis");
  } catch (e) {
    toast("Erro ao restaurar: " + (e.message || e), true);
  }
});

function renderStorage() {
  const online = !!(window.VIPData && window.VIPData.online);
  $("#storage-info").innerHTML = `
    Perfis: <b>${DATA.perfis.length}</b> · Cidades: <b>${Object.keys(DATA.cidades).length}</b><br>
    Conexão: <b style="color:${online ? "#8e8" : "#e88"}">${online ? "Supabase conectado" : "verificando / offline"}</b>`;
}

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  try {
    await reload();
  } catch (e) {
    toast("Erro ao carregar dados: " + (e.message || e), true);
    DATA = { adminWhatsapp: "", cidades: {}, perfis: [], stories: [] };
    updateBadge();
  }
  $("#filtro-cidade").innerHTML = `<option value="">Todas as cidades</option>` +
    Object.keys(DATA.cidades).map(k => `<option value="${k}">${DATA.cidades[k].nome}</option>`).join("");
  renderLista();
}

initLogin();
