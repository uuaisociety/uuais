import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  startIcon?: LucideIcon;
  endIcon?: LucideIcon;
  iconClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = false,
  className = '',
  id,
  startIcon: StartIcon,
  endIcon: EndIcon,
  iconClassName = '',
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const widthClasses = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`${widthClasses}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {StartIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <StartIcon className={`h-5 w-5 text-gray-400 ${iconClassName}`} />
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
            error ? 'border-red-300' : ''
          } ${
            StartIcon ? 'pl-10' : 'pl-3'
          } ${
            EndIcon ? 'pr-10' : 'pr-3'
          } py-2 ${className}`}
          {...props}
        />
        {EndIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <EndIcon className={`h-5 w-5 text-gray-400 ${iconClassName}`} />
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};