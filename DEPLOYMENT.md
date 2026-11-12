# انتشار MIXO GAME

## وضعیت مخزن
- کد منبع توسعه در شاخه `develop` نگهداری می‌شود.
- شاخه `main` شاخهٔ انتشار است و پس از عبور CI باید با Pull Request به‌روز شود.
- وب‌سایت با GitHub Pages و فایل‌های EXE با GitHub Actions ساخته می‌شوند.

## فعال‌سازی یک‌بارهٔ GitHub Pages
توکن GitHub Actions این مخزن اجازهٔ ساخت اولیهٔ سایت Pages را ندارد. مالک مخزن باید فقط یک بار:
1. وارد `Settings → Pages` مخزن شود.
2. در بخش `Build and deployment`، گزینهٔ `Source` را روی `GitHub Actions` بگذارد.
3. ذخیره کند.

پس از این کار، گردش کار `.github/workflows/pages.yml` هنگام Push روی `develop` یا `main` وب‌سایت را خودکار می‌سازد و منتشر می‌کند.

آدرس انتشار:
`https://vidox-ir.github.io/MIXO_GAME/`

## ساخت ویندوز
گردش کار `MIXO GAME CI` روی Windows Runner دو خروجی می‌سازد:
- نصاب NSIS در `release/*.exe`
- نسخهٔ Portable در `release-portable/*.exe`

فایل‌ها در بخش Artifacts اجرای موفق CI قابل دریافت هستند. اسکریپت `scripts/generate-icon.cjs` آیکون معتبر چنداندازه را پیش از بسته‌بندی تولید می‌کند.

## فعال‌سازی ایمیل ثبت‌نام و بازیابی
برای ارسال ایمیل به همهٔ کاربران باید یک دامنهٔ تحت مالکیت پروژه در Resend تأیید شود. پس از تأیید دامنه:
- Host: `smtp.resend.com`
- Port: `465` یا `587`
- Username: `resend`
- Password: کلید API ارسال Resend که فقط در تنظیمات SMTP پروژه قرار می‌گیرد.
- Sender: نشانی‌ای از همان دامنهٔ تأییدشده، مانند `no-reply@auth.example.com`.

در Supabase → Authentication → SMTP Settings، SMTP سفارشی را فعال کن. سپس قالب‌های Confirm signup و Reset password باید مقدار `{{ .Token }}` را نمایش دهند تا ورود کد شش‌رقمی برنامه با `verifyOtp` کار کند.

Site URL و Redirect URLs را روی آدرس GitHub Pages تنظیم کن. کلید Resend، کلید Supabase Secret و هر نوع رمز عبور نباید در GitHub، کد مرورگر یا فایل EXE قرار بگیرد.

**نکتهٔ امنیتی:** کلید Resend که قبلاً در چت قرار گرفته باید از پنل Resend لغو و با یک کلید تازه جایگزین شود.
