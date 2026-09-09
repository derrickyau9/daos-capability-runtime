import type { ReactNode } from "react";
import { GlassButton } from "../glass/GlassButton";

type CommandButtonProps = {
  label: string;
  variant: "primary" | "success" | "danger" | "ghost" | "blue";
  icon: ReactNode;
  loading?: boolean;
  onClick: () => void;
};

export function CommandButton({ label, variant, icon, loading = false, onClick }: CommandButtonProps) {
  return (
    <GlassButton className="command-button" variant={variant} size="lg" icon={icon} loading={loading} onClick={onClick}>
      {label}
    </GlassButton>
  );
}
