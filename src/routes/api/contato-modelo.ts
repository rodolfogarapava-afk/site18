import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Rota exclusiva para a automação externa (bot de WhatsApp do Gusman):
 * dado o nome de uma acompanhante, devolve nome + WhatsApp dela.
 *
 * Protegida por chave (header X-Api-Key). Essa chave só existe no
 * bundle do servidor (roda no Worker da Cloudflare) — nunca é enviada
 * ao navegador, diferente da anon key pública do Supabase usada abaixo
 * (essa já é pública por natureza, é o mesmo padrão usado no restante
 * do projeto). Migrar essa chave para uma variável de ambiente da
 * Cloudflare é uma melhoria futura; hardcoded aqui já é seguro porque
 * o arquivo nunca é servido ao cliente.
 *
 * Não lê a tabela `perfis` diretamente: o nome vem da visão pública
 * `perfis_publico` (sem WhatsApp) e o número vem da função
 * `get_whatsapp_perfil` (RPC, um perfil por vez) — as mesmas duas peças
 * que o próprio site público usa, então continuam funcionando mesmo
 * depois que o acesso direto e em massa à tabela for revogado do anon.
 */
const GUSMAN_API_KEY = "cmYu_nrtV6m9EvM5NiLinVlmWX2-pwVY9sG05VVs4a8";

const SB_URL = "https://luwgedyzbxokosozhlwf.supabase.co";
const SB_ANON = "sb_publishable_yKN-Yy2Eu_Y-Bmw24eEpKQ_acLs0QET";

interface PerfilPublicoRow {
  nome: string;
  slug: string;
}

/* Normaliza pra comparar nomes com grafias/espaços diferentes no cadastro
   (ex.: "Ravena Baby " vs "Ravenna Baby") sem falhar por acento ou caixa. */
function normalizarNome(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function sbFetch(path: string): Promise<Response> {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/contato-modelo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (request.headers.get("x-api-key") !== GUSMAN_API_KEY) {
          return jsonResponse({ error: "unauthorized" }, 401);
        }

        const url = new URL(request.url);
        const nomeConsultado = url.searchParams.get("nome");
        if (!nomeConsultado) {
          return jsonResponse({ error: "parametro 'nome' e obrigatorio" }, 400);
        }

        const perfisRes = await sbFetch("perfis_publico?select=nome,slug");
        if (!perfisRes.ok) {
          return jsonResponse({ error: "erro ao consultar perfis" }, 502);
        }

        const perfis = (await perfisRes.json()) as PerfilPublicoRow[];
        const alvo = normalizarNome(nomeConsultado);
        const encontrado = perfis.find((p) => normalizarNome(p.nome) === alvo);
        if (!encontrado) {
          return jsonResponse({ error: "perfil nao encontrado" }, 404);
        }

        const rpcRes = await fetch(`${SB_URL}/rest/v1/rpc/get_whatsapp_perfil`, {
          method: "POST",
          headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json" },
          body: JSON.stringify({ p_slug: encontrado.slug }),
        });
        if (!rpcRes.ok) {
          return jsonResponse({ error: "erro ao consultar whatsapp" }, 502);
        }
        const whatsapp = (await rpcRes.json()) as string | null;
        if (!whatsapp) {
          return jsonResponse({ error: "perfil nao encontrado" }, 404);
        }

        return jsonResponse({ nome: encontrado.nome, whatsapp }, 200);
      },
    },
  },
});
