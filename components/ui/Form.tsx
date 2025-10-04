"use client";

import React from "react";

type BaseProps = {
  label: string;
  requiredHint?: string;
  className?: string;
  children?: React.ReactNode;
};

export const FieldGroup: React.FC<BaseProps> = ({ label, requiredHint, className, children }) => {
  return (
    <label className={`flex flex-col gap-1 ${className || ""}`}>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
        {requiredHint && (
          <span className="ml-1 text-[11px] font-normal text-gray-500 dark:text-gray-400">{requiredHint}</span>
        )}
      </span>
      {children}
    </label>
  );
};

export const InputBase = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function InputBase(props, ref) {
    const { className, ...rest } = props;
    return (
      <input
        ref={ref}
        className={`
          w-full rounded-md border border-gray-300 dark:border-gray-700
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          placeholder-gray-500 dark:placeholder-gray-400
          px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
          transition-colors ${className || ""}
        `}
        {...rest}
      />
    );
  }
);

export const SelectBase = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectBase(props, ref) {
    const { className, children, ...rest } = props;
    return (
      <select
        ref={ref}
        className={`
          w-full rounded-md border border-gray-300 dark:border-gray-700
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
          transition-colors appearance-none ${className || ""}
        `}
        {...rest}
      >
        {children}
      </select>
    );
  }
);

export const TextareaBase = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextareaBase(props, ref) {
    const { className, ...rest } = props;
    return (
      <textarea
        ref={ref}
        className={`
          w-full rounded-md border border-gray-300 dark:border-gray-700
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          placeholder-gray-500 dark:placeholder-gray-400
          px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
          transition-colors ${className || ""}
        `}
        {...rest}
      />
    );
  }
);
