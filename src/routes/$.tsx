import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import shellHtml from "../../public/app.html?raw";

/**
 * Splat global: qualquer URL que não seja arquivo estático ou rota
 * declarada devolve o shell SPA. Permite deep-links (/cidade/xxx) via
 * History API.
 */
export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: async () =>
        new Response(shellHtml as string, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        }),
    },
  },
});
