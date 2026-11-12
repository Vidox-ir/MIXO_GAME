# MIXO GAME — NEXUS SUITE

مجموعه‌ای فارسی برای ویندوز ۱۰/۱۱ و وب: لانچر NEXUS، آزمایشگاه NetScope، مأموریت‌های Ghost Protocol و جهان موازی.

## وضعیت
- شاخه اصلی: `main`
- شاخه توسعه: `develop`
- هسته دیتابیس و RLS روی Supabase اعمال شده است.
- رابط وب/دسکتاپ در حال توسعه است؛ این نسخه پیش‌نمایش اولیه است، نه انتشار نهایی.

## پشته فنی
- React + TypeScript + Vite
- Electron برای برنامه ویندوز
- Supabase Auth + Postgres + RLS
- Resend به‌عنوان SMTP تراکنشی برای ایمیل Supabase (پس از اتصال دامنه فرستنده)
- فونت‌ها: Cairo (عنوان)، Changa (تأکید)، IBM Plex Sans Arabic (متن)، بدون Vazirmatn

## راه‌اندازی
1. Node.js نسخه 22.12 یا بالاتر را نصب کن.
2. مخزن را Clone کن و به شاخه `develop` برو.
3. `.env.example` را به `.env` تغییر نام بده؛ URL و کلید publishable پروژه Supabase از قبل نمونه‌گذاری شده‌اند.
4. اجرا:
   ```bash
   npm install
   npm run dev
   ```
5. ساخت وب:
   ```bash
   npm run build
   ```
6. ساخت نصاب ویندوز:
   ```bash
   npm run dist:win
   ```
   خروجی در پوشه `release` قرار می‌گیرد.

## ایمیل و احراز هویت — نیازمند تکمیل پیش از انتشار عمومی
برای ارسال کد ۶ رقمی ثبت‌نام و بازیابی رمز، باید یک دامنه تحت مالکیتت در Resend تأیید شود. سپس:
- در Resend یک API Key با دسترسی Sending بساز.
- در Supabase Dashboard → Authentication → SMTP Settings، SMTP سفارشی را فعال کن:
  - Host: `smtp.resend.com`
  - Port: `465` (TLS) یا `587` (STARTTLS)
  - Username: `resend`
  - Password: کلید API ارسال Resend
  - Sender: یک نشانی از دامنه تأییدشده
- در Authentication → Email Templates، قالب‌های Confirmation و Recovery را طوری تنظیم کن که `{{ .Token }}` را نمایش دهند. در این صورت فرم کد یک‌بارمصرف برنامه با `verifyOtp` کار می‌کند.
- تنظیمات Redirect URL را برای دامنه وب و deep-link برنامه دسکتاپ تکمیل کن.

در حال حاضر حساب Resend متصل، دامنه تأییدشده ندارد؛ بنابراین ارسال عمومی ایمیل هنوز فعال نشده است. کلیدهای Resend و Supabase Secret را هرگز در کد کلاینت، GitHub یا فایل اجرایی قرار نده.

## ماژول‌ها
- **NEXUS:** کتابخانه بازی، ثبت مسیر EXE و اجرای مستقیم فقط در نسخه دسکتاپ.
- **NetScope:** فهرست DNS و تست DoH در وب؛ تست مستقیم UDP/TCP و Ping از برنامه ویندوز.
- **Ghost Protocol:** سناریوهای آموزشی ساختگی؛ بررسی پاسخ و ثبت XP با RPC سمت دیتابیس.
- **Parallel World:** نقشه داستانی، تصرف منطقه و پاداش منابع از طریق RPC سمت دیتابیس.

## نکات فنی و امنیتی
- کلید publishable در کلاینت مجاز است؛ هرگز از `service_role` یا `sb_secret` در برنامه استفاده نکن.
- همه جداول public با RLS محافظت شده‌اند؛ پیشرفت مأموریت و تصرف قلمرو از طریق RPCهای محدود انجام می‌شود.
- تست مرورگر از DNS-over-HTTPS استفاده می‌کند؛ تست IP مستقیم و Ping فقط در Electron ممکن است.
- DNSها از چند منبع رسمی/عمومی گردآوری شده‌اند؛ نتیجه واقعی به اپراتور، مسیر، IPv4/IPv6 و فیلترینگ وابسته است. مقایسه سرعت، تضمین امنیت نیست.

## Branch plan
- `develop` — یکپارچه‌سازی و نسخه آزمایشی
- `feature/nexus-launcher` — کتابخانه و اجرای بازی
- `feature/netscope-dns` — موتور DNS و پایش شبکه
- `feature/ghost-protocol` — مأموریت‌ها و امتیاز
- `feature/parallel-world` — نقشه و اقتصاد بازی
- `feature/supabase-auth` — ورود، OTP و پروفایل

## مجوز
کد پروژه تا پیش از تعیین مجوز، بدون مجوز بازتوزیع مشخص منتشر شده است.
