import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard";

type GlassMetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "blue" | "green" | "orange" | "red";
  sensitive?: boolean;
  mask?: string;
};

export function GlassMetricCard({ label, value, hint, tone = "default", sensitive = false, mask }: GlassMetricCardProps) {
  return <GlassCard title={label} value={value} subtitle={hint} tone={tone} className="metric-card" sensitive={sensitive} mask={mask} />;
}
