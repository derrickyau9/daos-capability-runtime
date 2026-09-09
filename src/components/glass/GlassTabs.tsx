type TabItem = {
  value: string;
  label: string;
};

type GlassTabsProps = {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export function GlassTabs({ items, value, onChange, ariaLabel }: GlassTabsProps) {
  return (
    <div className="glass-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          className={item.value === value ? "is-active" : ""}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
