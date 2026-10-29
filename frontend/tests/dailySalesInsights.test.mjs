import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/utils/dailySalesInsights.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { dailySalesInsights } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const item = (product_name, qty) => ({ product_name, qty })

test('75 regular coffees consume one kilo of beans and three milk cans', () => {
  const result = dailySalesInsights([item('قهوة عادية', 75)])
  assert.equal(result.coffeeKg, 1)
  assert.equal(result.milkCans, 3)
})

test('double coffee counts twice; water cases retain fractions', () => {
  const result = dailySalesInsights([item('قهوة عادية', 25), item('قهوة دبل', 25), item('قنينة ماء', 9)])
  assert.equal(result.coffeeEquivalent, 75)
  assert.equal(result.coffeeKg, 1)
  assert.equal(result.milkCans, 3)
  assert.equal(result.waterCases, 1.5)
})

test('normalizes spelling and whitespace without including unrelated drinks', () => {
  const result = dailySalesInsights([
    item('  قهوه   عاديه ', 1), item('قَهْوَة دبل', 1), item('قهوة عربيه', 100),
    item('نسكافيه عادي', 100), item('قنينة ماء', 6),
  ])
  assert.equal(result.coffeeKg, 3 / 75)
  assert.equal(result.milkCans, (3 / 75) * 3)
  assert.equal(result.waterCases, 1)
})

test('empty sales produce zero consumption', () => {
  const result = dailySalesInsights([])
  assert.equal(result.coffeeKg, 0)
  assert.equal(result.milkCans, 0)
  assert.equal(result.waterCases, 0)
})
