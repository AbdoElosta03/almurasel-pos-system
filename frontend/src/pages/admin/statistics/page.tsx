import { HomeTile, type HomeItem } from '../../../shared/layout/HomeScreen'
import { PageHeader } from '../../../shared/ui/PageHeader'

const cards: HomeItem[] = [
  {
    to: '/admin/statistics/weekly',
    label: 'إحصائيات مبيعات أسبوعية',
    description: 'مبيعات كل يوم وأفضل أوقات البيع',
    icon: 'reports',
  },
  {
    to: '/admin/statistics/daily-products',
    label: 'إحصائيات مبيعات الأصناف اليومية',
    description: 'الأصناف التي بيعت في كل يوم',
    icon: 'products',
  },
]

export function StatisticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center py-6 sm:py-10">
      <PageHeader title="إحصائيات" description="اختر نوع الإحصائية." />
      <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2 sm:gap-5">
        {cards.map((card, index) => (
          <HomeTile key={card.label} item={card} index={index} />
        ))}
      </div>
    </div>
  )
}
