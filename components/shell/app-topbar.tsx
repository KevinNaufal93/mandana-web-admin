export function AppTopbar({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div />
      {children}
    </header>
  );
}
