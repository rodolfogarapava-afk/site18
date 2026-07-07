import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/site18/index.html");
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Carregando site…</p>
    </div>
  );
}
