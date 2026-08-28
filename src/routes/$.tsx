import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import shellHtml from "../../public/app.html?raw";
import { renderLegacySeoShell } from "../lib/legacy-seo";

/**
 * Splat global: qualquer URL que não seja arquivo estático ou rota
 * declarada devolve o shell SPA. Permite deep-links (/cidade/xxx) via
 * History API.
 */
export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: async ({ request }) => renderLegacySeoShell(shellHtml as string, request),
    },
  },
});
