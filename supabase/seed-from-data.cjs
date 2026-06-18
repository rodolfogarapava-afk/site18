/* ============================================================
   VIP LUXÚRIA — Seed do Supabase a partir do data.js (SEED)
   Uso:  SUPA_PW='senha-do-banco' node supabase/seed-from-data.cjs
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Extrai o SEED do data.js (o arquivo faz window.SEED = SEED)
const code = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
global.window = {};
eval(code);
const SEED = global.window.SEED;
if (!SEED) { console.error("Não consegui ler SEED do data.js"); process.exit(1); }

const c = new Client({
  host: "aws-1-us-east-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.luwgedyzbxokosozhlwf",
  password: process.env.SUPA_PW,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});
const J = v => JSON.stringify(v || []);

(async () => {
  await c.connect();

  await c.query(
    "insert into public.config(id,admin_whatsapp) values(1,$1) on conflict(id) do update set admin_whatsapp=excluded.admin_whatsapp",
    [SEED.adminWhatsapp]
  );

  let i = 0;
  for (const [slug, cid] of Object.entries(SEED.cidades)) {
    await c.query(
      "insert into public.cidades(slug,nome,uf,bairros,ordem) values($1,$2,$3,$4::jsonb,$5) on conflict(slug) do update set nome=excluded.nome,uf=excluded.uf,bairros=excluded.bairros,ordem=excluded.ordem",
      [slug, cid.nome, cid.uf, J(cid.bairros), i++]
    );
  }

  let n = 0;
  for (const p of SEED.perfis) {
    await c.query(
      `insert into public.perfis
        (slug,nome,cidade,bairro,whatsapp,idade,altura,manequim,medidas,valor_hora,possui_local,nova,exclusiva,tem_video,destaque,hue,descricao,servicos,atendimento,idiomas,horario,fotos,ordem)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20::jsonb,$21,$22::jsonb,$23)
       on conflict(slug) do update set
        nome=excluded.nome,cidade=excluded.cidade,bairro=excluded.bairro,whatsapp=excluded.whatsapp,
        idade=excluded.idade,altura=excluded.altura,manequim=excluded.manequim,medidas=excluded.medidas,
        valor_hora=excluded.valor_hora,possui_local=excluded.possui_local,nova=excluded.nova,
        exclusiva=excluded.exclusiva,tem_video=excluded.tem_video,destaque=excluded.destaque,hue=excluded.hue,
        descricao=excluded.descricao,servicos=excluded.servicos,atendimento=excluded.atendimento,
        idiomas=excluded.idiomas,horario=excluded.horario,ordem=excluded.ordem`,
      [p.slug, p.nome, p.cidade, p.bairro, p.whatsapp, p.idade, p.altura, p.manequim, p.medidas,
       p.valorHora, !!p.possuiLocal, !!p.nova, !!p.exclusiva, !!p.temVideo, !!p.destaque, p.hue || 300,
       p.descricao || "", J(p.servicos), J(p.atendimento), J(p.idiomas), p.horario || "", J(p.fotos), n++]
    );
  }

  const cc = await c.query("select count(*)::int n from public.cidades");
  const pc = await c.query("select count(*)::int n from public.perfis");
  console.log("Seed OK -> cidades:", cc.rows[0].n, "| perfis:", pc.rows[0].n);
  await c.end();
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
