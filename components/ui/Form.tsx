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
      <span className="text-xs font-medium text-foreground">
        {label}
        {requiredHint && (
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">{requiredHint}</span>
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
          w-full rounded-md border border-border
          bg-card text-foreground
          placeholder:text-muted-foreground
          px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
          transition-colors duration-300
          disabled:border-0 disabled:bg-transparent disabled:shadow-none
          disabled:focus:ring-0 disabled:focus:border-transparent disabled:cursor-default disabled:opacity-100
          ${className || ""}
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
          w-full rounded-md border border-border
          bg-card text-foreground
          px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
          transition-colors duration-300 appearance-none
          disabled:border-0 disabled:bg-transparent disabled:shadow-none
          disabled:focus:ring-0 disabled:focus:border-transparent disabled:cursor-default disabled:opacity-100
          ${className || ""}
        `}
        {...rest}
      >
        {children}
      </select>
    );
  }
);

export const TextareaBase = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { autoResize?: boolean }>(
  function TextareaBase({ autoResize, className, ...rest }, ref) {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    const setRefs = (el: HTMLTextAreaElement | null) => {
      (innerRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    React.useEffect(() => {
      const el = innerRef.current;
      if (!autoResize || !el) return;
      const resize = () => {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      };
      resize();
    }, [autoResize, rest.value]);

    return (
      <textarea
        ref={setRefs}
        className={`
          w-full rounded-md border border-border
          bg-card text-foreground
          placeholder:text-muted-foreground
          px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
          transition-colors duration-300
          disabled:border-0 disabled:bg-transparent disabled:shadow-none
          disabled:focus:ring-0 disabled:focus:border-transparent disabled:cursor-default disabled:opacity-100
          ${autoResize ? "overflow-y-hidden" : ""}
          ${className || ""}
        `}
        {...rest}
      />
    );
  }
);
