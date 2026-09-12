interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="mb-7 border-b border-[#e6e3eb] pb-7">
      <div className="mb-3 flex items-center gap-2.5 font-mono text-[9px] tracking-[0.18em] text-[#857aab]">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_10px_#8d7cff]" aria-hidden="true" />
        {eyebrow}
      </div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#191620] sm:text-[38px]">{title}</h1>
        <p className="max-w-md text-sm leading-6 text-[#7c7683]">{description}</p>
      </div>
    </header>
  );
}
