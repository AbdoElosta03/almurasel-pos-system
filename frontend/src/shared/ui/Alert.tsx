import { Alert as ShadcnAlert } from '../../components/ui/alert'

export function Alert({ tone = 'error', className, children }: { tone?: 'error' | 'success' | 'info'; className?: string; children: string }) {
  return <ShadcnAlert variant={tone === 'error' ? 'destructive' : tone} className={className}>{children}</ShadcnAlert>
}
