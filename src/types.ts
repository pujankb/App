export interface PlatformSettings {
  id: number;
  platformName: string;
  tagline: string;
  ownerName: string;
  ownerEmail: string;
  whatsappNumber: string;
  supportHours: string;
  updatedAt: string;
}

export interface Profile {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  gradeTarget: string;
  bio: string;
  avatarUrl: string;
  role: 'student' | 'admin' | string;
  status: 'active' | 'suspended' | string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  category: string;
  level: string;
  description: string;
  instructorName: string;
  thumbnailUrl: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Subject {
  id: number;
  courseId: number;
  name: string;
  code: string;
  description: string;
  accentColor: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Chapter {
  id: number;
  subjectId: number;
  title: string;
  chapterNumber: number;
  summary: string;
  isPublished: boolean;
  createdAt: string;
}

export interface Topic {
  id: number;
  chapterId: number;
  title: string;
  topicOrder: number;
  summary: string;
  createdAt: string;
}

export interface NoteItem {
  id: number;
  title: string;
  description: string;
  courseId: number | null;
  subjectId: number | null;
  chapterId: number | null;
  topicId: number | null;
  category: string;
  fileType: 'pdf' | 'image' | 'document' | string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  thumbnailUrl: string;
  contentBody: string;
  downloadsCount: number;
  viewsCount: number;
  isPublished: boolean;
  uploadedByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoItem {
  id: number;
  title: string;
  description: string;
  courseId: number | null;
  subjectId: number | null;
  chapterId: number | null;
  topicId: number | null;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  instructorName: string;
  viewsCount: number;
  isPublished: boolean;
  createdAt: string;
}

export interface VideoProgress {
  id: number;
  userUid: string;
  videoId: number;
  watchedSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  category: 'general' | 'new_notes' | 'new_course' | 'exam_alert' | string;
  isPinned: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: number;
  userUid: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContactMessageItem {
  id: number;
  studentUid: string;
  studentName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved' | string;
  adminReplyNote: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface UserLibrary {
  bookmarks: (NoteItem & { bookmarkedAt: string })[];
  downloads: (NoteItem & { downloadedAt: string })[];
  recentlyViewed: (NoteItem & { viewedAt: string })[];
}

export interface AdminOverviewData {
  stats: {
    totalStudents: number;
    totalCourses: number;
    totalSubjects: number;
    totalNotes: number;
    totalVideos: number;
    totalDownloads: number;
    openContactMessages: number;
    recentActivity: {
      notes: NoteItem[];
      messages: ContactMessageItem[];
      users: Profile[];
    };
  };
  courses: Course[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  notes: NoteItem[];
  videos: VideoItem[];
  announcements: AnnouncementItem[];
  messages: ContactMessageItem[];
  students: Profile[];
  settings: PlatformSettings;
  adminAuth?: {
    envConfigured: boolean;
    adminLoginId: string | null;
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return 'PDF Ready';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatDateShort(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
