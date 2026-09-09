import type { ButtonHTMLAttributes, ReactNode } from "react";

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "success" | "danger" | "ghost" | "blue";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
};

export function GlassButton({
  variant = "ghost",
  size = "md",
  icon,
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={`glass-button variant-${variant} size-${size} ${loading ? "is-loading" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className="glass-button-icon">{icon}</span>}
      <span>{loading ? "Running" : children}</span>
    </button>
  );
}
