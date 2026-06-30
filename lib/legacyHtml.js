const fs = require("fs");
const path = require("path");

function normalizeLegacyBody(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/href="admin\.html"/g, 'href="/admin"')
    .replace(/href="index\.html"/g, 'href="/"')
    .replace(/src="logo\.png"/g, 'src="/logo.png"')
    .replace(/href="logo\.png"/g, 'href="/logo.png"');
}

function readLegacyBody(fileName) {
  const file = path.join(process.cwd(), "legacy", fileName);
  const html = fs.readFileSync(file, "utf8");
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) throw new Error(`Nao encontrei <body> em ${fileName}`);
  return normalizeLegacyBody(match[1]);
}

module.exports = { readLegacyBody };
