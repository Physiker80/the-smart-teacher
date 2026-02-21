-- إصلاح سياسات RLS للسماح برفع ملفات المصادر في curriculum_books
-- Run in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/awcpjunztfaxjhyatfcf/sql/new

-- إزالة السياسة إن وُجدت (لإعادة التشغيل)
drop policy if exists "Allow resource uploads to own folder" on storage.objects;

-- السماح للمستخدمين المصادقين بالرفع إلى مجلد resources/خاص بهم
create policy "Allow resource uploads to own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'curriculum_books'
  and (storage.foldername(name))[1] = 'resources'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- السماح للمستخدمين بحذف ملفاتهم من مجلد resources
drop policy if exists "Allow resource delete own folder" on storage.objects;
create policy "Allow resource delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'curriculum_books'
  and (storage.foldername(name))[1] = 'resources'
  and (storage.foldername(name))[2] = auth.uid()::text
);
