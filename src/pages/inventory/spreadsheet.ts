import * as XLSX from 'xlsx';

export const SPREADSHEET_COLUMNS: { key: string; label: string; required?: boolean; hint: string }[] = [
  { key: 'nome', label: 'nome', required: true, hint: 'Nome do produto' },
  { key: 'sku', label: 'sku', hint: 'Se ja existir, atualiza o produto; vazio = o sistema gera' },
  { key: 'preco', label: 'preco', hint: 'Preco de venda (numero). Ex: 280 ou 280.50' },
  { key: 'custo', label: 'custo', hint: 'Custo (numero)' },
  { key: 'estoque', label: 'estoque', hint: 'Quantidade em estoque (numero inteiro)' },
  { key: 'estoque_minimo', label: 'estoque_minimo', hint: 'Estoque minimo (numero inteiro)' },
  { key: 'categoria', label: 'categoria', hint: 'Ex: Displays, Baterias' },
  { key: 'localizacao', label: 'localizacao', hint: 'Ex: Prateleira A1' },
  { key: 'marca', label: 'marca', hint: 'Marca do aparelho compativel' },
  { key: 'modelo', label: 'modelo', hint: 'Modelo do aparelho compativel' },
];

export function downloadTemplate() {
  const example = {
    nome: 'Display iPhone 14 Pro',
    sku: 'DIP14P-001',
    preco: 280,
    custo: 180,
    estoque: 5,
    estoque_minimo: 2,
    categoria: 'Displays',
    localizacao: 'Prateleira A1',
    marca: 'Apple',
    modelo: 'iPhone 14 Pro',
  };
  const ws = XLSX.utils.json_to_sheet([example], { header: SPREADSHEET_COLUMNS.map(c => c.label) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  XLSX.writeFile(wb, 'modelo-produtos.xlsx');
}
