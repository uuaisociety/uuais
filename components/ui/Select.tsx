import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  fullWidth = false,
  options,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const widthClasses = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`${widthClasses}`}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-foreground mb-1 transition-colors duration-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm ${error ? 'border-primary/60' : ''} ${className} bg-card text-foreground transition-colors duration-300`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-primary" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};