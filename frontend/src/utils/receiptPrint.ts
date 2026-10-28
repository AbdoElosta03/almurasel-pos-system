import type { Sale } from '../types'
import { formatLibyaDateTime } from './datetime'
import { formatLyd } from './money'

const RECEIPT_WIDTH_MM = 80

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function receiptHtml(sale: Sale, cashierName?: string): string {
  const payment = sale.payment_method === 'cash' ? 'نقدي' : 'بطاقة مصرفية'
  const rows = sale.items.map((item) => `
    <tr>
      <td colspan="2" class="name">${escapeHtml(item.product_name)}</td>
    </tr>
    <tr>
      <td>${item.qty} × ${escapeHtml(formatLyd(item.unit_price_lyd))}</td>
      <td class="amount">${escapeHtml(formatLyd(item.line_total_lyd))}</td>
    </tr>
  `).join('')
  const cashier = cashierName
    ? `<p>الكاشير: ${escapeHtml(cashierName)}</p>`
    : ''

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاتورة ${sale.id}</title>
  <style>
    @page { size: ${RECEIPT_WIDTH_MM}mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body {
      width: ${RECEIPT_WIDTH_MM - 6}mm;
      font-family: "Segoe UI", Tahoma, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    h1 { margin: 0; font-size: 18px; text-align: center; }
    .subtitle, .thanks { margin: 0; text-align: center; }
    .meta { margin: 8px 0; }
    .meta p { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 1px 0; }
    .name { font-weight: 700; padding-top: 6px; }
    .amount { text-align: left; white-space: nowrap; }
    hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
    .total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; }
    .thanks { margin-top: 10px; }
  </style>
</head>
<body>
  <h1>المراسل</h1>
  <p class="subtitle">فاتورة مبيعات</p>
  <hr />
  <div class="meta">
    <p>رقم الفاتورة: ${sale.id}</p>
    <p>التاريخ: ${escapeHtml(formatLibyaDateTime(sale.created_at))}</p>
    ${cashier}
    <p>طريقة الدفع: ${payment}</p>
  </div>
  <hr />
  <table>${rows}</table>
  <hr />
  <div class="total"><span>الإجمالي</span><span>${escapeHtml(formatLyd(sale.total_lyd))}</span></div>
  <p class="thanks">شكراً لزيارتكم</p>
</body>
</html>`
}

export function printSaleReceipt(sale: Sale, cashierName?: string): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = `${RECEIPT_WIDTH_MM}mm`
  iframe.style.height = '800px'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!win || !doc) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(receiptHtml(sale, cashierName))
  doc.close()

  const remove = () => {
    win.removeEventListener('afterprint', remove)
    iframe.remove()
  }
  win.addEventListener('afterprint', remove)
  window.setTimeout(() => {
    if (iframe.isConnected) iframe.remove()
  }, 60_000)
  window.setTimeout(() => {
    win.focus()
    win.print()
  }, 200)
}
