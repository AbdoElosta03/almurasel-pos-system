# واجهة المراسل POS

React + Vite + TypeScript + axios + Tailwind CSS.

## الهيكل

```text
src/
  app/                 App و routes
  api/
  types/
  shared/
    ui/                Button, Input, Card, ...
    layout/            AppShell, AdminLayout, CashierLayout
    auth/              RequireAuth, RequireRole
    lib/cn.ts
  pages/
    login/page.tsx + components/
    admin/<feature>/page.tsx + components/
    cashier/<feature>/page.tsx + components/
```

كل صفحة: `page.tsx` للتجميع، و`components/` لمكوّنات الصفحة فقط.

شاشة الكاشير مصممة للمس: أزرار كبيرة (`min-h-12` / `min-h-14`)، شبكة منتجات، وسلة جانبية.

```text
npm install
npm run dev
npm run build
```
