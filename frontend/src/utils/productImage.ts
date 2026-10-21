import type { Product } from '../types'

export function productDisplayImage(product: Product): string | null {
  if (product.image_url) return product.image_url

  const name = product.name.trim().toLocaleLowerCase()
  if (/(نسكافيه|نكسافيه|nescafe)/.test(name) && /(تام|كامل|كاملة|شوكولات|شكولات|chocolate)/.test(name)) {
    return '/product-images/nescafe-chocolate.svg'
  }
  if (/(نسكافيه|نكسافيه|nescafe)/.test(name)) {
    return '/product-images/nescafe.svg'
  }
  if (/(كابتشينو|كابوتشينو|cappuccino)/.test(name)) {
    return '/product-images/cappuccino-italian.svg'
  }
  if (/(عصير|juice)/.test(name) && /(فراول|strawberry)/.test(name)) {
    return '/product-images/juice-strawberry.svg'
  }
  if (/(عصير|juice)/.test(name) && /(مانجا|مانجو|mango)/.test(name)) {
    return '/product-images/juice-mango.svg'
  }
  if (/(عصير|juice)/.test(name) && /(كوك?تيل|كوكتيل|cocktail)/.test(name)) {
    return '/product-images/juice-cocktail.svg'
  }
  if (/(عصير|juice)/.test(name) && /(افوكادو|أفوكادو|avocado)/.test(name)) {
    return '/product-images/juice-avocado.svg'
  }
  if (/(عصير|juice)/.test(name)) {
    return '/product-images/juice-generic.svg'
  }
  if (/(كريب|crepe)/.test(name) && /(حار|جبن|أجبان|اجبان|مالح|savory|cheese)/.test(name)) {
    return '/product-images/crepe-savory.svg'
  }
  if (/(كريب|crepe)/.test(name) && /(نوتيلا|شوكولات|شكولات|nutella|chocolate)/.test(name)) {
    return '/product-images/crepe-nutella.svg'
  }
  if (/(سندوتش|ساندوتش|ساندويتش|sandwich)/.test(name) && /(تن|تونة|تونه|tuna)/.test(name)) {
    return '/product-images/sandwich-tuna-cheese.svg'
  }
  if (/(سموذي|سموثي|smoothie)/.test(name)) {
    return '/product-images/smoothie.svg'
  }
  if (/(موخيتو|موهيتو|mojito)/.test(name)) {
    return '/product-images/mojito.svg'
  }
  if (/(شاهي|شاي|tea)/.test(name) && /(مغربي|moroccan)/.test(name)) {
    return '/product-images/moroccan-tea.svg'
  }
  if (/(بيبسي|pepsi)/.test(name)) {
    return '/product-images/pepsi-drink.svg'
  }
  if (/(بسبوسة|بسبوسه|basbousa)/.test(name)) {
    return '/product-images/basbousa.svg'
  }
  if (/(مالفي|ميلفاي|ميل فاي|mille.?feuille)/.test(name) && /(العالم|شوكولات|شكولات|chocolate)/.test(name)) {
    return '/product-images/mille-feuille-chocolate.svg'
  }
  if (/(مالفي|ميلفاي|ميل فاي|mille.?feuille)/.test(name)) {
    return '/product-images/mille-feuille.svg'
  }
  if (/(قنينة|قارورة|مياه|ماء|water)/.test(name)) {
    return '/product-images/water-bottle.svg'
  }
  if (/قهوة/.test(name) && /(دبل|كبير|كبيرة|double|large)/.test(name)) {
    return '/product-images/coffee-double.svg'
  }
  if (/قهوة|coffee/.test(name)) {
    return '/product-images/coffee-regular.svg'
  }
  if (/بريوش|كرواسون|كروسان|croissant|brioche/.test(name)) {
    return '/product-images/brioche-croissant.svg'
  }
  return null
}
