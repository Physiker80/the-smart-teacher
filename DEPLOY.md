# Deployment Guide to Vercel

This project is ready to be deployed to Vercel. Follow these steps:

## Prerequisites

1.  **Vercel Account:** Create one at [vercel.com](https://vercel.com).
2.  **GitHub/GitLab/Bitbucket:** Push this code to a repository.

## Steps

1.  **Push your code** to a Git repository.
2.  **Log in to Vercel** and click **"Add New..."** -> **"Project"**.
3.  **Import your repository**.
4.  **Configure Project:**
    *   **Framework Preset:** Vite (should be detected automatically).
    *   **Root Directory:** `./` (default).
    *   **Build Command:** `npm run build` (default).
    *   **Output Directory:** `dist` (default).
5.  **Environment Variables:**
    *   Add the following variables (copy values from your `.env.local` or ask your admin):
        *   `VITE_GEMINI_API_KEY`
        *   `VITE_SUPABASE_URL`
        *   `VITE_SUPABASE_ANON_KEY`
6.  Click **Deploy**.

## Troubleshooting

*   **404 on Refresh:** The `vercel.json` file included in this project handles routing rewrites, so this should not happen.
*   **Build Failures:** Check the "Logs" tab in Vercel for details.


خطوات النشر (Deployment Steps):
رفع الكود إلى GitHub:

تأكد من رفع الكود الحالي إلى مستودع GitHub خاص بك.
إنشاء مشروع جديد في Vercel:

اذهب إلى Dashboard.
اضغط Add New > Project.
اختر المستودع (Repository) الذي رفعت عليه الكود.
إعدادات المشروع (Project Settings):

سيتعرف Vercel تلقائياً على أن المشروع يستخدم Vite.
اترك إعدادات البناء (Build Settings) كما هي:
Build Command: npm run build
Output Directory: dist
المتغيرات البيئية (Environment Variables) - خطوة مهمة جداً:

افتح قسم Environment Variables في صفحة الإعداد قبل الضغط على Deploy.
أضف المفاتيح التالية (يمكنك نسخ قيمها من ملف .env.local الموجود عندك):
VITE_GEMINI_API_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
النشر (Deploy):

اضغط زر Deploy.
انتظر دقيقة أو دقيقتين حتى يكتمل البناء، وسيظهر لك رابط الموقع الجديد (مثلاً your-project.vercel.app).
لقد قمت بإنشاء ملف DEPLOY.md في مجلد المشروع يحتوي على هذه التعليمات للاستخدام المستقبلي.

