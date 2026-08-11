"use client";

import React, { useId, useMemo, useRef, useState } from "react";

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Combobox with typeahead filtering for long option lists (e.g. the 300+
 * Uppsala programmes). Free text is allowed so a programme that is not in the
 * list can still be entered — type "data sci" and pick the match, or type
 * something new and it is committed as-is on blur. Keyboard: Up/Down to move,
 * Enter to select, Escape to close.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  id,
}) => {
  const autoId = useId();
  const listboxId = `${id || autoId}-listbox`;
  const inputId = id || autoId;
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const exact = options.filter((o) => o.toLowerCase() === q);
    const partial = options.filter((o) => o.toLowerCase().includes(q));
    return [...exact, ...partial.filter((o) => !exact.includes(o))];
  }, [options, query]);

  const hasActiveMatch = filtered.length > 0 && filtered[activeIndex]?.toLowerCase() === query.trim().toLowerCase();

  const commit = (next: string) => {
    setQuery(next);
    onChange(next);
    setOpen(false);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIndex(0);
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[activeIndex]) commit(filtered[activeIndex]);
      else setOpen((o) => !o);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const handleBlur = () => {
    // Commit typed text so nothing is silently dropped when the user clicks away.
    setQuery(query);
    onChange(query.trim());
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
      />

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Programme options"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li role="option" aria-selected="false" className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 cursor-default">
              No programmes match "{query.trim()}" — you can still use this text.
            </li>
          ) : (
            filtered.slice(0, 100).map((option, i) => {
              const isActive = i === activeIndex;
              const selected = option === value && !hasActiveMatch;
              return (
                <li
                  key={option}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(option);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    isActive
                      ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {option}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
