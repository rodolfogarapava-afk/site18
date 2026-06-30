============================================================
 ALIANÇA — Site de Acompanhantes de Luxo (+18)
 Rio de Janeiro & Cuiabá • Conversão 100% via WhatsApp
============================================================

COMO ABRIR
----------
1. Instale as dependências:

   corepack yarn install

2. Rode o Next em desenvolvimento:

   corepack yarn dev

3. Acesse no navegador:

   Site:   http://localhost:3000
   Admin:  http://localhost:3000/admin


O QUE JÁ FUNCIONA
-----------------
- Aviso +18 (age gate) ao entrar, salvo no navegador.
- Cidades: Rio de Janeiro e Cuiabá, com menus por bairro.
- Página inicial com Destaques, Novidades e Exclusivas.
- Listagem por cidade + filtros (bairro, Novidades, Exclusivas, Vídeos).
- Busca por nome.
- Página de cada acompanhante com galeria (lightbox), dados,
  serviços, atendimento e tabela de valores.
- TODO botão de contato/reservar/agendar abre o WhatsApp:
    * páginas de perfil  -> WhatsApp DA ACOMPANHANTE
    * home e "Anuncie aqui" -> WhatsApp do ADMINISTRADOR
- Botão flutuante de WhatsApp em todas as páginas.
- Página "Anuncie aqui" (gera mensagem pronta no WhatsApp da central).
- Página de Informações / Política (LGPD, +18, discrição).
- 8 perfis de exemplo (4 RJ + 4 Cuiabá) com fotos-placeholder.
- 100% responsivo (celular e desktop).


PAINEL ADMIN  (jeito fácil — recomendado)
-----------------------------------------
Acesse /admin (o antigo /admin.html redireciona para /admin).

  Login: E-MAIL + SENHA do administrador (Supabase Auth).
  O usuário admin é criado no painel do Supabase (veja "BACK-END").

No painel você consegue, sem mexer em código:
- PERFIS: adicionar, editar e excluir acompanhantes; subir várias
  FOTOS (arrastar e soltar; a 1ª é a capa; reordenar/remover);
  marcar Nova / Exclusiva / Vídeo / Possui local / Destaque;
  definir o WhatsApp PRÓPRIO de cada uma.
- CIDADES & BAIRROS: criar/editar/remover cidades e bairros.
- CONFIGURAÇÕES: número de WhatsApp da central + trocar sua senha.
- PUBLICAR / BACKUP: exportar/importar backup (.json) e restaurar
  o padrão de fábrica.

IMPORTANTE — como as alterações ficam salvas:
  Agora o painel grava TUDO no banco de dados (Supabase). As mudanças
  aparecem para TODO MUNDO no site na hora — NÃO é mais preciso baixar
  nem substituir o arquivo data.js. As fotos vão para o Storage do
  Supabase (bucket "perfis") e o site usa a URL pública de cada uma.


COMO PERSONALIZAR À MÃO  (alternativa ao painel — arquivo data.js)
------------------------------------------------------------------
Abra "public/data.js". Tudo fica dentro do objeto SEED:

1) NÚMERO DA CENTRAL:
   adminWhatsapp: "5565999999999"
   Formato: 55 + DDD + número (só dígitos).

2) ADICIONAR / EDITAR ACOMPANHANTE (lista "perfis"):
   - slug:     identificador único, ex: "luna-barra"
   - cidade:   "rio-de-janeiro" ou "cuiaba"
   - bairro:   slug que exista em "cidades" (ex: "copacabana")
   - whatsapp: número PRÓPRIO da acompanhante
   - nova / exclusiva / temVideo / possuiLocal / destaque: true/false
   - fotos:    [] (vazio = placeholder) ou ["url1.jpg","url2.jpg"]

3) BAIRROS:
   Edite "bairros" de cada cidade dentro de "cidades" (slug + nome).


FOTOS REAIS (opcional)
----------------------
Por padrão as fotos são placeholders elegantes gerados automaticamente.
Para usar fotos reais:
1. Crie a pasta:  perfis/<slug>/   (ex: perfis/luna-sophie-barra/)
2. Coloque as imagens: 1.jpg, 2.jpg, 3.jpg, 4.jpg
3. No perfil em data.js, adicione o campo "fotos":
     fotos: ["perfis/luna-sophie-barra/1.jpg",
             "perfis/luna-sophie-barra/2.jpg",
             "perfis/luna-sophie-barra/3.jpg",
             "perfis/luna-sophie-barra/4.jpg"],
   (quando "fotos" existe, ele é usado no lugar do placeholder)


SERVIDOR LOCAL (opcional, recomendado)
--------------------------------------
Abra o terminal nesta pasta e rode:

  corepack yarn dev

Depois acesse no navegador:  http://localhost:3000


BACK-END (Supabase) — configuração necessária
---------------------------------------------
Os dados ficam no Supabase. A configuração PÚBLICA (URL + chave anon)
está em "supabase-config.js" (pode ficar no Git; a segurança da escrita
é garantida pela RLS — só o admin autenticado grava).

Passos no painel do Supabase (uma vez só):
  1) Authentication -> Providers -> Email: manter Email/Password LIGADO
     e DESABILITAR "Allow new users to sign up" (sem cadastro público).
  2) Authentication -> Users -> Add user: crie o usuário admin
     (e-mail + senha) que fará login no painel.
  3) Storage: o bucket público "perfis" já é criado pela migration.


PUBLICAR NA INTERNET (Vercel)
-----------------------------
Projeto Next.js. Na Vercel (vercel.com):
  1) Importe o repositório do GitHub (site18).
  2) Framework Preset: "Next.js".
     Build Command: corepack yarn build
  3) NÃO precisa cadastrar variáveis de ambiente (a config pública já
     está em public/supabase-config.js).
  4) Deploy. A cada "git push" a Vercel publica de novo automaticamente.


ARQUIVOS
--------
pages/index.js     -> rota pública Next (/)
pages/admin.js     -> rota admin Next (/admin)
legacy/*.html      -> HTML legado usado pelas páginas Next
public/styles.css  -> visual do site (tema preto/dourado + entrada vinho)
public/supabase-config.js -> config PÚBLICA do Supabase (URL + chave anon)
public/data.js     -> dados SEMENTE (SEED): fallback offline / restaurar
public/store.js    -> camada de dados (lê/grava no Supabase; auth; Storage)
public/app.js      -> lógica do site (rotas, render, WhatsApp, age gate)
public/admin.css   -> visual do painel admin
public/admin.js    -> lógica do painel (login, CRUD, upload, backup)
next.config.js     -> redirects e headers de segurança
README.txt         -> este arquivo

OBS.: a ordem dos scripts carregados pelo Next importa:
      supabase-js (CDN) -> supabase-config.js -> data.js -> store.js
      -> app.js (ou admin.js)

============================================================
 Lembre-se: conteúdo destinado a maiores de 18 anos.
 O site é uma plataforma de publicidade e não intermedeia
 negociações entre as partes.
============================================================
