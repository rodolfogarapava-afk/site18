import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import shellHtml from "../../public/app.html?raw";
import { renderSeoShell } from "../lib/seo-prerender";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async ({ request }) => renderSeoShell(shellHtml as string, request),
    },
  },
});
