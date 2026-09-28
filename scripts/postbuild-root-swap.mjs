/**
 * Pós-build: coloca o site institucional na raiz do deploy.
 *
 * O Vite gera dist/index.html (shell do SPA React). Para o domínio
 * principal (deeperia.com.br), a landing estática precisa ser o conteúdo
 * da raiz "/". Como os rewrites do vercel.json (forma array) só rodam
 * DEPOIS do filesystem, movemos o shell do SPA para /spa/index.html e
 * copiamos a landing para dist/index.html.
 *
 * Resultado em produção (Vercel):
 *   /                       -> landing (arquivo estático na raiz)
 *   /site/*, /sitemap.xml   -> arquivos estáticos
 *   /login, /app, ...       -> rewrite array /(.*) -> /spa/index.html
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const spaSource = path.join(dist, 'index.html');
const spaDestDir = path.join(dist, 'spa');
const landingSource = path.join(root, 'public', 'site', 'index.html');
const rootIndex = path.join(dist, 'index.html');

const spaHtml = readFileSync(spaSource, 'utf8');
if (!spaHtml.includes('id="root"')) {
  console.error('✖ dist/index.html não parece ser o shell do SPA (sem #root). Abortando.');
  process.exit(1);
}

mkdirSync(spaDestDir, { recursive: true });
copyFileSync(spaSource, path.join(spaDestDir, 'index.html'));
copyFileSync(landingSource, rootIndex);

console.log('✓ Shell do SPA  -> dist/spa/index.html');
console.log('✓ Site (landing)-> dist/index.html (raiz)');
