# VPS Deployment

هذا الملف يجهز النسخة المعزولة للعمل على VPS مستقل لها فقط، مع تشغيل التطبيق وعامل الواتساب كخدمتين منفصلتين.

## 1. المتطلبات على الخادم

- Ubuntu 22.04 أو Debian 12
- Node.js 22
- pnpm 10+
- Nginx
- Google Chrome أو Chromium
- دومين أو ساب دومين مستقل لهذه النسخة

## 2. رفع المشروع

انسخ المشروع إلى:

```bash
/var/www/habib-isolated-instance
```

ثم ثبت الاعتمادات وابنِ التطبيق:

```bash
cd /var/www/habib-isolated-instance
pnpm install --frozen-lockfile
pnpm build
```

## 3. ملف البيئة

انسخ الملف التالي:

```bash
cp .env.vps.example .env.local
```

ثم عدل القيم الحقيقية خصوصًا:

- مفاتيح Supabase
- مفاتيح Web Push
- مسار Chrome
- مسارات ملفات عامل الواتساب

مهم:

- قيمة `SUPABASE_SERVICE_ROLE_KEY` يجب أن تكون الـ JWT فقط بدون البادئة `service_role-`
- لا تشارك نفس مسار `WHATSAPP_AUTH_DIR` مع أي موقع آخر

## 4. تثبيت Chrome

إذا لم يكن Chrome مثبتًا:

```bash
wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor | sudo tee /usr/share/keyrings/google-linux.gpg > /dev/null
echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux.gpg] http://dl.google.com/linux/chrome/deb/ stable main' | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable
```

## 5. خدمات systemd

انسخ الملفات:

```bash
sudo cp deploy/systemd/habib-isolated-app.service /etc/systemd/system/
sudo cp deploy/systemd/habib-isolated-whatsapp.service /etc/systemd/system/
```

إذا كان مستخدم التشغيل ليس `www-data` فعدله داخل الملفين.

ثم فعل الخدمات:

```bash
sudo systemctl daemon-reload
sudo systemctl enable habib-isolated-app
sudo systemctl enable habib-isolated-whatsapp
sudo systemctl start habib-isolated-app
sudo systemctl start habib-isolated-whatsapp
```

وللتحقق:

```bash
sudo systemctl status habib-isolated-app
sudo systemctl status habib-isolated-whatsapp
journalctl -u habib-isolated-app -f
journalctl -u habib-isolated-whatsapp -f
```

## 6. Nginx

انسخ إعداد Nginx:

```bash
sudo cp deploy/nginx/habib-isolated.conf /etc/nginx/sites-available/habib-isolated
sudo ln -s /etc/nginx/sites-available/habib-isolated /etc/nginx/sites-enabled/habib-isolated
```

عدّل `server_name` إلى الدومين الحقيقي، ثم اختبر وأعد تحميل Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

بعدها فعّل SSL عبر Certbot إذا أردت النشر العام.

## 7. ربط الواتساب

عامل الواتساب هنا لا يعتمد على VPS آخر ولا على خدمة خارجية مستقلة. هو يعمل داخل نفس هذا المشروع ويقرأ من `whatsapp_queue` في قاعدة البيانات الخاصة بهذه النسخة.

بعد تشغيل الخدمة لأول مرة:

- راقب سجل الخدمة حتى يظهر QR
- افتح صورة QR من المسار المحدد في `.env.local`
- امسحها من رقم الواتساب الخاص بالمجمع الجديد فقط

## 8. ملاحظات تشغيلية

- لا تشارك `.env.local` بين هذه النسخة وأي نسخة أخرى
- لا تشارك مجلد `whatsapp-worker/.wwebjs_auth_isolated` مع أي موقع آخر
- يمكن تشغيل التطبيق بدون عامل الواتساب، لكن الرسائل ستبقى في `whatsapp_queue` بدون إرسال
- Web Push يعمل من نفس التطبيق ولا يحتاج خدمة منفصلة