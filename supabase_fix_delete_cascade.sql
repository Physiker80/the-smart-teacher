-- إصلاح الحذف المتسلسل: عند حذف فصل، تُحذف السجلات المرتبطة
-- Run in Supabase SQL Editor if delete class fails

-- إذا فشل حذف الفصل بسبب class_enrollments، شغّل:
-- alter table class_enrollments drop constraint if exists class_enrollments_class_id_fkey;
-- alter table class_enrollments add constraint class_enrollments_class_id_fkey foreign key (class_id) references classes(id) on delete cascade;
