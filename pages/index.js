import Head from "next/head";
import LegacyScripts from "../components/LegacyScripts";
import { readLegacyBody } from "../lib/legacyHtml";

const siteScripts = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "/supabase-config.js?v=20",
  "/data.js?v=21",
  "/store.js?v=22",
  "/app.js?v=34",
];

export async function getStaticProps() {
  return {
    props: {
      bodyHtml: readLegacyBody("index.html"),
    },
  };
}

export default function HomePage({ bodyHtml }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="rating" content="adult" />
        <meta
          name="description"
          content="Acompanhantes de luxo no Rio de Janeiro e em Cuiabá. Perfis verificados, total discrição. Conteúdo destinado a maiores de 18 anos."
        />
        <title>Aliança • Acompanhantes de Luxo — Rio de Janeiro & Cuiabá</title>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css?v=50" />
      </Head>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <LegacyScripts scripts={siteScripts} />
    </>
  );
}
