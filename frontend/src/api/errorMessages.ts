const FALLBACK = 'حدث خطأ غير متوقع'

export const errorMessages: Record<string, string> = {
  invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
  incorrect_current_password: 'كلمة المرور الحالية غير صحيحة',
  password_confirmation_mismatch: 'كلمتا المرور الجديدتان غير متطابقتين',
  invalid_recovery_credentials: 'بيانات الاستعادة غير صحيحة',
  recovery_rate_limited: 'محاولات كثيرة، حاول مرة أخرى بعد 15 دقيقة',
  recovery_unavailable: 'استعادة المدير غير مفعّلة، تواصل مع مسؤول النظام',
  invalid_token: 'انتهت الجلسة، سجّل الدخول مرة أخرى',
  invalid_password: 'كلمة مرور المدير غير صحيحة',
  invalid_backup: 'الملف ليس نسخة SQLite صالحة أو بياناته غير سليمة',
  backup_version_mismatch: 'إصدار النسخة لا يطابق إصدار قاعدة البيانات الحالية',
  backup_schema_mismatch: 'بنية النسخة لا تطابق بنية قاعدة البيانات الحالية',
  backup_not_found: 'النسخة الاحتياطية غير موجودة',
  backup_too_large: 'حجم الملف يتجاوز 512 ميغابايت',
  restore_failed: 'تعذرت الاستعادة. راجع نسخة الأمان أو سجل الخادم',
  reset_confirmation_required: 'اكتب عبارة التأكيد كما هي: حذف البيانات',
  reset_failed: 'تعذر تصفير البيانات. لم يكتمل الحذف؛ راجع سجل الخادم',
  admin_only: 'هذا الإجراء للمدير فقط',
  cashier_only: 'هذا الإجراء للكاشير فقط',
  not_allowed: 'غير مسموح بهذا الإجراء',
  user_not_found: 'المستخدم غير موجود',
  category_not_found: 'التصنيف غير موجود',
  product_not_found: 'المنتج غير موجود',
  product_image_required: 'اختر صورة للمنتج',
  product_image_too_large: 'حجم صورة المنتج يجب ألا يتجاوز 2 ميغابايت',
  invalid_product_image: 'الصورة يجب أن تكون بصيغة PNG أو JPEG أو WebP',
  purchase_not_found: 'فاتورة المشتريات غير موجودة',
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
