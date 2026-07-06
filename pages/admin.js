import Head from "next/head";
import LegacyScripts from "../components/LegacyScripts";
import { readLegacyBody } from "../lib/legacyHtml";

const adminScripts = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "/supabase-config.js?v=20",
  "/data.js?v=22",
  "/store.js?v=23",
  "/admin.js?v=24",
];

export async function getStaticProps() {
  return {
    props: {
      bodyHtml: readLegacyBody("admin.html"),
    },
  };
}

export default function AdminPage({ bodyHtml }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex,nofollow" />
        <title>Painel Admin • ALIANÇA</title>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/admin.css?v=23" />
      </Head>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <LegacyScripts scripts={adminScripts} />
    </>
  );
}
