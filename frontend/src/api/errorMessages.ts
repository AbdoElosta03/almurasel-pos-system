const FALLBACK = 'حدث خطأ غير متوقع'

export const errorMessages: Record<string, string> = {
  invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
  invalid_token: 'انتهت الجلسة، سجّل الدخول مرة أخرى',
  admin_only: 'هذا الإجراء للمدير فقط',
  cashier_only: 'هذا الإجراء للكاشير فقط',
  not_allowed: 'غير مسموح بهذا الإجراء',
  user_not_found: 'المستخدم غير موجود',
  category_not_found: 'التصنيف غير موجود',
  product_not_found: 'المنتج غير موجود',
  sale_not_found: 'الفاتورة غير موجودة',
  shift_not_found: 'الوردية غير موجودة',
  no_open_shift: 'لا توجد وردية مفتوحة',
  product_not_available: 'المنتج غير متاح للبيع',
  sale_already_cancelled: 'الفاتورة ملغاة مسبقاً',
  shift_already_closed: 'الوردية مقفلة مسبقاً',
  report_filter_required: 'حدّد فترة أو رقم وردية',
  invalid_date_range: 'تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه',
  username_exists: 'اسم المستخدم مستخدم مسبقاً',
  category_exists: 'التصنيف موجود مسبقاً',
  open_shift_exists: 'لدى الكاشير وردية مفتوحة',
  cannot_delete_self: 'لا يمكن حذف حسابك الحالي',
  cannot_delete_last_admin: 'لا يمكن حذف آخر مدير نشط',
  user_used_in_sales: 'لا يمكن حذف المستخدم لأنه مرتبط بورديات أو فواتير',
  category_used_in_sale: 'لا يمكن حذف التصنيف لأن أحد منتجاته مستخدم في فاتورة',
  product_used_in_sale: 'لا يمكن حذف المنتج لأنه مستخدم في فاتورة سابقة',
  cashier_cancel_own_shift_only: 'الكاشير يلغي فواتير ورديته المفتوحة فقط',
  cashier_close_own_shift_only: 'الكاشير يقفل ورديته فقط',
  validation_error: 'تحقق من البيانات المدخلة',
}

export function translateError(code: string | undefined): string {
  if (code && errorMessages[code]) {
    return errorMessages[code]
  }
  return FALLBACK
}
