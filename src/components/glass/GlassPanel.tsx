import type { ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  intensity?: "soft" | "normal" | "strong";
  padding?: "none" | "sm" | "md" | "lg";
  glow?: boolean;
};

export function GlassPanel({ children, className = "", intensity = "normal", padding = "md", glow = false }: GlassPanelProps) {
  return (
    <section className={`glass-panel glass-${intensity} glass-pad-${padding} ${glow ? "has-glow" : ""} ${className}`}>
      {children}
    </section>
  );
}
