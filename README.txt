============================================================
 VIP LUXÚRIA — Site de Acompanhantes de Luxo (+18)
 Rio de Janeiro & Cuiabá • Conversão 100% via WhatsApp
============================================================

COMO ABRIR
----------
1. Dê dois cliques no arquivo "index.html".
   O site abre direto no navegador, sem instalar nada.

   (Para evitar qualquer bloqueio de navegador, você também pode
    rodar um servidor local simples — veja "SERVIDOR LOCAL" abaixo.)


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
Abra o arquivo "admin.html" (ou acesse /admin.html, ou o link
"Painel Admin" no rodapé do site).

  Senha padrão: admin   (troque na aba "Configurações")

No painel você consegue, sem mexer em código:
- PERFIS: adicionar, editar e excluir acompanhantes; subir várias
  FOTOS (arrastar e soltar; a 1ª é a capa; reordenar/remover);
  marcar Nova / Exclusiva / Vídeo / Possui local / Destaque;
  definir o WhatsApp PRÓPRIO de cada uma.
- CIDADES & BAIRROS: criar/editar/remover cidades e bairros.
- CONFIGURAÇÕES: número de WhatsApp da central + trocar a senha.
- PUBLICAR / BACKUP: baixar data.js para publicar, exportar/importar
  backup (.json) e restaurar o padrão de fábrica.

IMPORTANTE — como as alterações ficam salvas:
  O painel salva tudo NO SEU NAVEGADOR (localStorage). Você já vê as
  mudanças na hora ao abrir o site nessa mesma máquina/navegador.
  Para que as mudanças apareçam para TODO MUNDO no site publicado:
    1) No painel, aba "Publicar / Backup" -> "Baixar data.js".
    2) Substitua o arquivo data.js do site por esse novo.
    3) Suba o data.js para a hospedagem.
  (As fotos enviadas ficam embutidas no próprio data.js.)

Dica: o navegador guarda ~5 MB. O painel mostra uma barra de uso.
Se chegar perto do limite, use menos fotos por perfil.


COMO PERSONALIZAR À MÃO  (alternativa ao painel — arquivo data.js)
------------------------------------------------------------------
Abra "data.js". Tudo fica dentro do objeto SEED:

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
Abra o PowerShell nesta pasta e rode UM destes:

  Python:   python -m http.server 8080
  Node:     npx serve .

Depois acesse no navegador:  http://localhost:8080


PUBLICAR NA INTERNET (grátis)
-----------------------------
É um site estático, então funciona em qualquer hospedagem:
- Netlify  : arraste a pasta em app.netlify.com/drop
- Vercel   : vercel.com  (importe a pasta)
- GitHub Pages, Cloudflare Pages, hospedagem comum, etc.


ARQUIVOS
--------
index.html  -> estrutura do site público
styles.css  -> visual do site (tema preto/dourado + entrada vinho)
data.js     -> dados SEMENTE (SEED): cidades, perfis e WhatsApp central
store.js    -> camada de dados (usa o que o admin salvou; senão, o SEED)
app.js      -> lógica do site (rotas, render, WhatsApp, age gate, lightbox)
admin.html  -> PAINEL ADMIN (login + abas)
admin.css   -> visual do painel admin
admin.js    -> lógica do painel (CRUD, upload de fotos, backup, publicar)
README.txt  -> este arquivo

OBS.: a ordem dos scripts no index.html/admin.html importa:
      data.js  ->  store.js  ->  app.js (ou admin.js)

============================================================
 Lembre-se: conteúdo destinado a maiores de 18 anos.
 O site é uma plataforma de publicidade e não intermedeia
 negociações entre as partes.
============================================================
