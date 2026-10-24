/**
 * Converte um arquivo de imagem em data URL REDIMENSIONADO (canvas).
 * Logos de celular chegam com MBs; redimensionar para os limites reais
 * de exibição (sidebar/favicon) mantém a qualidade visual e evita:
 * - estouro de cota de localStorage (persist)
 * - payloads gigantes no banco (global_settings + N tenant_themes)
 * - limite de tamanho de requisição da API
 */
export async function fileToResizedDataUrl(file: File, maxDim: number): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });

  // Arquivos pequenos já entram direto (evita reprocessar ícones pequenos)
  if (rawDataUrl.length < 60_000) return rawDataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Formato de imagem não suportado.'));
    image.src = rawDataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawDataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}
