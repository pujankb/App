import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable(
  'profiles',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull().default('Student'),
    phone: text('phone').default(''),
    gradeTarget: text('grade_target').default('Class 12 / JEE & NEET'),
    bio: text('bio').default(''),
    avatarUrl: text('avatar_url').default(''),
    role: text('role').notNull().default('student'), // 'student' | 'admin'
    status: text('status').notNull().default('active'), // 'active' | 'suspended'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('profiles_uid_idx').on(table.uid),
    index('profiles_email_idx').on(table.email),
    index('profiles_role_idx').on(table.role),
  ]
);

export const userRoles = pgTable(
  'user_roles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull().default('student'),
    grantedBy: text('granted_by').default('system'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('user_roles_user_id_idx').on(table.userId)]
);

export const localAccounts = pgTable(
  'local_accounts',
  {
    id: serial('id').primaryKey(),
    loginId: text('login_id').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    profileUid: text('profile_uid')
      .references(() => profiles.uid, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('local_accounts_login_id_idx').on(table.loginId)]
);

export const adminCredentials = pgTable('admin_credentials', {
  id: serial('id').primaryKey(),
  adminLoginId: text('admin_login_id').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  claimedAt: timestamp('claimed_at').defaultNow().notNull(),
});

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  platformName: text('platform_name').notNull().default('ASPD'),
  tagline: text('tagline')
    .notNull()
    .default('Structured academic preparation with curated notes, video lectures, and direct faculty mentorship.'),
  ownerName: text('owner_name').notNull().default('ASPD Academic Desk'),
  ownerEmail: text('owner_email').notNull().default('support@aspd-academy.edu'),
  whatsappNumber: text('whatsapp_number').notNull().default('+919876543210'),
  supportHours: text('support_hours').notNull().default('Mon–Sat, 9:00 AM – 8:00 PM IST'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const courses = pgTable(
  'courses',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    category: text('category').notNull(), // e.g., 'JEE Main & Adv', 'NEET UG', 'Class 12 Boards', 'Foundation'
    level: text('level').notNull().default('Intermediate'),
    description: text('description').notNull(),
    instructorName: text('instructor_name').notNull().default('ASPD Senior Faculty'),
    thumbnailUrl: text('thumbnail_url').default(''),
    isPublished: boolean('is_published').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('courses_category_idx').on(table.category),
    index('courses_published_idx').on(table.isPublished),
  ]
);

export const subjects = pgTable(
  'subjects',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    code: text('code').notNull().default('SUB-101'),
    description: text('description').default(''),
    accentColor: text('accent_color').notNull().default('#1D4ED8'),
    isPublished: boolean('is_published').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('subjects_course_id_idx').on(table.courseId)]
);

