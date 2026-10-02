// Máscaras e validações do wizard de cadastro
export const onlyDigits = (v: string) => v.replace(/\D/g, '');

export function maskCpfCnpj(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function isValidCpfCnpj(raw: string): boolean {
  const c = onlyDigits(raw);
  if (c.length === 11) {
    if (/^(\d)\1{10}$/.test(c)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(c[i]) * (10 - i);
    let d1 = (sum * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== Number(c[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(c[i]) * (11 - i);
    let d2 = (sum * 10) % 11;
    if (d2 === 10) d2 = 0;
    return d2 === Number(c[10]);
  }
  if (c.length === 14) {
    if (/^(\d)\1{13}$/.test(c)) return false;
    const calc = (len: number) => {
      let sum = 0, pos = len - 7;
      for (let i = 0; i < len; i++) {
        sum += Number(c[i]) * pos--;
        if (pos < 2) pos = 9;
      }
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
  }
  return false;
}

export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
