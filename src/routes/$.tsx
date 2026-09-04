import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import shellHtml from "../../public/app.html?raw";
import { renderSeoShell } from "../lib/seo-prerender";

/**
 * Splat global: qualquer URL que não seja arquivo estático ou rota
 * declarada devolve o shell SPA. Permite deep-links (/cidade/xxx) via
 * History API. Antes de devolver o shell, injeta título, meta tags,
 * canonical, JSON-LD e um trecho de conteúdo real da rota (ver
 * ../lib/seo-prerender.ts), para que buscadores enxerguem a página sem
 * depender exclusivamente da execução do JavaScript no cliente.
 */
export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: async ({ request }) => renderSeoShell(shellHtml as string, request),
    },
  },
});
