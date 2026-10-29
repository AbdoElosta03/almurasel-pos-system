type SalesItem = { product_name: string; qty: number }

function normalizeName(name: string) {
  return name.trim().replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/ة/g, 'ه').replace(/\s+/g, ' ')
}

export function dailySalesInsights(items: readonly SalesItem[]) {
  let regularCoffee = 0
  let doubleCoffee = 0
  let waterBottles = 0

  for (const item of items) {
    const name = normalizeName(item.product_name)
    if (name === 'قهوه عاديه') regularCoffee += item.qty
    if (name === 'قهوه دبل') doubleCoffee += item.qty
    if (name === 'قنينه ماء') waterBottles += item.qty
  }

  const coffeeEquivalent = regularCoffee + doubleCoffee * 2
  const coffeeKg = coffeeEquivalent / 75
  return {
    regularCoffee,
    doubleCoffee,
    coffeeEquivalent,
    coffeeKg,
    milkCans: coffeeKg * 3,
    waterBottles,
    waterCases: waterBottles / 6,
  }
}
