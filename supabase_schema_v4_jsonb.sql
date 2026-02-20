-- تشغيل هذا الكود في Supabase -> SQL Editor
-- Run this migration to add support for JSONB fields and additional columns

-- 1. Add columns to 'classes' table
alter table classes 
add column if not exists name text, -- Display name (e.g. "Second Grade - A")
add column if not exists announcements jsonb default '[]'::jsonb,
add column if not exists assessments jsonb default '[]'::jsonb,
add column if not exists color text default 'from-blue-500 to-cyan-500';

-- 2. Add columns to 'class_enrollments' table
alter table class_enrollments
add column if not exists behavior_notes text,
add column if not exists grades jsonb default '[]'::jsonb,
add column if not exists participation_count integer default 0;

-- 3. Add columns to 'profiles' table for student details
alter table profiles
add column if not exists learning_style text,
add column if not exists dob date,
add column if not exists parent_contact text;

-- 4. Update 'Student' view helper function (Optional but good for debug)
-- We can create a view that joins profiles and enrollments later if needed.
