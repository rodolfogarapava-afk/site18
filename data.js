/* ============================================================
   VIP LUXÚRIA — Dados SEMENTE (padrão de fábrica)
   ------------------------------------------------------------
   Este arquivo é o ponto de partida do site. Você pode:
     (A) Gerenciar tudo pelo PAINEL ADMIN (admin.html) — recomendado.
         O admin salva no navegador e gera um novo data.js para publicar.
     (B) Editar este arquivo à mão (cidades, perfis, WhatsApp).

   Quando o admin tiver dados salvos, eles têm prioridade sobre este SEED.
   Para voltar ao padrão: no admin, use "Restaurar padrão".
   ============================================================ */

const SEED = {

  /* WhatsApp central do administrador (home, botão flutuante na home,
     formulário "Anuncie aqui"). Formato: DDI + DDD + número, só dígitos. */
  adminWhatsapp: "5565999999999",

  /* ---------- CIDADES E BAIRROS ---------- */
  cidades: {
    "rio-de-janeiro": {
      nome: "Rio de Janeiro",
      uf: "RJ",
      bairros: [
        { slug: "zona-sul",        nome: "Zona Sul" },
        { slug: "copacabana",      nome: "Copacabana" },
        { slug: "barra-e-recreio", nome: "Barra e Recreio" },
        { slug: "leblon-ipanema",  nome: "Leblon, Ipanema e Outros" },
        { slug: "centro",          nome: "Centro" },
        { slug: "tijuca",          nome: "Tijuca" },
      ],
    },
    "cuiaba": {
      nome: "Cuiabá",
      uf: "MT",
      bairros: [
        { slug: "centro",           nome: "Centro" },
        { slug: "goiabeiras",       nome: "Goiabeiras" },
        { slug: "jardim-aclimacao", nome: "Jardim Aclimação" },
        { slug: "santa-rosa",       nome: "Santa Rosa" },
        { slug: "duque-de-caxias",  nome: "Duque de Caxias" },
        { slug: "cpa",              nome: "CPA" },
        { slug: "varzea-grande",    nome: "Várzea Grande" },
      ],
    },
  },

  /* ---------- PERFIS (ACOMPANHANTES) ----------
     Cada perfil tem seu PRÓPRIO whatsapp.
     "fotos": array de imagens (URLs ou base64 do admin). Se vazio,
     o site gera um placeholder elegante a partir do campo "hue".
  */
  perfis: [
    /* ===== RIO DE JANEIRO ===== */
    {
      slug: "luna-sophie-barra",
      nome: "Luna Sophie",
      cidade: "rio-de-janeiro",
      bairro: "barra-e-recreio",
      whatsapp: "5521999990001",
      idade: 24, altura: "1,72m", manequim: "38", medidas: "90-60-90",
      valorHora: "Sob consulta",
      possuiLocal: true, nova: true, exclusiva: true, temVideo: true, destaque: true,
      hue: 330, fotos: [],
      descricao: "Elegância e sofisticação para encontros inesquecíveis. Atendimento exclusivo, com total discrição, em ambiente climatizado e aconchegante na Barra da Tijuca.",
      servicos: ["Jantar romântico", "Eventos sociais", "Acompanhante para viagens", "Encontros íntimos"],
      atendimento: ["Com local próprio", "Hotéis", "Motéis", "Viagens"],
      idiomas: ["Português", "Inglês"],
      horario: "10h às 23h — Segunda a Sábado",
    },
    {
      slug: "valentina-copacabana",
      nome: "Valentina",
      cidade: "rio-de-janeiro",
      bairro: "copacabana",
      whatsapp: "5521999990002",
      idade: 27, altura: "1,68m", manequim: "40", medidas: "92-62-94",
      valorHora: "Sob consulta",
      possuiLocal: true, nova: false, exclusiva: true, temVideo: false, destaque: true,
      hue: 280, fotos: [],
      descricao: "Morena envolvente, carinhosa e discreta. A poucos passos da praia de Copacabana, ideal para quem busca companhia de alto padrão e momentos únicos.",
      servicos: ["Jantar a dois", "Eventos e festas", "Acompanhante executiva", "Pernoite"],
      atendimento: ["Com local próprio", "Hotéis", "Motéis"],
      idiomas: ["Português", "Espanhol"],
      horario: "12h às 00h — Todos os dias",
    },
    {
      slug: "isabela-leblon",
      nome: "Isabela",
      cidade: "rio-de-janeiro",
      bairro: "leblon-ipanema",
      whatsapp: "5521999990003",
      idade: 23, altura: "1,75m", manequim: "38", medidas: "88-58-92",
      valorHora: "Sob consulta",
      possuiLocal: false, nova: true, exclusiva: false, temVideo: true, destaque: false,
      hue: 200, fotos: [],
      descricao: "Loira de olhos claros, refinada e cativante. Atende em hotéis selecionados no Leblon e Ipanema, com a discrição que você merece.",
      servicos: ["Acompanhante para jantar", "Eventos sociais", "Viagens nacionais e internacionais"],
      atendimento: ["Hotéis", "Viagens"],
      idiomas: ["Português", "Inglês", "Francês"],
      horario: "14h às 23h — Segunda a Sábado",
    },
    {
      slug: "marina-zonasul",
      nome: "Marina",
      cidade: "rio-de-janeiro",
      bairro: "zona-sul",
      whatsapp: "5521999990004",
      idade: 29, altura: "1,70m", manequim: "42", medidas: "96-64-98",
      valorHora: "Sob consulta",
      possuiLocal: true, nova: false, exclusiva: false, temVideo: false, destaque: false,
      hue: 20, fotos: [],
      descricao: "Ruiva sensual e espontânea, perfeita para conversas agradáveis e companhia de qualidade na Zona Sul carioca.",
      servicos: ["Jantar romântico", "Encontros íntimos", "Eventos"],
      atendimento: ["Com local próprio", "Motéis"],
      idiomas: ["Português"],
      horario: "10h às 22h — Segunda a Sexta",
    },

    /* ===== CUIABÁ ===== */
    {
      slug: "ana-clara-centro",
      nome: "Ana Clara",
      cidade: "cuiaba",
      bairro: "centro",
      whatsapp: "5565999990005",
      idade: 25, altura: "1,67m", manequim: "38", medidas: "90-60-92",
      valorHora: "Sob consulta",
      possuiLocal: true, nova: true, exclusiva: true, temVideo: true, destaque: true,
      hue: 300, fotos: [],
      descricao: "Morena dos olhos castanhos, simpática e elegante. Atendimento premium no Centro de Cuiabá, com ambiente discreto e muito conforto.",
      servicos: ["Jantar a dois", "Eventos sociais", "Acompanhante para viagens", "Pernoite"],
      atendimento: ["Com local próprio", "Hotéis", "Motéis", "Viagens"],
      idiomas: ["Português", "Inglês"],
      horario: "10h às 23h — Todos os dias",
    },
    {
      slug: "bruna-goiabeiras",
      nome: "Bruna",
      cidade: "cuiaba",
      bairro: "goiabeiras",
      whatsapp: "5565999990006",
      idade: 26, altura: "1,73m", manequim: "40", medidas: "94-62-96",
      valorHora: "Sob consulta",
      possuiLocal: true, nova: false, exclusiva: true, temVideo: false, destaque: true,
      hue: 160, fotos: [],
      descricao: "Loira deslumbrante, carismática e cheia de charme. Companhia perfeita para jantares e eventos no bairro Goiabeiras.",
      servicos: ["Jantar romântico", "Eventos e festas", "Acompanhante executiva"],
      atendimento: ["Com local próprio", "Hotéis", "Motéis"],
      idiomas: ["Português", "Espanhol"],
      horario: "12h às 00h — Segunda a Sábado",
    },
    {
      slug: "rafaela-santa-rosa",
      nome: "Rafaela",
      cidade: "cuiaba",
      bairro: "santa-rosa",
      whatsapp: "5565999990007",
      idade: 22, altura: "1,69m", manequim: "36", medidas: "86-58-90",
      valorHora: "Sob consulta",
      possuiLocal: false, nova: true, exclusiva: false, temVideo: true, destaque: false,
      hue: 240, fotos: [],
      descricao: "Doce e muito atenciosa. Atende em hotéis e motéis na região do Santa Rosa, com total sigilo.",
      servicos: ["Encontros íntimos", "Jantar a dois", "Companhia para eventos"],
      atendimento: ["Hotéis", "Motéis"],
      idiomas: ["Português"],
      horario: "14h às 23h — Todos os dias",
    },
    {
      slug: "camila-cpa",
      nome: "Camila",
      cidade: "cuiaba",
      bairro: "cpa",
      whatsapp: "5565999990008",
      idade: 28, altura: "1,71m", manequim: "42", medidas: "98-66-100",
      valorHora: "Sob consulta",
      possuiLocal: true, nova: false, exclusiva: false, temVideo: false, destaque: false,
      hue: 40, fotos: [],
      descricao: "Mulher de classe, conversa agradável e presença marcante. Atendimento de alto nível na região do CPA.",
      servicos: ["Jantar romântico", "Eventos sociais", "Pernoite"],
      atendimento: ["Com local próprio", "Motéis"],
      idiomas: ["Português", "Inglês"],
      horario: "10h às 22h — Segunda a Sábado",
    },
  ],
};

/* Compatibilidade: se este arquivo for usado sem o store.js,
   ainda assim expõe a semente para inspeção. */
if (typeof window !== "undefined") window.SEED = SEED;
