/* ============================================================
   ALIANÇA — Camada de dados (Supabase)
   ------------------------------------------------------------
   Substitui o antigo store de localStorage. Agora:
     - O SITE PÚBLICO (app.js) lê do Supabase (leitura pública via RLS).
       Enquanto carrega, expõe window.VIPData.ready (Promise) e popula
       window.CIDADES / window.PERFIS / window.ADMIN_WHATSAPP no MESMO
       formato de antes (para não mudar o app.js além da espera).
     - O PAINEL ADMIN (admin.js) usa window.VIPStore (agora ASSÍNCRONO)
       para login, CRUD, upload de fotos no Storage e backup.

   Requer (carregados ANTES deste arquivo no HTML):
     1) @supabase/supabase-js (CDN)  -> global `supabase`
     2) supabase-config.js           -> window.SB_URL / SB_ANON / SB_BUCKET
     3) data.js                      -> SEED (fallback offline / restaurar padrão)
   ============================================================ */
(function () {
  "use strict";

  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- Client Supabase ---------- */
  let sb = null;
  try {
    if (typeof supabase !== "undefined" && window.SB_URL && window.SB_ANON) {
      sb = supabase.createClient(window.SB_URL, window.SB_ANON);
      window.sb = sb;
    }
  } catch (e) {
    console.error("Falha ao iniciar o Supabase:", e);
  }

  /* ============================================================
     MAPEADORES  (banco snake_case  <->  JS camelCase)
     ============================================================ */
  function rowToPerfil(r) {
    return {
      id:          r.id,
      slug:        r.slug,
      nome:        r.nome,
      cidade:      r.cidade,
      bairro:      r.bairro,
      whatsapp:    r.whatsapp,
      idade:       r.idade,
      altura:      r.altura,
      manequim:    r.manequim,
      medidas:     r.medidas,
      valorHora:   r.valor_hora,
      possuiLocal: !!r.possui_local,
      nova:        !!r.nova,
      exclusiva:   !!r.exclusiva,
      temVideo:    !!r.tem_video,
      destaque:    !!r.destaque,
      hue:         r.hue,
      descricao:   r.descricao || "",
      servicos:    Array.isArray(r.servicos)    ? r.servicos    : [],
      atendimento: Array.isArray(r.atendimento) ? r.atendimento : [],
      idiomas:     Array.isArray(r.idiomas)     ? r.idiomas     : [],
      horario:     r.horario || "",
      fotos:       Array.isArray(r.fotos)       ? r.fotos       : [],
      ordem:       r.ordem || 0,
    };
  }

  /* Converte um perfil (JS) numa linha para upsert no banco.
     `ordem` é opcional (usado ao reordenar a lista). */
  function perfilToRow(p, ordem) {
    const row = {
      slug:         p.slug,
      nome:         p.nome,
      cidade:       p.cidade || null,
      bairro:       p.bairro || null,
      whatsapp:     p.whatsapp || "",
      idade:        p.idade || null,
      altura:       p.altura || null,
      manequim:     p.manequim || null,
      medidas:      p.medidas || null,
      valor_hora:   p.valorHora || "Sob consulta",
      possui_local: !!p.possuiLocal,
      nova:         !!p.nova,
      exclusiva:    !!p.exclusiva,
      tem_video:    !!p.temVideo,
      destaque:     !!p.destaque,
      hue:          p.hue || 300,
      descricao:    p.descricao || "",
      servicos:     p.servicos    || [],
      atendimento:  p.atendimento || [],
      idiomas:      p.idiomas     || [],
      horario:      p.horario || "",
      fotos:        p.fotos       || [],
    };
    if (p.id) row.id = p.id;
    if (typeof ordem === "number") row.ordem = ordem;
    return row;
  }

  /* ----- Stories (destaques) ----- */
  function rowToStory(r) {
    return {
      id:        r.id,
      perfilId:  r.perfil_id || null,
      titulo:    r.titulo || "",
      capa:      r.capa || "",
      whatsapp:  r.whatsapp || "",
      midias:    Array.isArray(r.midias) ? r.midias : [],
      ativo:     r.ativo !== false,
      ordem:     r.ordem || 0,
      expiraEm:  r.expira_em || null,
      createdAt: r.created_at || null,
    };
  }
  function storyToRow(s, ordem) {
    const row = {
      perfil_id: s.perfilId || null,
      titulo:    s.titulo || "",
      capa:      s.capa || "",
      whatsapp:  (s.whatsapp || "").replace(/\D/g, ""),
      midias:    Array.isArray(s.midias) ? s.midias : [],
      ativo:     s.ativo !== false,
      expira_em: s.expiraEm || null,
    };
    if (s.id) row.id = s.id;
    if (typeof ordem === "number") row.ordem = ordem;
    else if (typeof s.ordem === "number") row.ordem = s.ordem;
    return row;
  }

  /* Linhas de `cidades` (banco) -> objeto indexado por slug (JS) */
  function rowsToCidades(rows) {
    const out = {};
    (rows || []).forEach(c => {
      out[c.slug] = {
        nome: c.nome,
        uf: c.uf,
        bairros: Array.isArray(c.bairros) ? c.bairros : [],
        ordem: c.ordem || 0,
      };
    });
    return out;
  }

  /* objeto `cidades` (JS) -> array de linhas para upsert */
  function cidadesToRows(cidades) {
    return Object.keys(cidades || {}).map((slug, i) => ({
      slug,
      nome: cidades[slug].nome,
      uf: cidades[slug].uf,
      bairros: cidades[slug].bairros || [],
      ordem: typeof cidades[slug].ordem === "number" ? cidades[slug].ordem : i,
    }));
  }

  /* ============================================================
     LEITURA  (usada pelo site público e pelo admin)
     ============================================================ */
  /* Garante que uma Promise resolva/rejeite em no máximo `ms` (evita
     ficar pendurado se o Supabase demorar ou estiver pausado). */
  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout ao carregar dados")), ms);
      promise.then(
        v => { clearTimeout(t); resolve(v); },
        e => { clearTimeout(t); reject(e); }
      );
    });
  }

  async function fetchAll() {
    if (!sb) throw new Error("Supabase indisponível.");

    const [cfgRes, cidRes, perRes, stoRes] = await Promise.all([
      sb.from("config").select("*").eq("id", 1).maybeSingle(),
      sb.from("cidades").select("*").order("ordem", { ascending: true }),
      sb.from("perfis").select("*")
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true }),
      // Stories são opcionais: se a tabela ainda não existir, não quebramos o site.
      sb.from("stories").select("*")
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false })
        .then(r => r, () => ({ data: [], error: null })),
    ]);

    if (cidRes.error) throw cidRes.error;
    if (perRes.error) throw perRes.error;

    const stories = (stoRes && !stoRes.error && Array.isArray(stoRes.data))
      ? stoRes.data.map(rowToStory) : [];

    return {
      adminWhatsapp: (cfgRes.data && cfgRes.data.admin_whatsapp) || "",
      cidades: rowsToCidades(cidRes.data),
      perfis: (perRes.data || []).map(rowToPerfil),
      stories,
    };
  }

  /* ============================================================
     SITE PÚBLICO — popula globais e expõe a Promise `ready`
     ============================================================ */
  /* Mantém só os stories visíveis ao público: ativos, com mídia e não
     expirados; ordenados por `ordem`. */
  function storiesPublicas(list) {
    const agora = Date.now();
    return (list || [])
      .filter(s => s.ativo && Array.isArray(s.midias) && s.midias.length &&
                   (!s.expiraEm || new Date(s.expiraEm).getTime() > agora))
      .sort((a, b) => (a.ordem - b.ordem));
  }

  async function bootPublic() {
    try {
      const d = await withTimeout(fetchAll(), 7000);
      window.ADMIN_WHATSAPP = d.adminWhatsapp || (typeof SEED !== "undefined" ? SEED.adminWhatsapp : "");
      window.CIDADES        = d.cidades;
      window.PERFIS         = d.perfis;
      window.STORIES        = storiesPublicas(d.stories);
      window.VIPData.online = true;
    } catch (e) {
      // Fallback offline: usa o SEED de fábrica (data.js)
      console.warn("Usando dados de fallback (SEED). Motivo:", e && e.message);
      const s = (typeof SEED !== "undefined") ? clone(SEED) : { adminWhatsapp: "", cidades: {}, perfis: [] };
      window.ADMIN_WHATSAPP = s.adminWhatsapp;
      window.CIDADES        = s.cidades;
      window.PERFIS         = s.perfis;
      window.STORIES        = [];
      window.VIPData.online = false;
    }
    return window.VIPData;
  }

  /* Defaults SÍNCRONOS dos globais usados pelo app.js (a partir do SEED).
     Sem isso, o app.js pode referenciar ADMIN_WHATSAPP/CIDADES/PERFIS
     ANTES de bootPublic() resolver (ex.: initHeader -> waAdmin), causando
     "ReferenceError: ADMIN_WHATSAPP is not defined" e tela em branco.
     bootPublic() depois sobrescreve com os dados ao vivo do Supabase. */
  if (typeof window.CIDADES === "undefined")
    window.CIDADES = (typeof SEED !== "undefined") ? clone(SEED.cidades) : {};
  if (typeof window.PERFIS === "undefined")
    window.PERFIS = (typeof SEED !== "undefined") ? clone(SEED.perfis) : [];
  if (typeof window.ADMIN_WHATSAPP === "undefined")
    window.ADMIN_WHATSAPP = (typeof SEED !== "undefined") ? SEED.adminWhatsapp : "";
  if (typeof window.STORIES === "undefined")
    window.STORIES = [];

  window.VIPData = { online: false };
  window.VIPData.ready = bootPublic();

  /* ============================================================
     API DO PAINEL ADMIN  (assíncrona)
     ============================================================ */
  function requireSb() {
    if (!sb) throw new Error("Conexão com o Supabase indisponível. Verifique a internet/config.");
  }

  window.VIPStore = {
    /* ----- Autenticação ----- */
    auth: {
      async signIn(email, senha) {
        requireSb();
        const { data, error } = await sb.auth.signInWithPassword({ email: (email || "").trim(), password: senha });
        if (error) throw error;
        return data;
      },
      async signOut() { if (sb) await sb.auth.signOut(); },
      async getSession() {
        if (!sb) return null;
        const { data } = await sb.auth.getSession();
        return data.session || null;
      },
      onChange(cb) {
        if (!sb) return { unsubscribe() {} };
        const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
        return data.subscription;
      },
      async updatePassword(novaSenha) {
        requireSb();
        const { error } = await sb.auth.updateUser({ password: novaSenha });
        if (error) throw error;
      },
    },

    /* ----- Leitura completa (para o admin) ----- */
    async loadAll() { return fetchAll(); },

    /* ----- Perfis ----- */
    async savePerfil(perfil, ordem) {
      requireSb();
      const { data, error } = await sb.from("perfis")
        .upsert(perfilToRow(perfil, ordem), { onConflict: "slug" })
        .select()
        .single();
      if (error) throw error;
      return rowToPerfil(data);
    },
    async deletePerfil(perfil) {
      requireSb();
      const q = sb.from("perfis").delete();
      const { error } = perfil.id
        ? await q.eq("id", perfil.id)
        : await q.eq("slug", perfil.slug);
      if (error) throw error;
    },

    /* ----- Stories ----- */
    async saveStory(story, ordem) {
      requireSb();
      const { data, error } = await sb.from("stories")
        .upsert(storyToRow(story, ordem))
        .select()
        .single();
      if (error) throw error;
      return rowToStory(data);
    },
    async deleteStory(story) {
      requireSb();
      const id = story && story.id ? story.id : story;
      const { error } = await sb.from("stories").delete().eq("id", id);
      if (error) throw error;
    },
    /* Grava a ordem (e o estado ativo) de uma lista de stories. */
    async saveStoriesOrder(stories) {
      requireSb();
      const rows = (stories || []).map((s, i) => storyToRow(s, i));
      if (!rows.length) return;
      const { error } = await sb.from("stories").upsert(rows);
      if (error) throw error;
    },

    /* ----- Cidades ----- */
    /* Upsert das cidades atuais e remoção das que sumiram. */
    async saveCidades(cidades) {
      requireSb();
      const rows = cidadesToRows(cidades);
      const { error: upErr } = await sb.from("cidades").upsert(rows, { onConflict: "slug" });
      if (upErr) throw upErr;

      // remove cidades que não estão mais na lista
      const slugsAtuais = rows.map(r => r.slug);
      const { data: existentes, error: selErr } = await sb.from("cidades").select("slug");
      if (selErr) throw selErr;
      const remover = (existentes || []).map(c => c.slug).filter(s => !slugsAtuais.includes(s));
      if (remover.length) {
        const { error: delErr } = await sb.from("cidades").delete().in("slug", remover);
        if (delErr) throw delErr;
      }
    },
    async deleteCidade(slug) {
      requireSb();
      const { error } = await sb.from("cidades").delete().eq("slug", slug);
      if (error) throw error;
    },

    /* ----- Config (WhatsApp central) ----- */
    async saveConfig(adminWhatsapp) {
      requireSb();
      const { error } = await sb.from("config")
        .upsert({ id: 1, admin_whatsapp: adminWhatsapp || "" }, { onConflict: "id" });
      if (error) throw error;
    },

    /* ----- Upload de foto no Storage -> retorna URL pública ----- */
    async uploadFoto(blob, ext) {
      requireSb();
      const bucket = window.SB_BUCKET || "perfis";
      const rand = Math.random().toString(36).slice(2, 10);
      const stamp = (window.performance && performance.now ? Math.floor(performance.now()) : 0);
      const path = `fotos/${stamp}-${rand}.${ext || "jpg"}`;
      const { error } = await sb.storage.from(bucket).upload(path, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = sb.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },

    /* ----- Upload genérico (ex.: vídeos de story) -> retorna URL pública -----
       Envia o arquivo/blob "como está" (sem reprocessar no canvas).
       `pasta` define o prefixo no bucket (padrão "stories"). */
    async uploadArquivo(fileOrBlob, ext, pasta) {
      requireSb();
      const bucket = window.SB_BUCKET || "perfis";
      const rand = Math.random().toString(36).slice(2, 10);
      const stamp = (window.performance && performance.now ? Math.floor(performance.now()) : 0);
      const safeExt = (ext || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
      const path = `${pasta || "stories"}/${stamp}-${rand}.${safeExt}`;
      const { error } = await sb.storage.from(bucket).upload(path, fileOrBlob, {
        contentType: fileOrBlob.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;
      const { data } = sb.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },

    /* ----- Backup ----- */
    async exportAll() { return fetchAll(); },

    /* Grava um backup completo no banco (substitui o conteúdo atual). */
    async importAll(d) {
      requireSb();
      if (!d || !d.cidades || !Array.isArray(d.perfis)) throw new Error("Formato de backup inválido.");
      await this.saveConfig(d.adminWhatsapp);
      await this.saveCidades(d.cidades);

      // perfis: upsert de todos e remoção dos que não vieram no backup
      const rows = d.perfis.map((p, i) => perfilToRow(p, i));
      if (rows.length) {
        const { error } = await sb.from("perfis").upsert(rows, { onConflict: "slug" });
        if (error) throw error;
      }
      const slugs = rows.map(r => r.slug);
      const { data: existentes, error: selErr } = await sb.from("perfis").select("slug");
      if (selErr) throw selErr;
      const remover = (existentes || []).map(p => p.slug).filter(s => !slugs.includes(s));
      if (remover.length) {
        const { error: delErr } = await sb.from("perfis").delete().in("slug", remover);
        if (delErr) throw delErr;
      }

      // Stories (opcional no backup): se vier a lista, faz upsert sem apagar os atuais.
      if (Array.isArray(d.stories) && d.stories.length) {
        const sRows = d.stories.map((s, i) => storyToRow(s, i));
        const { error: sErr } = await sb.from("stories").upsert(sRows);
        if (sErr) throw sErr;
      }
    },

    /* Cópia da semente de fábrica (data.js). */
    seed() { return (typeof SEED !== "undefined") ? clone(SEED) : { adminWhatsapp: "", cidades: {}, perfis: [] }; },

    /* Restaura o padrão de fábrica no banco. */
    async resetToSeed() { await this.importAll(this.seed()); },
  };
})();
