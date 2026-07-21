"use client";

import React, { useEffect, useRef } from "react";
import { InputBase } from "./Form";

const LINKEDIN_PREFIX = "https://www.linkedin.com/in/";
const LINKEDIN_REGEX = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i;

export function LinkedInUrlInput({
  value,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current && !value) {
      seeded.current = true;
      onChange(LINKEDIN_PREFIX);
    }
  }, [value, onChange]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value;
    if (v.startsWith(LINKEDIN_PREFIX + LINKEDIN_PREFIX)) {
      v = v.slice(LINKEDIN_PREFIX.length);
    } else if (/^https?:\/\/https?:\/\//i.test(v)) {
      v = v.replace(/^https?:\/\//i, "");
    }
    onChange(v);
  }

  function normalize(v: string) {
    if (!v || v === LINKEDIN_PREFIX) return;
    if (LINKEDIN_REGEX.test(v)) return;
    const cleaned = v.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    onChange(LINKEDIN_PREFIX + cleaned);
  }

  return (
    <InputBase
      ref={ref}
      maxLength={200}
      placeholder={LINKEDIN_PREFIX + "username"}
      value={value}
      onChange={handleChange}
      onBlur={() => normalize(value)}
      {...props}
    />
  );
}
