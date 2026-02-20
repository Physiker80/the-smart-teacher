-- تشغيل هذا الكود في Supabase -> SQL Editor
-- Run this migration to add support for full synchronization of all features

-- 1. جدول الوحدات التعليمية (Learning Units)
create table if not exists learning_units (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  class_id uuid references classes(id) on delete set null, -- Optional link to a specific class
  title text not null,
  objectives jsonb default '[]'::jsonb, -- Array of strings
  related_lesson_ids jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. جدول المجموعات الطلابية (Student Groups - Templates)
-- These are distinct from Classes (which are active courses). Groups are like "roster templates".
create table if not exists student_groups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  grade_level text,
  students jsonb default '[]'::jsonb, -- Store student list names/temp IDs for templates
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. جدول خطط الدروس (Lesson Plans)
create table if not exists lesson_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  topic text not null,
  subject text,
  grade text,
  content jsonb not null, -- Stores the full LessonPlan object
  is_public boolean default false, -- For potential sharing later
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. جدول المناهج المحللة (Curriculum Books - Minhaji)
create table if not exists curriculum_books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  book_metadata jsonb default '{}'::jsonb, -- subject, grade, etc.
  curriculum_structure jsonb default '[]'::jsonb, -- The analyzed lessons
  linked_class_id uuid references classes(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. جدول المصادر (Resources)
-- Covers: Songs, Stories, Simulations, Uploaded Files, Game Forge scenarios
create table if not exists resources (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  type text not null, -- 'song', 'story', 'simulation', 'game', 'pdf', etc.
  url text, -- Download URL or external link
  content jsonb, -- JSON data for internal tools (Game config, Song lyrics, etc.)
  tags text[],
  class_id uuid references classes(id) on delete set null,
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. جدول التقويم المدرسي (Calendar Events)
create table if not exists calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  time time,
  type text not null, -- 'lesson', 'exam', etc.
  related_class_id uuid references classes(id) on delete set null,
  details jsonb default '{}'::jsonb, -- notes, color, linked IDs
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. جدول الخزانة الخاصة (Private Vault)
create table if not exists private_vault_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null, -- 'journal', 'student_work'
  title text, -- For student work
  content text, -- Text content for journal
  media_url text, -- For images/videos
  mood text, -- For journal
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies (Security)
-- Enable RLS on all new tables
alter table learning_units enable row level security;
alter table student_groups enable row level security;
alter table lesson_plans enable row level security;
alter table curriculum_books enable row level security;
alter table resources enable row level security;
alter table calendar_events enable row level security;
alter table private_vault_entries enable row level security;

-- Create generic "Owner only" policies for all tables
create policy "Users manage own units" on learning_units for all using (auth.uid() = user_id);
create policy "Users manage own groups" on student_groups for all using (auth.uid() = user_id);
create policy "Users manage own lessons" on lesson_plans for all using (auth.uid() = user_id);
create policy "Users manage own books" on curriculum_books for all using (auth.uid() = user_id);
create policy "Users manage own resources" on resources for all using (auth.uid() = user_id);
create policy "Users manage own events" on calendar_events for all using (auth.uid() = user_id);
create policy "Users manage own vault" on private_vault_entries for all using (auth.uid() = user_id);
