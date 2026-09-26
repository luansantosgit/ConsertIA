/**
 * Gera as imagens realistas do site institucional DeeperIA via OpenRouter
 * (modelo openai/gpt-image-1-mini — o GPT de imagem mais barato com qualidade).
 *
 * Credencial: token OpenRouter central da plataforma (platform_ai_config),
 * lido com login de superadmin. Fallback: env OPENROUTER_API_KEY.
 *
 * Uso:  node scripts/generate-landing-images.mjs
 * Opcional: SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... OPENROUTER_API_KEY=...
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, 'public', 'site', 'img');
const MODEL = 'openai/gpt-image-1-mini';

const IMAGES = [
  {
    name: 'agent-bench',
    aspect_ratio: '3:2',
    width: 900,
    prompt:
      'Realistic editorial photograph inside a modern smartphone repair workshop at night: focused technician in dark graphite-tone bench repairing a smartphone logic board under a stereoscopic microscope, cyan LED accent lighting, precision screwdriver set and organized phone parts on an anti-static mat, shallow depth of field, moody professional atmosphere, photorealistic, high detail, no text, no watermark, no logos',
  },
  {
    name: 'agent-macro',
    aspect_ratio: '3:2',
    width: 900,
    prompt:
      'Extreme macro photograph of a smartphone charging port connector being repaired with fine tweezers and micro-soldering iron tip, dark background with cyan rim light, professional repair bench with flux and jumper wire, ultra sharp focus, photorealistic, no text, no watermark, no logos',
  },
  {
    name: 'og-cover',
    aspect_ratio: '3:2',
    width: 1200,
    ogCrop: { width: 1200, height: 630 },
    prompt:
      'Wide realistic photograph of a modern phone repair shop counter: technician handing a repaired smartphone to a smiling customer, dark graphite store interior with subtle cyan neon accent light, organized repair tools and phone displays in background, warm human moment, photorealistic, no text, no watermark, no logos',
  },
];

function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function loadEnv() {
  try {
    return parseEnvFile(await readFile(path.join(ROOT, '.env'), 'utf8'));
  } catch {
    return {};
  }
}

async function getOpenRouterKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;

  const env = await loadEnv();
  const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('VITE_SUPABASE_URL/ANON_KEY ausentes no .env');

  const email = process.env.SUPERADMIN_EMAIL || 'contatoGrupolssolucoes@gmail.com';
  const password = process.env.SUPERADMIN_PASSWORD || '123456';

  const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) throw new Error(`Login superadmin falhou (${loginRes.status})`);
  const { access_token } = await loginRes.json();

  const cfgRes = await fetch(`${url}/rest/v1/platform_ai_config?select=openrouter_token&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${access_token}` },
  });
  if (!cfgRes.ok) throw new Error(`Leitura de platform_ai_config falhou (${cfgRes.status})`);
  const [cfg] = await cfgRes.json();
  const token = cfg?.openrouter_token;
  if (!token) throw new Error('platform_ai_config sem openrouter_token — configure em SuperAdmin > Provedor de IA');
  return token;
}

async function generateImage(apiKey, spec) {
  const res = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://deeperia.com.br',
      'X-Title': 'DeeperIA Site Assets',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: spec.prompt,
      aspect_ratio: spec.aspect_ratio,
      quality: 'medium',
      n: 1,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status} para ${spec.name}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const item = json?.data?.[0];
  if (!item?.b64_json) throw new Error(`Resposta sem imagem para ${spec.name}`);
  return { buffer: Buffer.from(item.b64_json, 'base64'), mediaType: item.media_type || 'image/png', cost: json?.usage?.cost };
}

async function main() {
  console.log('→ Obtendo credencial OpenRouter da plataforma...');
  const apiKey = await getOpenRouterKey();
  await mkdir(OUT_DIR, { recursive: true });

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('⚠ sharp não instalado — imagens serão salvas sem compressão WebP.');
  }

  let totalCost = 0;
  for (const spec of IMAGES) {
    console.log(`→ Gerando "${spec.name}"...`);
    const { buffer, mediaType, cost } = await generateImage(apiKey, spec);
    if (cost) totalCost += cost;

    if (sharp) {
      let pipeline = sharp(buffer).resize({ width: spec.width, withoutEnlargement: true });
      if (spec.ogCrop) pipeline = sharp(buffer).resize(spec.ogCrop.width, spec.ogCrop.height, { fit: 'cover', position: 'centre' });
      await pipeline.webp({ quality: 82 }).toFile(path.join(OUT_DIR, `${spec.name}.webp`));
      console.log(`  ✓ ${spec.name}.webp`);
    } else {
      const ext = mediaType.includes('jpeg') ? 'jpg' : 'png';
      await writeFile(path.join(OUT_DIR, `${spec.name}.${ext}`), buffer);
      console.log(`  ✓ ${spec.name}.${ext}`);
    }
  }
  console.log(`✔ Concluído. Custo estimado: US$ ${totalCost.toFixed(3)}`);
}

main().catch((err) => {
  console.error('✖ Falha:', err.message);
  process.exit(1);
});
