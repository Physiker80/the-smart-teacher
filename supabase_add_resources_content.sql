-- إضافة عمود content لجدول resources (إذا كان مفقوداً)
-- Run in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/awcpjunztfaxjhyatfcf/sql/new

alter table resources add column if not exists content jsonb;
