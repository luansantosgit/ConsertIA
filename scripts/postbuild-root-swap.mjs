/**
 * Pós-build: realoca o shell do SPA para liberar a raiz do deploy.
 *
 * O Vite gera dist/index.html (shell do SPA React). Para o domínio
 * principal (deeperia.com.br) servirem o site institucional em "/",
 * o vercel.json usa rewrite por host — mas os rewrites em array rodam
 * DEPOIS do filesystem. Por isso movemos o shell para /spa/index.html
 * (deixando "/" sem arquivo físico) e o vercel.json decide por host:
 *
 *   deeperia.com.br/            -> /site/index.html (site institucional)
 *   qualquer outro host (painel,
 *   *.vercel.app, etc) em "/"   -> /spa/index.html (painel React na raiz,
 *                                  exatamente como antes do site existir)
 *   /login, /atendimento, ...   -> /spa/index.html (SPA)
 */

import { copyFileSync, rmSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const spaSource = path.join(dist, 'index.html');
const spaDestDir = path.join(dist, 'spa');

const spaHtml = readFileSync(spaSource, 'utf8');
if (!spaHtml.includes('id="root"')) {
  console.error('✖ dist/index.html não parece ser o shell do SPA (sem #root). Abortando.');
  process.exit(1);
}

mkdirSync(spaDestDir, { recursive: true });
copyFileSync(spaSource, path.join(spaDestDir, 'index.html'));
rmSync(spaSource);

console.log('✓ Shell do SPA  -> dist/spa/index.html');
console.log('✓ Raiz "/" liberada (sem index.html) — vercel.json decide por host');
