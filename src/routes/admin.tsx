import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import adminHtml from "../templates/admin.html?raw";

export const Route = createFileRoute("/admin")({
  server: {
    handlers: {
      GET: async () =>
        new Response(adminHtml as string, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        }),
    },
  },
});
