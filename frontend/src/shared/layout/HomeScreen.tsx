import { Link } from 'react-router-dom'

import { Icon, type IconName } from '../ui/Icon'

export interface HomeItem {
  to: string
  label: string
  description: string
  icon: IconName
  featured?: boolean
}

export function HomeScreen({ role, items }: { role: 'admin' | 'cashier'; items: HomeItem[] }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center py-6 sm:py-10">
      {role === 'cashier' ? (
        <h2 className="mb-7 text-center text-3xl font-extrabold tracking-tight text-foreground sm:mb-10 sm:text-4xl">جاهز لبدء البيع؟</h2>
      ) : null}
      <div className={`grid gap-4 sm:gap-5 ${role === 'cashier' ? 'mx-auto w-full max-w-3xl sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {items.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className={`relative flex min-h-40 flex-col justify-between overflow-hidden rounded-[1.5rem] border p-5 transition duration-200 motion-safe:animate-tile-in active:scale-[0.98] sm:min-h-48 sm:p-6 ${item.featured ? 'border-primary bg-primary text-primary-foreground shadow-[0_16px_32px_-16px_rgba(18,83,78,.65)]' : 'border-border bg-card text-foreground shadow-[0_8px_25px_-16px_rgba(30,62,58,.25)]'}`}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span className={`flex size-12 items-center justify-center rounded-2xl ${item.featured ? 'bg-white/15' : 'bg-secondary text-secondary-foreground'}`}>
              <Icon name={item.icon} className="size-6" />
            </span>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold sm:text-2xl">{item.label}</h3>
                <p className={`mt-1.5 text-sm sm:text-base ${item.featured ? 'text-white/75' : 'text-muted-foreground'}`}>{item.description}</p>
              </div>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.featured ? 'bg-white/15' : 'bg-background text-primary'}`}>
                <Icon name="arrow" className="size-5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">المراسل POS · مساحة عمل مصممة لسرعة الخدمة</p>
    </div>
  )
}
