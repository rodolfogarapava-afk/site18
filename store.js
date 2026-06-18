/* ============================================================
   VIP LUXÚRIA — Camada de dados (store)
   Carrega os dados salvos pelo painel admin (localStorage).
   Se não houver nada salvo, usa o SEED de data.js.
   Deve ser incluído DEPOIS de data.js e ANTES de app.js/admin.js.
   ============================================================ */
(function () {
  const KEY = "vip_data";

  const clone = o => JSON.parse(JSON.stringify(o));

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.cidades && Array.isArray(s.perfis)) return s;
    } catch (e) {}
    return clone(SEED);
  }

  const data = load();

  /* Globais usados pelo site público (app.js) */
  window.ADMIN_WHATSAPP = data.adminWhatsapp || (SEED.adminWhatsapp);
  window.CIDADES        = data.cidades || SEED.cidades;
  window.PERFIS         = data.perfis  || SEED.perfis;

  /* API usada pelo painel admin (admin.js) */
  window.VIPStore = {
    KEY,
    /** Lê o estado atual (salvo ou semente), sempre como cópia editável. */
    current() { return load(); },
    /** Cópia da semente de fábrica. */
    seed() { return clone(SEED); },
    /** Salva tudo no navegador. */
    save(d) { localStorage.setItem(KEY, JSON.stringify(d)); },
    /** Apaga os dados salvos (volta ao SEED). */
    reset() { localStorage.removeItem(KEY); },
    /** Existe algo salvo? */
    hasSaved() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } },
  };
})();
