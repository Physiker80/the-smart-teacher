-- تشغيل هذا الكود في Supabase -> SQL Editor
-- Run this code in Supabase -> SQL Editor

-- 1. جدول المستخدمين (الطلاب) - تحديث الجدول الموجود
create table if not exists public.profiles (
  id uuid primary key, 
  username text,
  full_name text,
  role text default 'student',
  school text,
  subject text,
  bio text,
  theme_preference text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- إضافة الأعمدة الناقصة (XP, Level) إذا لم تكن موجودة
alter table public.profiles add column if not exists xp integer default 840;
alter table public.profiles add column if not exists level integer default 12;
alter table public.profiles add column if not exists badges text[] default '{}';

-- 2. جدول المهام التفاعلية (The missing table causing errors)
create table if not exists public.oasis_tasks (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    title text not null,
    content text,
    type text, -- 'explorer', 'quiz', 'treasure_hunt'
    "visualStyle" text default 'paper', -- 'paper', 'wood', 'stone'
    status text default 'active', -- 'active', 'completed', 'pending'
    "studentId" uuid, -- Can be null for class-wide tasks
    "classId" text,
    "lessonId" text,
    feedback text,
    score integer default 0
);

-- 3. جدول بث المعلم (Teacher Broadcasts)
create table if not exists public.teacher_broadcasts (
    id uuid default gen_random_uuid() primary key,
    teacher_id text default 'teacher-1',
    message text,
    type text, -- 'note', 'quiz', 'poll'
    active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. جدول تقدم الدروس (Student Progress)
create table if not exists public.student_progress (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id),
    lesson_title text not null,
    score integer default 0,
    completed boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. جدول المحادثات (Chat History)
create table if not exists public.chat_history (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id),
    sender text not null, -- 'user' or 'aleem'
    text text not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- تفعيل Realtime للجداول
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.oasis_tasks;
alter publication supabase_realtime add table public.teacher_broadcasts;
alter publication supabase_realtime add table public.student_progress;
alter publication supabase_realtime add table public.chat_history;

-- سياسات الأمان (السماح للجميع مؤقتاً للتجربة)
-- Profiles
alter table public.profiles enable row level security;
create policy "Public Access Profiles" on public.profiles for all using (true) with check (true);

-- Oasis Tasks
alter table public.oasis_tasks enable row level security;
create policy "Public Access Oasis Tasks" on public.oasis_tasks for all using (true) with check (true);

-- Teacher Broadcasts
alter table public.teacher_broadcasts enable row level security;
create policy "Public Access Broadcasts" on public.teacher_broadcasts for all using (true) with check (true);

-- Student Progress
alter table public.student_progress enable row level security;
create policy "Public Access Progress" on public.student_progress for all using (true) with check (true);

-- Chat History
alter table public.chat_history enable row level security;
create policy "Public Access Chat" on public.chat_history for all using (true) with check (true);
