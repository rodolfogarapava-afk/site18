/* ============================================================
   ALIANÇA — Seed APENAS das cidades (capitais) no Supabase
   ------------------------------------------------------------
   Insere/atualiza só a tabela `cidades` a partir do data.js (SEED).
   É SEGURO e idempotente: faz upsert por slug e NÃO toca em `perfis`
   nem em `config`. Pode rodar quantas vezes quiser.

   Uso:
     SUPA_PW='senha-do-banco' node supabase/seed-cidades.cjs
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Extrai o SEED do data.js (o arquivo faz window.SEED = SEED)
const code = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
global.window = {};
eval(code);
const SEED = global.window.SEED;
if (!SEED || !SEED.cidades) { console.error("Não consegui ler SEED.cidades do data.js"); process.exit(1); }

if (!process.env.SUPA_PW) {
  console.error("Defina SUPA_PW com a senha do banco. Ex.: SUPA_PW='...' node supabase/seed-cidades.cjs");
  process.exit(1);
}

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

  let i = 0;
  for (const [slug, cid] of Object.entries(SEED.cidades)) {
    await c.query(
      "insert into public.cidades(slug,nome,uf,bairros,ordem) values($1,$2,$3,$4::jsonb,$5) on conflict(slug) do update set nome=excluded.nome,uf=excluded.uf,bairros=excluded.bairros,ordem=excluded.ordem",
      [slug, cid.nome, cid.uf, J(cid.bairros), i++]
    );
  }

  const cc = await c.query("select count(*)::int n from public.cidades");
  console.log("Seed de cidades OK -> total no banco:", cc.rows[0].n);
  await c.end();
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