export const chapters = pgTable(
  'chapters',
  {
    id: serial('id').primaryKey(),
    subjectId: integer('subject_id')
      .references(() => subjects.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    chapterNumber: integer('chapter_number').notNull().default(1),
    summary: text('summary').default(''),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('chapters_subject_id_idx').on(table.subjectId)]
);

export const topics = pgTable(
  'topics',
  {
    id: serial('id').primaryKey(),
    chapterId: integer('chapter_id')
      .references(() => chapters.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    topicOrder: integer('topic_order').notNull().default(1),
    summary: text('summary').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('topics_chapter_id_idx').on(table.chapterId)]
);

export const notes = pgTable(
  'notes',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
    subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    chapterId: integer('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
    topicId: integer('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    category: text('category').notNull().default('Lecture Notes'), // 'Lecture Notes' | 'Formula Sheet' | 'DPP' | 'Revision Guide' | 'Diagram'
    fileType: text('file_type').notNull().default('pdf'), // 'pdf' | 'image' | 'document'
    fileUrl: text('file_url').default(''),
    fileName: text('file_name').notNull().default('study-note.pdf'),
    fileSizeBytes: integer('file_size_bytes').notNull().default(0),
    thumbnailUrl: text('thumbnail_url').default(''),
    contentBody: text('content_body').notNull().default(''),
    downloadsCount: integer('downloads_count').notNull().default(0),
    viewsCount: integer('views_count').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    uploadedByUid: text('uploaded_by_uid').default('system'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('notes_subject_id_idx').on(table.subjectId),
    index('notes_course_id_idx').on(table.courseId),
    index('notes_category_idx').on(table.category),
    index('notes_published_idx').on(table.isPublished),
  ]
);

export const videos = pgTable(
  'videos',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
    subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    chapterId: integer('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
    topicId: integer('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    videoUrl: text('video_url').notNull(),
    thumbnailUrl: text('thumbnail_url').default(''),
    durationSeconds: integer('duration_seconds').notNull().default(1800),
    instructorName: text('instructor_name').notNull().default('ASPD Faculty'),
    viewsCount: integer('views_count').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('videos_course_id_idx').on(table.courseId),
    index('videos_subject_id_idx').on(table.subjectId),
    index('videos_published_idx').on(table.isPublished),
  ]
);

export const videoProgress = pgTable(
  'video_progress',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid').notNull(),
    videoId: integer('video_id')
      .references(() => videos.id, { onDelete: 'cascade' })
      .notNull(),
    watchedSeconds: integer('watched_seconds').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('video_progress_user_video_idx').on(table.userUid, table.videoId)]
);

export const announcements = pgTable(
  'announcements',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    category: text('category').notNull().default('general'), // 'general' | 'new_notes' | 'new_course' | 'exam_alert'
    isPinned: boolean('is_pinned').notNull().default(false),
    isPublished: boolean('is_published').notNull().default(true),
    createdByUid: text('created_by_uid').default('system'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('announcements_published_idx').on(table.isPublished)]
);

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: serial('id').primaryKey(),
    studentUid: text('student_uid').default(''),
    studentName: text('student_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').default(''),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    status: text('status').notNull().default('open'), // 'open' | 'resolved'
    adminReplyNote: text('admin_reply_note').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
  },
  (table) => [index('contact_messages_status_idx').on(table.status)]
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid').notNull(),
    noteId: integer('note_id')
      .references(() => notes.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('bookmarks_user_note_idx').on(table.userUid, table.noteId)]
);

export const downloads = pgTable(
  'downloads',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid').notNull(),
    noteId: integer('note_id')
      .references(() => notes.id, { onDelete: 'cascade' })
      .notNull(),
    downloadedAt: timestamp('downloaded_at').defaultNow().notNull(),
  },
  (table) => [
    index('downloads_user_uid_idx').on(table.userUid),
    index('downloads_note_id_idx').on(table.noteId),
  ]
);

export const recentlyViewed = pgTable(
  'recently_viewed',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid').notNull(),
    noteId: integer('note_id')
      .references(() => notes.id, { onDelete: 'cascade' })
      .notNull(),
    viewedAt: timestamp('viewed_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('recently_viewed_user_note_idx').on(table.userUid, table.noteId)]
);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid').default(''), // empty = broadcast to all students
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').notNull().default('announcement'), // 'announcement' | 'note' | 'course' | 'message'
    linkUrl: text('link_url').default('/announcements'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('notifications_user_uid_idx').on(table.userUid)]
);

// Relations
export const coursesRelations = relations(courses, ({ many }) => ({
  subjects: many(subjects),
  notes: many(notes),
  videos: many(videos),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  course: one(courses, { fields: [subjects.courseId], references: [courses.id] }),
  chapters: many(chapters),
  notes: many(notes),
  videos: many(videos),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  subject: one(subjects, { fields: [chapters.subjectId], references: [subjects.id] }),
  topics: many(topics),
  notes: many(notes),
}));

export const topicsRelations = relations(topics, ({ one }) => ({
  chapter: one(chapters, { fields: [topics.chapterId], references: [chapters.id] }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  roles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  profile: one(profiles, { fields: [userRoles.userId], references: [profiles.id] }),
}));
