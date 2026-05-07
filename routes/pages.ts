import { Hono } from "hono";

const pagesApp = new Hono();

const LANDING_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>بيطري - تطبيق رعاية الحيوانات الأليفة</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #F8F9FA;
      color: #212121;
      direction: rtl;
    }
    header {
      background: linear-gradient(135deg, #27AE60, #1e8449);
      color: #fff;
      text-align: center;
      padding: 60px 20px 40px;
    }
    .logo-circle {
      width: 90px;
      height: 90px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 40px;
    }
    header h1 {
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: 1px;
    }
    header p {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-top: 10px;
    }
    .download-btn {
      display: inline-block;
      margin-top: 28px;
      background: #fff;
      color: #27AE60;
      font-size: 1rem;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: 50px;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
      transition: transform 0.2s;
    }
    .download-btn:hover { transform: translateY(-2px); }
    .features {
      max-width: 700px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .features h2 {
      text-align: center;
      font-size: 1.5rem;
      color: #27AE60;
      margin-bottom: 24px;
    }
    .feature-card {
      background: #fff;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .feature-icon {
      font-size: 28px;
      flex-shrink: 0;
    }
    .feature-card h3 {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 4px;
      color: #212121;
    }
    .feature-card p {
      font-size: 0.9rem;
      color: #757575;
      line-height: 1.6;
    }
    footer {
      text-align: center;
      padding: 30px 20px;
      color: #757575;
      font-size: 0.85rem;
      border-top: 1px solid #E0E0E0;
      margin-top: 20px;
    }
    footer a {
      color: #27AE60;
      text-decoration: none;
    }
    footer a:hover { text-decoration: underline; }
    footer p { margin-top: 6px; }
  </style>
</head>
<body>
  <header>
    <div class="logo-circle">🐾</div>
    <h1>بيطري</h1>
    <p>منصة متكاملة لرعاية الحيوانات الأليفة</p>
    <a class="download-btn" href="https://play.google.com/store/apps/details?id=com.petcare.bytari" target="_blank">
      ⬇ تحميل من Google Play
    </a>
  </header>

  <section class="features">
    <h2>مميزات التطبيق</h2>

    <div class="feature-card">
      <div class="feature-icon">🏥</div>
      <div>
        <h3>رعاية بيطرية احترافية</h3>
        <p>احجز مواعيد مع أفضل الأطباء البيطريين بسهولة وسرعة.</p>
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">👥</div>
      <div>
        <h3>مجتمع محبي الحيوانات</h3>
        <p>انضم إلى مجتمع من محبي الحيوانات الأليفة وتبادل الخبرات.</p>
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">🛒</div>
      <div>
        <h3>متجر متكامل</h3>
        <p>تسوق كل ما يحتاجه حيوانك الأليف من غذاء وإكسسوارات وأدوية.</p>
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">🔍</div>
      <div>
        <h3>البلاغ عن الحيوانات الضائعة</h3>
        <p>ساعد في إعادة الحيوانات الضائعة إلى أصحابها من خلال نظام الإبلاغ المتكامل.</p>
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">💼</div>
      <div>
        <h3>فرص العمل البيطري</h3>
        <p>تصفح وظائف في المجال البيطري وقدّم طلبك مباشرة من التطبيق.</p>
      </div>
    </div>
  </section>

  <footer>
    <a href="/privacy-policy">سياسة الخصوصية</a>
    <p>© 2026 بيطري — صُنع بمحبة للحيوانات الأليفة</p>
  </footer>
</body>
</html>`;

const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>سياسة الخصوصية — بيطري</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #F8F9FA;
      color: #212121;
      direction: rtl;
    }
    header {
      background: linear-gradient(135deg, #27AE60, #1e8449);
      color: #fff;
      text-align: center;
      padding: 40px 20px;
    }
    header h1 { font-size: 1.8rem; font-weight: 800; }
    header p { margin-top: 10px; opacity: 0.9; font-size: 1rem; }
    .back-link {
      display: inline-block;
      margin-top: 16px;
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      font-size: 0.9rem;
    }
    .back-link:hover { text-decoration: underline; }
    main {
      max-width: 700px;
      margin: 30px auto 40px;
      padding: 0 20px;
    }
    .card {
      background: #fff;
      border-radius: 14px;
      padding: 22px 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .card-icon { font-size: 22px; }
    .card h2 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #27AE60;
    }
    .card p {
      font-size: 0.93rem;
      color: #555;
      line-height: 1.75;
    }
    .rights-list {
      list-style: none;
      margin-top: 8px;
    }
    .rights-list li {
      font-size: 0.93rem;
      color: #555;
      line-height: 1.9;
      padding-right: 4px;
    }
    footer {
      text-align: center;
      padding: 24px 20px;
      color: #757575;
      font-size: 0.85rem;
      border-top: 1px solid #E0E0E0;
    }
    footer a { color: #27AE60; text-decoration: none; }
    footer a:hover { text-decoration: underline; }
    footer p { margin-top: 6px; }
  </style>
</head>
<body>
  <header>
    <h1>🔒 سياسة الخصوصية</h1>
    <p>نحترم خصوصيتك ونحمي بياناتك الشخصية</p>
    <a class="back-link" href="/">← العودة إلى الصفحة الرئيسية</a>
  </header>

  <main>
    <div class="card">
      <div class="card-header">
        <span class="card-icon">🗄️</span>
        <h2>جمع البيانات</h2>
      </div>
      <p>نجمع المعلومات التي تقدمها إلينا مباشرة مثل الاسم والبريد الإلكتروني ومعلومات حيوانك الأليف. كما نجمع معلومات حول استخدامك للتطبيق لتحسين خدماتنا.</p>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-icon">👁️</span>
        <h2>استخدام البيانات</h2>
      </div>
      <p>نستخدم بياناتك لتقديم الخدمات المطلوبة، وتحسين التطبيق، وإرسال الإشعارات المهمة، والتواصل معك بخصوص حسابك أو خدماتنا.</p>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-icon">🔐</span>
        <h2>حماية البيانات</h2>
      </div>
      <p>نستخدم تقنيات تشفير متقدمة لحماية بياناتك. جميع المعلومات الحساسة محمية بكلمات مرور قوية وبروتوكولات أمان عالية المستوى.</p>
    </div>

    <div class="card">
      <h2 style="color:#27AE60;margin-bottom:12px;">حقوقك</h2>
      <ul class="rights-list">
        <li>• الحق في الوصول إلى بياناتك الشخصية</li>
        <li>• الحق في تصحيح البيانات غير الدقيقة</li>
        <li>• الحق في حذف بياناتك</li>
        <li>• الحق في نقل البيانات</li>
        <li>• الحق في الاعتراض على معالجة البيانات</li>
      </ul>
    </div>

    <div class="card">
      <h2 style="color:#27AE60;margin-bottom:12px;">ملفات تعريف الارتباط (Cookies)</h2>
      <p>نستخدم ملفات تعريف الارتباط لتحسين تجربتك في التطبيق وتذكر تفضيلاتك. يمكنك إدارة هذه الملفات من خلال إعدادات المتصفح.</p>
    </div>

    <div class="card">
      <h2 style="color:#27AE60;margin-bottom:12px;">مشاركة البيانات</h2>
      <p>لا نبيع أو نؤجر بياناتك الشخصية لأطراف ثالثة. قد نشارك المعلومات مع مزودي خدمات موثوقين فقط لتقديم خدماتنا بشكل أفضل.</p>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-icon">📷</span>
        <h2>أذونات التطبيق</h2>
      </div>
      <p>يطلب التطبيق الأذونات التالية لتقديم خدماته:</p>
      <ul class="rights-list" style="margin-top:10px;">
        <li>• <strong>الكاميرا (CAMERA):</strong> تُستخدم لالتقاط صور حيوانك الأليف عند إنشاء إعلان ضياع أو تحديث الملف الشخصي. لا يتم الوصول إلى الكاميرا إلا عند موافقتك الصريحة.</li>
      </ul>
      <p style="margin-top:10px;">جميع الصور التي تلتقطها تبقى تحت سيطرتك الكاملة ولا تُشارك مع أي طرف ثالث دون إذنك.</p>
    </div>

    <div class="card">
      <h2 style="color:#27AE60;margin-bottom:12px;">تحديثات السياسة</h2>
      <p>قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سنُخطرك بأي تغييرات مهمة عبر التطبيق أو البريد الإلكتروني.</p>
    </div>
  </main>

  <footer>
    <a href="/">الصفحة الرئيسية</a>
    <p>© 2026 بيطري — جميع الحقوق محفوظة</p>
  </footer>
</body>
</html>`;

pagesApp.get("/", (c) => c.html(LANDING_HTML));
pagesApp.get("/privacy-policy", (c) => c.html(PRIVACY_HTML));

export default pagesApp;
