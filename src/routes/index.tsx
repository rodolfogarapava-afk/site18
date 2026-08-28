import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import shellHtml from "../../public/app.html?raw";
import { renderLegacySeoShell } from "../lib/legacy-seo";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async ({ request }) => renderLegacySeoShell(shellHtml as string, request),
    },
  },
});
