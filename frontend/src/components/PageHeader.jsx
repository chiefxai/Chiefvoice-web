export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between px-8 pt-8 pb-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-muted)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
