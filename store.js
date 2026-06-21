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
  async function fetchAll() {
    if (!sb) throw new Error("Supabase indisponível.");

    const [cfgRes, cidRes, perRes] = await Promise.all([
      sb.from("config").select("*").eq("id", 1).maybeSingle(),
      sb.from("cidades").select("*").order("ordem", { ascending: true }),
      sb.from("perfis").select("*")
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (cidRes.error) throw cidRes.error;
    if (perRes.error) throw perRes.error;

    return {
      adminWhatsapp: (cfgRes.data && cfgRes.data.admin_whatsapp) || "",
      cidades: rowsToCidades(cidRes.data),
      perfis: (perRes.data || []).map(rowToPerfil),
    };
  }

  /* ============================================================
     SITE PÚBLICO — popula globais e expõe a Promise `ready`
     ============================================================ */
  async function bootPublic() {
    try {
      const d = await fetchAll();
      window.ADMIN_WHATSAPP = d.adminWhatsapp || (typeof SEED !== "undefined" ? SEED.adminWhatsapp : "");
      window.CIDADES        = d.cidades;
      window.PERFIS         = d.perfis;
      window.VIPData.online = true;
    } catch (e) {
      // Fallback offline: usa o SEED de fábrica (data.js)
      console.warn("Usando dados de fallback (SEED). Motivo:", e && e.message);
      const s = (typeof SEED !== "undefined") ? clone(SEED) : { adminWhatsapp: "", cidades: {}, perfis: [] };
      window.ADMIN_WHATSAPP = s.adminWhatsapp;
      window.CIDADES        = s.cidades;
      window.PERFIS         = s.perfis;
      window.VIPData.online = false;
    }
    return window.VIPData;
  }

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
    },

    /* Cópia da semente de fábrica (data.js). */
    seed() { return (typeof SEED !== "undefined") ? clone(SEED) : { adminWhatsapp: "", cidades: {}, perfis: [] }; },

    /* Restaura o padrão de fábrica no banco. */
    async resetToSeed() { await this.importAll(this.seed()); },
  };
})();
