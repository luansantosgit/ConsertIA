import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, placeholder }) => {
  const [display, setDisplay] = useState(value > 0 ? formatBRL(value) : '');

  useEffect(() => {
    setDisplay(value > 0 ? formatBRL(value) : '');
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '');
    if (!digits) {
      onChange(0);
      setDisplay('');
      return;
    }
    const parsed = Number(digits) / 100;
    if (parsed > 99_999_999) return;
    onChange(parsed);
    setDisplay(formatBRL(parsed));
  };

  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-muted)', fontSize: '0.875rem', pointerEvents: 'none',
      }}>
        R$
      </span>
      <input
        className="input"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder ?? '0,00'}
        style={{ paddingLeft: 34 }}
      />
    </div>
  );
};
