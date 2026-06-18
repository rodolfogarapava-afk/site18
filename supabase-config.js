/* ============================================================
   VIP LUXÚRIA — Configuração pública do Supabase
   ------------------------------------------------------------
   Estes valores são PÚBLICOS por design e podem ficar no Git:
     - SB_URL  : endereço do projeto (público)
     - SB_ANON : chave "anon/publishable" (feita para o navegador)
   A segurança da ESCRITA é garantida pela RLS no banco (só um
   usuário autenticado, o admin, consegue gravar). A chave secreta
   "service_role" NUNCA fica aqui — ela não é usada no front-end.

   Como um site estático (sem build) não lê o arquivo .env no
   navegador, a configuração pública precisa morar num arquivo .js
   servido normalmente, como este.
   ============================================================ */
window.SB_URL    = "https://luwgedyzbxokosozhlwf.supabase.co";
window.SB_ANON   = "sb_publishable_yKN-Yy2Eu_Y-Bmw24eEpKQ_acLs0QET";
window.SB_BUCKET = "perfis";
