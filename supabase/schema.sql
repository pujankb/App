-- =============================================================================
-- ASPD Educational Platform — Complete PostgreSQL / Supabase Schema & RLS
-- =============================================================================
-- Supports both Supabase Cloud (PostgreSQL + Auth + Storage) and self-hosted
-- PostgreSQL. Student reads are restricted to published content; writes to
-- curriculum/notes/videos/announcements require verified administrator role.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Student',
  phone TEXT DEFAULT '',
  grade_target TEXT DEFAULT 'Class 12 / JEE & NEET',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- Helper function for RLS admin checks (SECURITY DEFINER avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'admin' AND status = 'active'
  );
$$;

-- 2. PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id SERIAL PRIMARY KEY,
  platform_name TEXT NOT NULL DEFAULT 'ASPD',
  tagline TEXT NOT NULL DEFAULT 'Structured academic preparation with curated study notes, video lectures, and faculty mentorship.',
  owner_name TEXT NOT NULL DEFAULT 'ASPD Academic Desk',
  owner_email TEXT NOT NULL DEFAULT 'support@aspd-academy.edu',
  whatsapp_number TEXT NOT NULL DEFAULT '+919876543210',
  support_hours TEXT NOT NULL DEFAULT 'Mon–Sat, 9:00 AM – 8:00 PM IST',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. COURSES, SUBJECTS, CHAPTERS, TOPICS
CREATE TABLE IF NOT EXISTS public.courses (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Intermediate',
  description TEXT NOT NULL,
  instructor_name TEXT NOT NULL DEFAULT 'ASPD Senior Faculty',
  thumbnail_url TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#1D4ED8',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  chapter_number INT NOT NULL DEFAULT 1,
  summary TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.topics (
  id BIGSERIAL PRIMARY KEY,
  chapter_id BIGINT NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic_order INT NOT NULL DEFAULT 1,
  summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_subjects_course ON public.subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_chapter ON public.topics(chapter_id);

-- 4. NOTES & VIDEOS
CREATE TABLE IF NOT EXISTS public.notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  course_id BIGINT REFERENCES public.courses(id) ON DELETE SET NULL,
  subject_id BIGINT REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id BIGINT REFERENCES public.chapters(id) ON DELETE SET NULL,
  topic_id BIGINT REFERENCES public.topics(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Lecture Notes',
  file_type TEXT NOT NULL DEFAULT 'pdf',
  file_url TEXT DEFAULT '',
  file_name TEXT NOT NULL DEFAULT 'study-note.pdf',
  file_size_bytes INT NOT NULL DEFAULT 0,
  thumbnail_url TEXT DEFAULT '',
  content_body TEXT NOT NULL DEFAULT '',
  downloads_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.videos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  course_id BIGINT REFERENCES public.courses(id) ON DELETE SET NULL,
  subject_id BIGINT REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id BIGINT REFERENCES public.chapters(id) ON DELETE SET NULL,
  topic_id BIGINT REFERENCES public.topics(id) ON DELETE SET NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',
  duration_seconds INT NOT NULL DEFAULT 1800,
  instructor_name TEXT NOT NULL DEFAULT 'ASPD Faculty',
  views_count INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.video_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id BIGINT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watched_seconds INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_subject ON public.notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_course ON public.notes(course_id);
CREATE INDEX IF NOT EXISTS idx_notes_published ON public.notes(is_published);
CREATE INDEX IF NOT EXISTS idx_videos_course ON public.videos(course_id);
CREATE INDEX IF NOT EXISTS idx_videos_subject ON public.videos(subject_id);

-- 5. ANNOUNCEMENTS, CONTACT MESSAGES, BOOKMARKS, DOWNLOADS, NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  admin_reply_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_id BIGINT NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, note_id)
);

CREATE TABLE IF NOT EXISTS public.downloads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_id BIGINT NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement',
  link_url TEXT DEFAULT '/announcements',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update own non-role fields; admins manage all
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_admin());

-- User roles: admin only
CREATE POLICY "user_roles_admin_only" ON public.user_roles
  FOR ALL USING (public.is_admin());

-- Platform settings: public read, admin write
CREATE POLICY "settings_public_read" ON public.platform_settings
  FOR SELECT USING (TRUE);
CREATE POLICY "settings_admin_write" ON public.platform_settings
  FOR ALL USING (public.is_admin());

-- Published educational content: public read published, admin full access
CREATE POLICY "courses_read_published" ON public.courses
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
CREATE POLICY "courses_admin_write" ON public.courses
  FOR ALL USING (public.is_admin());

CREATE POLICY "subjects_read_published" ON public.subjects
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
CREATE POLICY "subjects_admin_write" ON public.subjects
  FOR ALL USING (public.is_admin());

CREATE POLICY "chapters_read_published" ON public.chapters
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
CREATE POLICY "chapters_admin_write" ON public.chapters
  FOR ALL USING (public.is_admin());

CREATE POLICY "topics_read_all" ON public.topics
  FOR SELECT USING (TRUE);
CREATE POLICY "topics_admin_write" ON public.topics
  FOR ALL USING (public.is_admin());

CREATE POLICY "notes_read_published" ON public.notes
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
CREATE POLICY "notes_admin_write" ON public.notes
  FOR ALL USING (public.is_admin());

CREATE POLICY "videos_read_published" ON public.videos
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
CREATE POLICY "videos_admin_write" ON public.videos
  FOR ALL USING (public.is_admin());

CREATE POLICY "announcements_read_published" ON public.announcements
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
CREATE POLICY "announcements_admin_write" ON public.announcements
  FOR ALL USING (public.is_admin());

-- Student private personal records
CREATE POLICY "bookmarks_own_crud" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "downloads_own_insert_read" ON public.downloads
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "downloads_own_insert" ON public.downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "video_progress_own_crud" ON public.video_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_read_own_or_broadcast" ON public.notifications
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id OR public.is_admin());
CREATE POLICY "notifications_admin_write" ON public.notifications
  FOR ALL USING (public.is_admin());

-- Contact messages: anyone may submit; only admins may read/manage
CREATE POLICY "contact_insert_any" ON public.contact_messages
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "contact_admin_manage" ON public.contact_messages
  FOR ALL USING (public.is_admin());

-- =============================================================================
-- SUPABASE STORAGE BUCKETS & POLICIES
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('study-notes', 'study-notes', TRUE, 26214400, ARRAY['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']),
  ('course-media', 'course-media', TRUE, 52428800, ARRAY['image/png','image/jpeg','image/webp','video/mp4','video/webm'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('study-notes', 'course-media'));

CREATE POLICY "storage_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('study-notes', 'course-media') AND public.is_admin());

CREATE POLICY "storage_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id IN ('study-notes', 'course-media') AND public.is_admin());
