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

  const RJ_BAIRROS_PUBLICADOS = [
    { slug: "leblon", nome: "Leblon" },
    { slug: "ipanema", nome: "Ipanema" },
    { slug: "copacabana", nome: "Copacabana" },
    { slug: "barra-da-tijuca", nome: "Barra da Tijuca" },
    { slug: "recreio", nome: "Recreio" },
  ];
  const RJ_BAIRROS_LEGADOS = {
    "barra-e-recreio": "barra-da-tijuca",
    "leblon-ipanema": "leblon",
  };

  function normalizarBairroPerfil(cidade, bairro) {
    if (cidade !== "rio-de-janeiro") return bairro || "";
    const slug = RJ_BAIRROS_LEGADOS[bairro] || bairro || "";
    return RJ_BAIRROS_PUBLICADOS.some(item => item.slug === slug) ? slug : "";
  }

  /* ---------- Client Supabase ---------- */
  let sb = null;
  // O banco antigo pode ainda não ter a migration de áudio/vídeo. O valor é
  // detectado na leitura e também corrigido de forma defensiva no upsert.
  let perfilAudioColumnAvailable = null;
  let perfilVideoColumnAvailable = null;
  let perfilCasaisColumnAvailable = null;
  let perfilVideosColumnAvailable = null;
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
      bairro:      normalizarBairroPerfil(r.cidade, r.bairro),
      whatsapp:    r.whatsapp,
      idade:       r.idade,
      altura:      r.altura,
      manequim:    r.manequim,
      medidas:     r.medidas,
      corOlhos:    r.cor_olhos || "",
      corPele:      r.cor_pele || "",
      corCabelo:   r.cor_cabelo || "",
      valorHora:   r.valor_hora,
      possuiLocal: !!r.possui_local,
      nova:        !!r.nova,
      exclusiva:   !!r.exclusiva,
      temVideo:    !!r.tem_video,
      destaque:    !!r.destaque,
      hue:         r.hue,
      descricao:   r.descricao || "",
      descricaoCurta: r.descricao_curta || "",
      servicos:    Array.isArray(r.servicos)    ? r.servicos    : [],
      atendimento: Array.isArray(r.atendimento) ? r.atendimento : [],
      idiomas:     Array.isArray(r.idiomas)     ? r.idiomas     : [],
      horario:     r.horario || "",
      fotos:       Array.isArray(r.fotos)       ? r.fotos       : [],
      audioUrl:    r.audio_url || "",
      videoUrl:    r.video_url || "",
      // Lista de vídeos (novo). Perfis salvos antes desta lista existir (ou
      // com o banco ainda sem a coluna) caem no vídeo único legado acima —
      // ver perfilVideos() em app.js/admin.js.
      videos:      Array.isArray(r.videos) ? r.videos : [],
      ordem:       r.ordem || 0,
      metaTitulo:    r.meta_titulo || "",
      metaDescricao: r.meta_descricao || "",
      // Opt-in explícito no painel — nunca assumido como true por padrão.
      atendeCasais: !!r.atende_casais,
      valorCasais:  r.valor_casais || "",
    };
  }

  /* Converte um perfil (JS) numa linha para upsert no banco.
     `ordem` é opcional (usado ao reordenar a lista). `opts.includeAudio` /
     `opts.includeVideo` controlam se esses campos (opcionais, podem ainda
     não existir no banco) entram no upsert. */
  function perfilToRow(p, ordem, opts = {}) {
    const includeAudio = opts.includeAudio !== undefined ? opts.includeAudio : perfilAudioColumnAvailable !== false;
    const includeVideo = opts.includeVideo !== undefined ? opts.includeVideo : perfilVideoColumnAvailable !== false;
    const includeCasais = opts.includeCasais !== undefined ? opts.includeCasais : perfilCasaisColumnAvailable !== false;
    const includeVideos = opts.includeVideos !== undefined ? opts.includeVideos : perfilVideosColumnAvailable !== false;
    const row = {
      slug:         p.slug,
      nome:         p.nome,
      cidade:       p.cidade || null,
      bairro:       normalizarBairroPerfil(p.cidade, p.bairro) || null,
      whatsapp:     p.whatsapp || "",
      idade:        p.idade || null,
      altura:       p.altura || null,
      manequim:     p.manequim || null,
      medidas:      p.medidas || null,
      cor_olhos:    p.corOlhos || null,
      cor_pele:     p.corPele || null,
      cor_cabelo:   p.corCabelo || null,
      valor_hora:   p.valorHora || "Sob consulta",
      possui_local: !!p.possuiLocal,
      nova:         !!p.nova,
      exclusiva:    !!p.exclusiva,
      tem_video:    !!p.temVideo,
      destaque:     !!p.destaque,
      hue:          p.hue || 300,
      descricao:    p.descricao || "",
      descricao_curta: p.descricaoCurta || null,
      servicos:     p.servicos    || [],
      atendimento:  p.atendimento || [],
      idiomas:      p.idiomas     || [],
      horario:      p.horario || "",
      fotos:        p.fotos       || [],
      meta_titulo:    p.metaTitulo || null,
      meta_descricao: p.metaDescricao || null,
    };
    if (includeAudio) row.audio_url = p.audioUrl || null;
    if (includeVideo) row.video_url = p.videoUrl || null;
    if (includeCasais) {
      row.atende_casais = !!p.atendeCasais;
      row.valor_casais = p.valorCasais || null;
    }
    if (includeVideos) row.videos = Array.isArray(p.videos) ? p.videos : [];
    if (p.id) row.id = p.id;
    if (typeof ordem === "number") row.ordem = ordem;
    return row;
  }

  function isMissingPerfilColumn(error, coluna) {
    if (!error) return false;
    const text = [error.message, error.details, error.hint]
      .filter(Boolean).join(" ").toLowerCase();
    return text.includes(coluna) && (
      error.code === "PGRST204" ||
      error.code === "42703" ||
      text.includes("does not exist") ||
      text.includes("could not find") ||
      text.includes("schema cache")
    );
  }
  const isMissingPerfilAudioColumn = error => isMissingPerfilColumn(error, "audio_url");
  const isMissingPerfilVideoColumn = error => isMissingPerfilColumn(error, "video_url");
  const isMissingPerfilCasaisColumn = error => isMissingPerfilColumn(error, "atende_casais");
  const isMissingPerfilVideosColumn = error => isMissingPerfilColumn(error, "videos");

  async function supportsPerfilOptionalColumn(coluna, cacheGetSet) {
    const [get, set] = cacheGetSet;
    if (get() !== null) return get();
    if (!sb) throw new Error("Supabase indisponível.");

    const { error } = await sb.from("perfis").select(coluna).limit(1);
    if (error && isMissingPerfilColumn(error, coluna)) {
      set(false);
      return false;
    }
    if (error) throw error;
    set(true);
    return true;
  }
  const supportsPerfilAudioColumn = () => supportsPerfilOptionalColumn("audio_url",
    [() => perfilAudioColumnAvailable, v => { perfilAudioColumnAvailable = v; }]);
  const supportsPerfilVideoColumn = () => supportsPerfilOptionalColumn("video_url",
    [() => perfilVideoColumnAvailable, v => { perfilVideoColumnAvailable = v; }]);
  const supportsPerfilCasaisColumn = () => supportsPerfilOptionalColumn("atende_casais",
    [() => perfilCasaisColumnAvailable, v => { perfilCasaisColumnAvailable = v; }]);
  const supportsPerfilVideosColumn = () => supportsPerfilOptionalColumn("videos",
    [() => perfilVideosColumnAvailable, v => { perfilVideosColumnAvailable = v; }]);

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

  const CITY_ACTIVE_ORDER_OFFSET = 10000;

  /* Linhas de `cidades` (banco) -> objeto indexado por slug (JS).
     Bancos que ainda não receberam a coluna `ativa` usam temporariamente
     uma faixa reservada de `ordem`, preservando o controle do painel. */
  function rowsToCidades(rows) {
    const out = {};
    (rows || []).forEach(c => {
      const rawOrder = Number(c.ordem) || 0;
      const encoded = rawOrder >= CITY_ACTIVE_ORDER_OFFSET;
      const encodedOrder = encoded ? rawOrder - CITY_ACTIVE_ORDER_OFFSET : rawOrder;
      const ordem = encoded ? Math.floor(encodedOrder / 2) : rawOrder;
      out[c.slug] = {
        nome: c.nome,
        uf: c.uf,
        bairros: c.slug === "rio-de-janeiro"
          ? clone(RJ_BAIRROS_PUBLICADOS)
          : (Array.isArray(c.bairros) ? c.bairros : []),
        ordem,
        ativa: typeof c.ativa === "boolean"
          ? c.ativa
          : encoded
            ? encodedOrder % 2 === 0
            : c.slug === "rio-de-janeiro",
      };
    });
    return out;
  }

  /* objeto `cidades` (JS) -> array de linhas para upsert */
  function cidadesToRows(cidades, includeActive = true) {
    return Object.keys(cidades || {}).map((slug, i) => {
      const cidade = cidades[slug];
      const ativa = cidade.ativa !== false;
      const ordem = typeof cidade.ordem === "number" ? cidade.ordem : i;
      const row = {
        slug,
        nome: cidade.nome,
        uf: cidade.uf,
        bairros: slug === "rio-de-janeiro"
          ? clone(RJ_BAIRROS_PUBLICADOS)
          : (cidade.bairros || []),
        ordem: includeActive
          ? ordem
          : CITY_ACTIVE_ORDER_OFFSET + (ordem * 2) + (ativa ? 0 : 1),
      };
      if (includeActive) row.ativa = ativa;
      return row;
    });
  }

  function isMissingCityActiveColumn(error) {
    if (!error) return false;
    const text = [error.message, error.details, error.hint]
      .filter(Boolean).join(" ").toLowerCase();
    return text.includes("ativa") && (
      error.code === "PGRST204" ||
      error.code === "42703" ||
      text.includes("does not exist") ||
      text.includes("could not find") ||
      text.includes("schema cache")
    );
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

    if (perfilAudioColumnAvailable === null && perRes.data?.length) {
      perfilAudioColumnAvailable = Object.prototype.hasOwnProperty.call(perRes.data[0], "audio_url");
    }
    if (perfilVideoColumnAvailable === null && perRes.data?.length) {
      perfilVideoColumnAvailable = Object.prototype.hasOwnProperty.call(perRes.data[0], "video_url");
    }
    if (perfilCasaisColumnAvailable === null && perRes.data?.length) {
      perfilCasaisColumnAvailable = Object.prototype.hasOwnProperty.call(perRes.data[0], "atende_casais");
    }
    if (perfilVideosColumnAvailable === null && perRes.data?.length) {
      perfilVideosColumnAvailable = Object.prototype.hasOwnProperty.call(perRes.data[0], "videos");
    }

    const stories = (stoRes && !stoRes.error && Array.isArray(stoRes.data))
      ? stoRes.data.map(rowToStory) : [];

    return {
      adminWhatsapp: (cfgRes.data && cfgRes.data.admin_whatsapp) || "",
      modelSupportWhatsapp: (cfgRes.data && cfgRes.data.model_support_whatsapp) || "5511996425680",
      pixel: {
        metaPixelId: (cfgRes.data && cfgRes.data.meta_pixel_id) || "",
        metaPixelEnabled: !!(cfgRes.data && cfgRes.data.meta_pixel_enabled),
      },
      banner: normalizeBanner(cfgRes.data && cfgRes.data.banner),
      cidades: rowsToCidades(cidRes.data),
      perfis: (perRes.data || []).map(rowToPerfil),
      stories,
    };
  }

  /* Estrutura padrão do banner (3 garotas em destaque na home). */
  function defaultBanner() {
    return {
      enabled: false,
      titulo: "Destaques da semana",
      subtitulo: "Três acompanhantes selecionadas para você",
      ctaLabel: "Falar no WhatsApp",
      slots: [
        { perfilSlug: "", nome: "", foto: "", whatsapp: "", tag: "TOP 1" },
        { perfilSlug: "", nome: "", foto: "", whatsapp: "", tag: "EXCLUSIVA" },
        { perfilSlug: "", nome: "", foto: "", whatsapp: "", tag: "NOVA" },
      ],
    };
  }
  function normalizeBanner(raw) {
    const d = defaultBanner();
    if (!raw || typeof raw !== "object") return d;
    const slots = Array.isArray(raw.slots) ? raw.slots.slice(0, 3) : [];
    while (slots.length < 3) slots.push(d.slots[slots.length]);
    return {
      enabled: !!raw.enabled,
      titulo: typeof raw.titulo === "string" ? raw.titulo : d.titulo,
      subtitulo: typeof raw.subtitulo === "string" ? raw.subtitulo : d.subtitulo,
      ctaLabel: typeof raw.ctaLabel === "string" && raw.ctaLabel ? raw.ctaLabel : d.ctaLabel,
      slots: slots.map(s => ({
        perfilSlug: (s && s.perfilSlug) || "",
        nome:       (s && s.nome) || "",
        foto:       (s && s.foto) || "",
        fotoMobile: (s && s.fotoMobile) || "",
        whatsapp:   ((s && s.whatsapp) || "").replace(/\D/g, ""),
        tag:        (s && s.tag) || "",
      })),
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
      window.MODEL_SUPPORT_WHATSAPP = d.modelSupportWhatsapp || "5511996425680";
      window.META_PIXEL_ID = d.pixel?.metaPixelId || "";
      window.META_PIXEL_ENABLED = !!d.pixel?.metaPixelEnabled;
      window.CIDADES        = d.cidades;
      window.PERFIS         = d.perfis;
      window.STORIES        = storiesPublicas(d.stories);
      window.BANNER         = d.banner || defaultBanner();
      window.VIPData.online = true;
    } catch (e) {
      // Fallback offline: usa o SEED de fábrica (data.js)
      console.warn("Usando dados de fallback (SEED). Motivo:", e && e.message);
      const s = (typeof SEED !== "undefined") ? clone(SEED) : { adminWhatsapp: "", cidades: {}, perfis: [] };
      window.ADMIN_WHATSAPP = s.adminWhatsapp;
      window.MODEL_SUPPORT_WHATSAPP = s.modelSupportWhatsapp || "5511996425680";
      window.META_PIXEL_ID = s.pixel?.metaPixelId || "";
      window.META_PIXEL_ENABLED = !!s.pixel?.metaPixelEnabled;
      window.CIDADES        = s.cidades;
      window.PERFIS         = s.perfis;
      window.STORIES        = [];
      window.BANNER         = defaultBanner();
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
  if (typeof window.MODEL_SUPPORT_WHATSAPP === "undefined")
    window.MODEL_SUPPORT_WHATSAPP = (typeof SEED !== "undefined" && SEED.modelSupportWhatsapp) ? SEED.modelSupportWhatsapp : "5511996425680";
  if (typeof window.META_PIXEL_ID === "undefined")
    window.META_PIXEL_ID = (typeof SEED !== "undefined" && SEED.pixel) ? SEED.pixel.metaPixelId || "" : "";
  if (typeof window.META_PIXEL_ENABLED === "undefined")
    window.META_PIXEL_ENABLED = !!(typeof SEED !== "undefined" && SEED.pixel && SEED.pixel.metaPixelEnabled);
  if (typeof window.STORIES === "undefined")
    window.STORIES = [];
  if (typeof window.BANNER === "undefined")
    window.BANNER = defaultBanner();

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
      async isAdmin() {
        requireSb();
        const { data, error } = await sb.rpc("is_current_user_admin");
        if (error) throw error;
        return data === true;
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

    async listAuditLogs(limit = 100) {
      requireSb();
      const { data, error } = await sb.from("audit_logs")
        .select("id,created_at,actor_email,action,entity,entity_id,summary")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },

    async listAccessLogs(limit = 150) {
      requireSb();
      const { data, error } = await sb.from("access_logs")
        .select("id,created_at,event_type,path,ip_address,user_agent,referrer,country_code,admin_email")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },

    async logAccess(eventType, path) {
      requireSb();
      const { error } = await sb.rpc("record_access_event", {
        p_event_type: eventType,
        p_path: path || "/",
      });
      if (error) throw error;
    },

    /* ----- Perfis ----- */
    async supportsPerfilAudio() {
      requireSb();
      return supportsPerfilAudioColumn();
    },
    async supportsPerfilVideo() {
      requireSb();
      return supportsPerfilVideoColumn();
    },
    async supportsPerfilCasais() {
      requireSb();
      return supportsPerfilCasaisColumn();
    },
    async supportsPerfilVideos() {
      requireSb();
      return supportsPerfilVideosColumn();
    },
    async savePerfil(perfil, ordem) {
      requireSb();
      let includeAudio = perfilAudioColumnAvailable !== false;
      let includeVideo = perfilVideoColumnAvailable !== false;
      let includeCasais = perfilCasaisColumnAvailable !== false;
      let includeVideos = perfilVideosColumnAvailable !== false;
      let audioSkipped = false, videoSkipped = false, casaisSkipped = false, videosSkipped = false;
      let result;
      // Até 5 tentativas: uma com tudo, e uma a menos pra cada coluna opcional
      // que o banco ainda não tiver (áudio, vídeo único legado, atendimento
      // de casais e/ou a lista de vídeos).
      for (let tentativa = 0; tentativa < 5; tentativa++) {
        result = await sb.from("perfis")
          .upsert(perfilToRow(perfil, ordem, { includeAudio, includeVideo, includeCasais, includeVideos }), { onConflict: "slug" })
          .select()
          .single();
        if (!result.error) break;
        if (includeAudio && isMissingPerfilAudioColumn(result.error)) {
          perfilAudioColumnAvailable = false;
          includeAudio = false;
          audioSkipped = !!perfil.audioUrl;
          continue;
        }
        if (includeVideo && isMissingPerfilVideoColumn(result.error)) {
          perfilVideoColumnAvailable = false;
          includeVideo = false;
          videoSkipped = !!perfil.videoUrl;
          continue;
        }
        if (includeCasais && isMissingPerfilCasaisColumn(result.error)) {
          perfilCasaisColumnAvailable = false;
          includeCasais = false;
          casaisSkipped = !!perfil.atendeCasais;
          continue;
        }
        if (includeVideos && isMissingPerfilVideosColumn(result.error)) {
          perfilVideosColumnAvailable = false;
          includeVideos = false;
          videosSkipped = Array.isArray(perfil.videos) && perfil.videos.length > 1;
          continue;
        }
        break;
      }

      if (result.error) throw result.error;
      if (includeAudio) perfilAudioColumnAvailable = true;
      if (includeVideo) perfilVideoColumnAvailable = true;
      if (includeCasais) perfilCasaisColumnAvailable = true;
      if (includeVideos) perfilVideosColumnAvailable = true;
      const saved = rowToPerfil(result.data);
      saved.audioSkipped = audioSkipped;
      saved.videosSkipped = videosSkipped;
      saved.videoSkipped = videoSkipped;
      saved.casaisSkipped = casaisSkipped;
      return saved;
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
      let rows = cidadesToRows(cidades);
      let { error: upErr } = await sb.from("cidades").upsert(rows, { onConflict: "slug" });
      if (isMissingCityActiveColumn(upErr)) {
        rows = cidadesToRows(cidades, false);
        ({ error: upErr } = await sb.from("cidades").upsert(rows, { onConflict: "slug" }));
      }
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

    /* ----- Config (WhatsApp central + banner destaque) ----- */
    async saveConfig(config) {
      requireSb();
      const cfg = typeof config === "object"
        ? config
        : { adminWhatsapp: config };
      const row = {
        id: 1,
        admin_whatsapp: cfg.adminWhatsapp || "",
        model_support_whatsapp: cfg.modelSupportWhatsapp || "5511996425680",
        meta_pixel_id: cfg.metaPixelId || "",
        meta_pixel_enabled: !!cfg.metaPixelEnabled,
      };
      const hasBanner = cfg.banner && typeof cfg.banner === "object";
      if (hasBanner) row.banner = normalizeBanner(cfg.banner);
      let { error } = await sb.from("config").upsert(row, { onConflict: "id" });
      // Se a coluna `banner` ainda não existe no banco, tenta de novo sem ela.
      if (error && hasBanner && /banner/i.test(error.message || "")) {
        delete row.banner;
        const retry = await sb.from("config").upsert(row, { onConflict: "id" });
        error = retry.error;
        if (!error) throw new Error("Banner não pôde ser salvo: adicione a coluna `banner jsonb` na tabela `config` do Supabase. As outras configurações foram salvas.");
      }
      if (error) throw error;
    },

    /* ----- Upload de foto no Storage -> retorna URL pública -----
       `slugHint` (opcional) prefixa o nome do arquivo com o slug do
       perfil, dando valor de SEO de imagem sem comprometer unicidade. */
    async uploadFoto(blob, ext, slugHint) {
      requireSb();
      const bucket = window.SB_BUCKET || "perfis";
      const rand = Math.random().toString(36).slice(2, 10);
      const stamp = (window.performance && performance.now ? Math.floor(performance.now()) : 0);
      const safeSlug = (slugHint || "").toString().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
      const path = `fotos/${safeSlug ? safeSlug + "-" : ""}${stamp}-${rand}.${ext || "jpg"}`;
      const { error } = await sb.storage.from(bucket).upload(path, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = sb.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },

    /* ----- Upload genérico (ex.: vídeos de story/perfil) -> retorna URL pública -----
       Envia o arquivo/blob "como está" (sem reprocessar no canvas).
       `pasta` define o prefixo no bucket (padrão "stories"). `contentTypeHint`
       é usado quando `fileOrBlob.type` vem vazio — comum em .mov exportado de
       iPhone em alguns navegadores/SOs — pra não gravar como
       application/octet-stream, o que impede a reprodução real do vídeo
       (o arquivo até existe, mas o navegador não sabe que é vídeo). */
    async uploadArquivo(fileOrBlob, ext, pasta, contentTypeHint) {
      requireSb();
      const bucket = window.SB_BUCKET || "perfis";
      const rand = Math.random().toString(36).slice(2, 10);
      const stamp = (window.performance && performance.now ? Math.floor(performance.now()) : 0);
      const safeExt = (ext || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
      const path = `${pasta || "stories"}/${stamp}-${rand}.${safeExt}`;
      const { error } = await sb.storage.from(bucket).upload(path, fileOrBlob, {
        contentType: fileOrBlob.type || contentTypeHint || "application/octet-stream",
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
      const backupHasAudio = d.perfis.some(p => p.audioUrl || p.audio || p.audio_url);
      if (backupHasAudio && !(await supportsPerfilAudioColumn())) {
        throw new Error("O backup contém áudios, mas o banco ainda não aceita esse campo. Atualize o banco e recarregue a página antes de restaurar.");
      }
      const backupHasVideo = d.perfis.some(p => p.videoUrl || p.video_url);
      if (backupHasVideo && !(await supportsPerfilVideoColumn())) {
        throw new Error("O backup contém vídeos, mas o banco ainda não aceita esse campo. Atualize o banco e recarregue a página antes de restaurar.");
      }
      await this.saveConfig({
        adminWhatsapp: d.adminWhatsapp,
        modelSupportWhatsapp: d.modelSupportWhatsapp || "5511996425680",
        metaPixelId: d.pixel?.metaPixelId || "",
        metaPixelEnabled: !!d.pixel?.metaPixelEnabled,
      });
      await this.saveCidades(d.cidades);

      // perfis: upsert de todos e remoção dos que não vieram no backup
      let includeAudio = perfilAudioColumnAvailable !== false;
      let includeVideo = perfilVideoColumnAvailable !== false;
      let includeCasais = perfilCasaisColumnAvailable !== false;
      let includeVideos = perfilVideosColumnAvailable !== false;
      let rows = d.perfis.map((p, i) => perfilToRow(p, i, { includeAudio, includeVideo, includeCasais, includeVideos }));
      if (rows.length) {
        let result;
        for (let tentativa = 0; tentativa < 5; tentativa++) {
          result = await sb.from("perfis").upsert(rows, { onConflict: "slug" });
          if (!result.error) break;
          if (includeAudio && isMissingPerfilAudioColumn(result.error)) {
            perfilAudioColumnAvailable = false;
            includeAudio = false;
            rows = d.perfis.map((p, i) => perfilToRow(p, i, { includeAudio, includeVideo, includeCasais, includeVideos }));
            continue;
          }
          if (includeVideo && isMissingPerfilVideoColumn(result.error)) {
            perfilVideoColumnAvailable = false;
            includeVideo = false;
            rows = d.perfis.map((p, i) => perfilToRow(p, i, { includeAudio, includeVideo, includeCasais, includeVideos }));
            continue;
          }
          if (includeCasais && isMissingPerfilCasaisColumn(result.error)) {
            perfilCasaisColumnAvailable = false;
            includeCasais = false;
            rows = d.perfis.map((p, i) => perfilToRow(p, i, { includeAudio, includeVideo, includeCasais, includeVideos }));
            continue;
          }
          if (includeVideos && isMissingPerfilVideosColumn(result.error)) {
            perfilVideosColumnAvailable = false;
            includeVideos = false;
            rows = d.perfis.map((p, i) => perfilToRow(p, i, { includeAudio, includeVideo, includeCasais, includeVideos }));
            continue;
          }
          break;
        }
        if (result.error) throw result.error;
        if (includeAudio) perfilAudioColumnAvailable = true;
        if (includeVideo) perfilVideoColumnAvailable = true;
        if (includeCasais) perfilCasaisColumnAvailable = true;
        if (includeVideos) perfilVideosColumnAvailable = true;
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
    seed() {
      const data = (typeof SEED !== "undefined") ? clone(SEED) : { adminWhatsapp: "", cidades: {}, perfis: [] };
      Object.keys(data.cidades || {}).forEach(slug => {
        if (typeof data.cidades[slug].ativa !== "boolean") {
          data.cidades[slug].ativa = slug === "rio-de-janeiro";
        }
      });
      return data;
    },

    /* Restaura o padrão de fábrica no banco. */
    async resetToSeed() { await this.importAll(this.seed()); },
  };
})();
