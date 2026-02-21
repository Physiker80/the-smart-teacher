-- إصلاح: إضافة أعمدة مطلوبة لجدول profiles (الطلاب)
-- نفّذ هذا الملف في Supabase -> SQL Editor -> New Query
-- Fix: Add required columns to profiles table for students
-- Run this in Supabase Dashboard -> SQL Editor -> New Query

-- 0. السماح بإنشاء طلاب بدون حساب تسجيل دخول (id يُولَّد تلقائياً)
-- Drop FK to auth.users so we can insert student profiles without auth accounts
do $$
declare r record;
begin
  for r in (
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'f'
    and confrelid = 'auth.users'::regclass
  ) loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
  alter table public.profiles alter column id set default gen_random_uuid();
end $$;

-- 1. رقم التسجيل (مطلوب لإضافة الطلاب)
alter table profiles add column if not exists registration_code text unique;
create index if not exists idx_profiles_registration_code on profiles(registration_code) where registration_code is not null;

-- 2. أعمدة إضافية للطلاب (إن لم تكن موجودة)
alter table profiles add column if not exists learning_style text;
alter table profiles add column if not exists dob date;
alter table profiles add column if not exists parent_contact text;
