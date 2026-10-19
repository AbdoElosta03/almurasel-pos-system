export function LoadingBlock({ label = 'جاري التحميل...' }: { label?: string }) {
  return <p className="py-8 text-center text-lg text-muted-foreground">{label}</p>
}
