import React from 'react';

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (unformattedValue: string) => void;
}

export function FormattedNumberInput({ value, onChange, ...props }: FormattedNumberInputProps) {
  const formatValue = (val: string | number) => {
    if (val === '' || val === null || val === undefined) return '';
    const cleanVal = val.toString().replace(/\D/g, '');
    if (!cleanVal) return '';
    
    return parseInt(cleanVal, 10).toLocaleString('id-ID');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
