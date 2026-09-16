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
 */
const GUSMAN_API_KEY = "cmYu_nrtV6m9EvM5NiLinVlmWX2-pwVY9sG05VVs4a8";

const SB_URL = "https://luwgedyzbxokosozhlwf.supabase.co";
const SB_ANON = "sb_publishable_yKN-Yy2Eu_Y-Bmw24eEpKQ_acLs0QET";

interface PerfilRow {
  nome: string;
  whatsapp: string | null;
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

        const res = await fetch(`${SB_URL}/rest/v1/perfis?select=nome,whatsapp`, {
          headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
        });
        if (!res.ok) {
          return jsonResponse({ error: "erro ao consultar perfis" }, 502);
        }

        const perfis = (await res.json()) as PerfilRow[];
        const alvo = normalizarNome(nomeConsultado);
        const encontrado = perfis.find((p) => normalizarNome(p.nome) === alvo);

        if (!encontrado || !encontrado.whatsapp) {
          return jsonResponse({ error: "perfil nao encontrado" }, 404);
        }

        return jsonResponse({ nome: encontrado.nome, whatsapp: encontrado.whatsapp }, 200);
      },
    },
  },
});
