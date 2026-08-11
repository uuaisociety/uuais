"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  placeholder?: string;
  onSearch: (value: string) => void;
  initialValue?: string;
};

export default function SearchBar({ placeholder = "Search courses...", onSearch, initialValue = "" }: Props) {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value);
      }}
      className="flex gap-3 w-full"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        label="Search courses"
        placeholder={placeholder}
        fullWidth
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
