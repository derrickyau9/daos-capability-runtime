import type { ReactNode } from "react";

type GlassCardProps = {
  title?: string;
  value?: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  tone?: "default" | "blue" | "green" | "orange" | "red";
  children?: ReactNode;
  className?: string;
  sensitive?: boolean;
  mask?: string;
};

export function GlassCard({ title, value, subtitle, icon, tone = "default", children, className = "", sensitive = false, mask = "******" }: GlassCardProps) {
  return (
    <article className={`glass-card tone-${tone} ${className}`}>
      {(title || icon) && (
        <div className="glass-card-head">
          {icon && <span className="glass-card-icon">{icon}</span>}
          {title && <span>{title}</span>}
        </div>
      )}
      {value !== undefined && (
        <strong className={`glass-card-value ${sensitive ? "privacy-sensitive" : ""}`} data-mask={sensitive ? mask : undefined}>
          {value}
        </strong>
      )}
      {subtitle && <small className="glass-card-subtitle">{subtitle}</small>}
      {children}
    </article>
  );
}
