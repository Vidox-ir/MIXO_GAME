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
- فونت‌ها: Almarai (تیتر فارسی)، Readex Pro (متن)، Chakra Petch (برچسب‌های فنی)، JetBrains Mono (داده‌های عددی)؛ بدون Vazirmatn

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

### قالب‌های OTP برای ثبت‌نام و بازیابی رمز

در Supabase → Authentication → Email Templates این دو قالب را به حالت کد یک‌بارمصرف تغییر بده؛ برنامه کد را در فرم دریافت و با `verifyOtp` بررسی می‌کند:

**Confirm signup**
```html
<h2>تأیید ایمیل MIXO GAME</h2>
<p>کد شش‌رقمی فعال‌سازی حساب شما:</p>
<p style="font-size:28px;letter-spacing:8px;font-weight:700">{{ .Token }}</p>
<p>این کد را فقط در برنامه وارد کنید. اگر شما ثبت‌نام نکرده‌اید، این پیام را نادیده بگیرید.</p>
```

**Reset password**
```html
<h2>بازیابی رمز MIXO GAME</h2>
<p>کد شش‌رقمی بازیابی رمز شما:</p>
<p style="font-size:28px;letter-spacing:8px;font-weight:700">{{ .Token }}</p>
<p>اگر شما درخواست بازیابی نداده‌اید، این پیام را نادیده بگیرید.</p>
```

در Auth → SMTP Settings، SMTP سفارشی را روشن و مقادیر Resend را وارد کن:
- Host: `smtp.resend.com`
- Port: `465` (SSL) یا `587` (STARTTLS)
- Username: `resend`
- Password: کلید API ارسال Resend
- Sender email: نشانی‌ای مانند `no-reply@auth.yourdomain.tld` از دامنه‌ای که در Resend تأیید شده
- Sender name: `MIXO GAME`

همچنین Site URL و Redirect URLs را روی آدرس نهایی وب تنظیم کن؛ برای نسخه وب GitHub Pages از `https://vidox-ir.github.io/MIXO_GAME/` استفاده می‌شود. در جریان OTP، برنامه به بازگشت از لینک ایمیل متکی نیست و کد را مستقیم داخل وب یا نسخه ویندوز می‌گیرد.

## ماژول‌ها
- **NEXUS:** کتابخانه بازی، ثبت مسیر EXE و اجرای مستقیم فقط در نسخه دسکتاپ.
- **NetScope:** فهرست ۲۵ سرویس DNS، تست DoH در وب و DNS مستقیم از ویندوز؛ پایش Ping هر ۶۰ ثانیه، نمودار و تاریخچهٔ نتایج/قطعی‌ها برای کاربران واردشده.
- **Ghost Protocol:** سناریوهای آموزشی ساختگی؛ بررسی پاسخ و ثبت XP با RPC سمت دیتابیس.
- **Parallel World:** نقشه داستانی، تصرف منطقه و پاداش منابع از طریق RPC سمت دیتابیس.

## نکات فنی و امنیتی
- کلید publishable در کلاینت مجاز است؛ هرگز از `service_role` یا `sb_secret` در برنامه استفاده نکن.
- همه جدول‌های `public` با RLS محافظت شده‌اند؛ پیشرفت مأموریت و تصرف قلمرو از طریق RPCهای محدود انجام می‌شود. جدول‌های `dns_test_runs` و `network_test_runs` نیز تاریخچهٔ شخصی هر حساب را نگه می‌دارند.
- تست مرورگر از DNS-over-HTTPS استفاده می‌کند؛ تست IP مستقیم و Ping فقط در Electron ممکن است.
- DNSها از چند منبع رسمی/عمومی گردآوری شده‌اند؛ نتیجه واقعی به اپراتور، مسیر، IPv4/IPv6 و فیلترینگ وابسته است. مقایسه سرعت، تضمین امنیت نیست.

## وضعیت ساخت ویندوز\n\n- `npm run dist:win` نصاب NSIS ویندوز را می‌سازد.\n- `npm run dist:portable` نسخهٔ Portable را در پوشهٔ جداگانهٔ `release-portable` می‌سازد.\n- انتشار خودکار به GitHub Release غیرفعال است؛ CI فایل‌های تولیدشده را به‌عنوان Artifact بارگذاری می‌کند و به Personal Access Token نیاز ندارد.\n\n## گردش کار GitHub\n\n- توسعهٔ روزمره در شاخهٔ `develop` انجام می‌شود.\n- تا پیش از آماده‌شدن نسخهٔ قابل انتشار، نیازی به Pull Request نیست.\n- وقتی آزمون‌های محصول و ایمیل کامل شدند، یک Pull Request از `develop` به `main` باز می‌شود؛ ادغام دستی و پس از بررسی انجام خواهد شد.\n\n## Branch plan
- `develop` — یکپارچه‌سازی و نسخه آزمایشی
- `feature/nexus-launcher` — کتابخانه و اجرای بازی
- `feature/netscope-dns` — موتور DNS و پایش شبکه
- `feature/ghost-protocol` — مأموریت‌ها و امتیاز
- `feature/parallel-world` — نقشه و اقتصاد بازی
- `feature/supabase-auth` — ورود، OTP و پروفایل

## مجوز
کد پروژه تا پیش از تعیین مجوز، بدون مجوز بازتوزیع مشخص منتشر شده است.
