export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-5 border-r-4 border-highlight pr-4">
      <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h2>
      {description ? <p className="mt-1 text-base text-muted-foreground">{description}</p> : null}
    </header>
  )
}
