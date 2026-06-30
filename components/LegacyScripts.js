import { useEffect } from "react";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-legacy-src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.legacySrc = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.body.appendChild(script);
  });
}

export default function LegacyScripts({ scripts }) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const src of scripts) {
        if (cancelled) return;
        await loadScript(src);
      }
      if (!cancelled) {
        document.dispatchEvent(new Event("DOMContentLoaded"));
      }
    })().catch(error => {
      console.error(error);
    });

    return () => {
      cancelled = true;
    };
  }, [scripts]);

  return null;
}
