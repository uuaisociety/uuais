'use client'

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StyledSelectOption {
  value: string;
  label: string;
}

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: StyledSelectOption[];
  className?: string;
  /** Accessible name — without it the trigger announces only its current value. */
  label?: string;
}

const StyledSelect: React.FC<StyledSelectProps> = ({ value, onChange, options, className, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 cursor-pointer border border-border text-muted-foreground hover:text-foreground hover:bg-foreground/[0.055] hover:border-foreground/25"
      >
        {selected?.label ?? 'Select...'}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div
          role="listbox"
          aria-label={label}
          className="glass-pop absolute left-0 mt-2 w-48 rounded-md p-1.5 overflow-hidden animate-rise z-50"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt.value)}
              className={`block w-full text-left px-3 py-2 rounded-sm text-[0.8125rem] transition-colors duration-300 cursor-pointer ${
                opt.value === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-current/70 hover:text-current hover:bg-current/[0.09]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StyledSelect;