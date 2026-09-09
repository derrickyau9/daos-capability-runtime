import type { SelectHTMLAttributes } from "react";

type GlassSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: string[];
};

export function GlassSelect({ label, options, className = "", ...props }: GlassSelectProps) {
  return (
    <label className={`glass-select ${className}`}>
      {label && <span>{label}</span>}
      <select {...props}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
