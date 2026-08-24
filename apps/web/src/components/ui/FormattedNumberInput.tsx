import React from 'react';

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (unformattedValue: string) => void;
}

export function FormattedNumberInput({ value, onChange, ...props }: FormattedNumberInputProps) {
  const formatValue = (val: string | number) => {
    if (val === '' || val === null || val === undefined) return '';
    // Hapus semua karakter yang bukan angka
    const cleanVal = val.toString().replace(/\D/g, '');
    if (!cleanVal) return '';
    
    // Format menggunakan standar Indonesia (titik sebagai pemisah ribuan)
    return parseInt(cleanVal, 10).toLocaleString('id-ID');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Hanya ambil angkanya saja untuk dikirim ke parent (state asli)
    const rawValue = e.target.value.replace(/\D/g, '');
    onChange(rawValue);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatValue(value)}
      onChange={handleChange}
      {...props}
    />
  );
}
