-- إنشاء دلو التخزين للمصادر (PDF، صور، فيديو)
-- Run in Supabase SQL Editor, or create manually in Dashboard: Storage > New bucket
-- Name: class-resources | Public: Yes

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'class-resources',
  'class-resources',
  true,
  52428800,  -- 50 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']::text[];

-- السماح للمستخدمين المصادقين بالرفع (فقط إلى مجلدهم)
create policy "Users upload to own folder" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'class-resources'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- السماح بالقراءة العامة (الدلو عام)
create policy "Public read class-resources" on storage.objects
for select to public using (bucket_id = 'class-resources');
