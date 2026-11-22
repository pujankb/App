import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  adminCredentials,
  announcements,
  bookmarks,
  chapters,
  contactMessages,
  courses,
  downloads,
  localAccounts,
  notes,
  notifications,
  platformSettings,
  profiles,
  recentlyViewed,
  subjects,
  topics,
  userRoles,
  videoProgress,
  videos,
} from './schema.ts';

export type ProfileRecord = typeof profiles.$inferSelect;

function wrapDbError(context: string, error: unknown): never {
  console.error(`Database error (${context}):`, error);
  throw new Error('Unable to complete database operation. Please try again shortly.', {
    cause: error,
  });
}

// ---------- PROFILES & USERS ----------
export async function getOrCreateProfile(params: {
  uid: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  defaultAdmin?: boolean;
}) {
  try {
    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.uid, params.uid))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      const nextRole = params.defaultAdmin ? 'admin' : current.role;
      const [updated] = await db
        .update(profiles)
        .set({
          email: params.email,
          avatarUrl: current.avatarUrl || params.avatarUrl || '',
          role: nextRole,
          updatedAt: new Date(),
        })
        .where(eq(profiles.uid, params.uid))
        .returning();
      return updated;
    }

    const role = params.defaultAdmin ? 'admin' : 'student';
    const [created] = await db
      .insert(profiles)
      .values({
        uid: params.uid,
        email: params.email,
        fullName: params.fullName,
        avatarUrl: params.avatarUrl || '',
        role,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: {
          email: params.email,
          updatedAt: new Date(),
        },
      })
      .returning();

    await db.insert(userRoles).values({
      userId: created.id,
      role: created.role,
      grantedBy: params.defaultAdmin ? 'system-owner' : 'self-signup',
    });

    return created;
  } catch (error) {
    wrapDbError('getOrCreateProfile', error);
  }
}

export async function getProfileByUid(uid: string) {
  try {
    const rows = await db.select().from(profiles).where(eq(profiles.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (error) {
    wrapDbError('getProfileByUid', error);
  }
}

export async function getLocalAccountByLoginId(loginId: string) {
  try {
    const normalized = loginId.trim().toLowerCase();
    const rows = await db
      .select()
      .from(localAccounts)
      .where(eq(localAccounts.loginId, normalized))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    wrapDbError('getLocalAccountByLoginId', error);
  }
}

export async function createLocalAccount(params: {
  uid: string;
  loginId: string;
  passwordHash: string;
  fullName: string;
  email: string;
}) {
  try {
    const normalized = params.loginId.trim().toLowerCase();
    return await db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(profiles)
        .values({
          uid: params.uid,
          email: params.email,
          fullName: params.fullName,
          role: 'student',
          status: 'active',
        })
        .returning();

      await tx.insert(userRoles).values({
        userId: profile.id,
        role: 'student',
        grantedBy: 'password-signup',
      });

      await tx.insert(localAccounts).values({
        loginId: normalized,
        passwordHash: params.passwordHash,
        profileUid: profile.uid,
      });

      return profile;
    });
  } catch (error) {
    wrapDbError('createLocalAccount', error);
  }
}

export async function getClaimedAdminCredential() {
  try {
    const rows = await db.select().from(adminCredentials).limit(1);
    return rows[0] || null;
  } catch (error) {
    wrapDbError('getClaimedAdminCredential', error);
  }
}

export async function claimAdminCredentialAtomic(adminLoginId: string, passwordHash: string) {
  try {
    const normalized = adminLoginId.trim().toLowerCase();
    return await db.transaction(async (tx) => {
      const existing = await tx.select({ value: count() }).from(adminCredentials);
      if (Number(existing[0]?.value || 0) > 0) {
        return null;
      }
      const [created] = await tx
        .insert(adminCredentials)
        .values({
          adminLoginId: normalized,
          passwordHash,
        })
        .returning();
      return created;
    });
  } catch (error) {
    wrapDbError('claimAdminCredentialAtomic', error);
  }
}

export async function upsertAdminCredential(adminLoginId: string, passwordHash: string) {
  try {
    const normalized = adminLoginId.trim().toLowerCase();
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(adminCredentials).limit(1);
      if (existing.length > 0) {
        const [updated] = await tx
          .update(adminCredentials)
          .set({
            adminLoginId: normalized,
            passwordHash,
            claimedAt: new Date(),
          })
          .where(eq(adminCredentials.id, existing[0].id))
          .returning();
        return updated;
      }
      const [created] = await tx
        .insert(adminCredentials)
        .values({
          adminLoginId: normalized,
          passwordHash,
        })
        .returning();
      return created;
    });
  } catch (error) {
    wrapDbError('upsertAdminCredential', error);
  }
}

export async function updateProfile(
  uid: string,
  data: { fullName?: string; phone?: string; gradeTarget?: string; bio?: string }
) {
  try {
    const [updated] = await db
      .update(profiles)
      .set({
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.gradeTarget !== undefined ? { gradeTarget: data.gradeTarget } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.uid, uid))
      .returning();
    return updated;
  } catch (error) {
    wrapDbError('updateProfile', error);
  }
}

export async function listProfiles(search?: string) {
  try {
    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      return await db
        .select()
        .from(profiles)
        .where(
          or(
            ilike(profiles.fullName, pattern),
            ilike(profiles.email, pattern),
            ilike(profiles.gradeTarget, pattern)
          )
        )
        .orderBy(desc(profiles.createdAt));
    }
    return await db.select().from(profiles).orderBy(desc(profiles.createdAt));
  } catch (error) {
    wrapDbError('listProfiles', error);
  }
}

export async function updateProfileAdminFields(
  id: number,
  data: { role?: string; status?: string },
  adminUid: string
) {
  try {
    const [updated] = await db
      .update(profiles)
      .set({
        ...(data.role ? { role: data.role } : {}),
        ...(data.status ? { status: data.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, id))
      .returning();

    if (updated && data.role) {
      await db.insert(userRoles).values({
        userId: updated.id,
        role: data.role,
        grantedBy: adminUid,
      });
    }
    return updated;
  } catch (error) {
    wrapDbError('updateProfileAdminFields', error);
  }
}

// ---------- PLATFORM SETTINGS ----------
export async function getPlatformSettings() {
  try {
    const rows = await db.select().from(platformSettings).limit(1);
    if (rows.length > 0) return rows[0];
    const [inserted] = await db.insert(platformSettings).values({}).returning();
    return inserted;
  } catch (error) {
    wrapDbError('getPlatformSettings', error);
  }
}

export async function updatePlatformSettings(data: {
  platformName?: string;
  tagline?: string;
  ownerName?: string;
  ownerEmail?: string;
  whatsappNumber?: string;
  supportHours?: string;
}) {
  try {
    const existing = await getPlatformSettings();
    const [updated] = await db
      .update(platformSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, existing.id))
      .returning();
    return updated;
  } catch (error) {
    wrapDbError('updatePlatformSettings', error);
  }
}

// ---------- COURSES, SUBJECTS, CHAPTERS, TOPICS ----------
export async function listCourses(includeUnpublished = false) {
  try {
    const rows = includeUnpublished
      ? await db.select().from(courses).orderBy(courses.sortOrder, desc(courses.createdAt))
      : await db
          .select()
          .from(courses)
          .where(eq(courses.isPublished, true))
          .orderBy(courses.sortOrder, desc(courses.createdAt));
    return rows;
  } catch (error) {
    wrapDbError('listCourses', error);
  }
}

export async function createCourse(data: {
  title: string;
  slug: string;
  category: string;
  level: string;
  description: string;
  instructorName: string;
  thumbnailUrl?: string;
  isPublished?: boolean;
}) {
  try {
    const [created] = await db.insert(courses).values(data).returning();
    if (created.isPublished) {
      await db.insert(notifications).values({
        userUid: '',
        title: `New Course Published: ${created.title}`,
        message: `${created.category} — ${created.description.slice(0, 120)}`,
        type: 'course',
        linkUrl: '/courses',
      });
    }
    return created;
  } catch (error) {
    wrapDbError('createCourse', error);
  }
}

export async function updateCourse(
  id: number,
  data: Partial<{
    title: string;
    category: string;
    level: string;
    description: string;
    instructorName: string;
    thumbnailUrl: string;
    isPublished: boolean;
  }>
) {
  try {
    const [updated] = await db
      .update(courses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return updated;
  } catch (error) {
    wrapDbError('updateCourse', error);
  }
}

export async function deleteCourse(id: number) {
  try {
    const [deleted] = await db.delete(courses).where(eq(courses.id, id)).returning();
    return deleted;
  } catch (error) {
    wrapDbError('deleteCourse', error);
  }
}

export async function listSubjects(includeUnpublished = false) {
  try {
    return includeUnpublished
      ? await db.select().from(subjects).orderBy(subjects.sortOrder, subjects.name)
      : await db
          .select()
          .from(subjects)
          .where(eq(subjects.isPublished, true))
          .orderBy(subjects.sortOrder, subjects.name);
  } catch (error) {
    wrapDbError('listSubjects', error);
  }
}

export async function createSubject(data: {
  courseId: number;
  name: string;
  code: string;
  description?: string;
  accentColor?: string;
  isPublished?: boolean;
}) {
  try {
    const [created] = await db.insert(subjects).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError('createSubject', error);
  }
}

export async function deleteSubject(id: number) {
  try {
    const [deleted] = await db.delete(subjects).where(eq(subjects.id, id)).returning();
    return deleted;
  } catch (error) {
    wrapDbError('deleteSubject', error);
  }
}

export async function listChapters(subjectId?: number) {
  try {
    if (subjectId) {
      return await db
        .select()
        .from(chapters)
        .where(eq(chapters.subjectId, subjectId))
        .orderBy(chapters.chapterNumber, chapters.title);
    }
    return await db.select().from(chapters).orderBy(chapters.subjectId, chapters.chapterNumber);
  } catch (error) {
    wrapDbError('listChapters', error);
  }
}

export async function createChapter(data: {
  subjectId: number;
  title: string;
  chapterNumber?: number;
  summary?: string;
  isPublished?: boolean;
}) {
  try {
    const [created] = await db.insert(chapters).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError('createChapter', error);
  }
}

export async function deleteChapter(id: number) {
  try {
    const [deleted] = await db.delete(chapters).where(eq(chapters.id, id)).returning();
    return deleted;
  } catch (error) {
    wrapDbError('deleteChapter', error);
  }
}

export async function listTopics(chapterId?: number) {
  try {
    if (chapterId) {
      return await db
        .select()
        .from(topics)
        .where(eq(topics.chapterId, chapterId))
        .orderBy(topics.topicOrder, topics.title);
    }
    return await db.select().from(topics).orderBy(topics.chapterId, topics.topicOrder);
  } catch (error) {
    wrapDbError('listTopics', error);
  }
}

export async function createTopic(data: {
  chapterId: number;
  title: string;
  topicOrder?: number;
  summary?: string;
}) {
  try {
    const [created] = await db.insert(topics).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError('createTopic', error);
  }
}

export async function deleteTopic(id: number) {
  try {
    const [deleted] = await db.delete(topics).where(eq(topics.id, id)).returning();
    return deleted;
  } catch (error) {
    wrapDbError('deleteTopic', error);
  }
}

// ---------- NOTES & STUDY MATERIALS ----------
export async function listNotes(filters: {
  includeUnpublished?: boolean;
  subjectId?: number;
  courseId?: number;
  chapterId?: number;
  category?: string;
  search?: string;
}) {
  try {
    const conditions = [];
    if (!filters.includeUnpublished) {
      conditions.push(eq(notes.isPublished, true));
    }
    if (filters.subjectId) {
      conditions.push(eq(notes.subjectId, filters.subjectId));
    }
    if (filters.courseId) {
      conditions.push(eq(notes.courseId, filters.courseId));
    }
    if (filters.chapterId) {
      conditions.push(eq(notes.chapterId, filters.chapterId));
    }
    if (filters.category && filters.category !== 'All') {
      conditions.push(eq(notes.category, filters.category));
    }
    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(ilike(notes.title, q), ilike(notes.description, q), ilike(notes.category, q))
      );
    }

    const query = db
      .select()
      .from(notes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(notes.createdAt));

    return await query;
  } catch (error) {
    wrapDbError('listNotes', error);
  }
}

export async function getNoteById(id: number) {
  try {
    const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return rows[0] || null;
  } catch (error) {
    wrapDbError('getNoteById', error);
  }
}

export async function createNote(data: {
  title: string;
  description: string;
  courseId?: number | null;
  subjectId?: number | null;
  chapterId?: number | null;
  topicId?: number | null;
  category: string;
  fileType: string;
  fileUrl?: string;
  fileName: string;
  fileSizeBytes?: number;
  thumbnailUrl?: string;
  contentBody?: string;
  isPublished?: boolean;
  uploadedByUid: string;
}) {
  try {
    const [created] = await db.insert(notes).values(data).returning();
    if (created.isPublished) {
      await db.insert(notifications).values({
        userUid: '',
        title: `New Study Note: ${created.title}`,
        message: `${created.category} added to the ASPD Notes library.`,
        type: 'note',
        linkUrl: `/notes/${created.id}`,
      });
    }
    return created;
  } catch (error) {
    wrapDbError('createNote', error);
  }
}

export async function updateNote(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    courseId: number | null;
    subjectId: number | null;
    chapterId: number | null;
    topicId: number | null;
    category: string;
    fileType: string;
    fileUrl: string;
    fileName: string;
    fileSizeBytes: number;
    thumbnailUrl: string;
    contentBody: string;
    isPublished: boolean;
  }>
) {
  try {
    const [updated] = await db
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return updated;
  } catch (error) {
    wrapDbError('updateNote', error);
  }
}

export async function deleteNote(id: number) {
  try {
    const [deleted] = await db.delete(notes).where(eq(notes.id, id)).returning();
    return deleted;
  } catch (error) {
    wrapDbError('deleteNote', error);
  }
}

export async function recordNoteView(noteId: number, userUid?: string) {
  try {
    await db
      .update(notes)
      .set({ viewsCount: sql`${notes.viewsCount} + 1` })
      .where(eq(notes.id, noteId));

    if (userUid) {
      await db
        .insert(recentlyViewed)
        .values({ userUid, noteId, viewedAt: new Date() })
        .onConflictDoUpdate({
          target: [recentlyViewed.userUid, recentlyViewed.noteId],
          set: { viewedAt: new Date() },
        });
    }
  } catch (error) {
    wrapDbError('recordNoteView', error);
  }
}

export async function recordNoteDownload(noteId: number, userUid?: string) {
  try {
    await db
      .update(notes)
      .set({ downloadsCount: sql`${notes.downloadsCount} + 1` })
      .where(eq(notes.id, noteId));

    if (userUid) {
      await db.insert(downloads).values({ userUid, noteId });
    }
  } catch (error) {
    wrapDbError('recordNoteDownload', error);
  }
}

// ---------- BOOKMARKS, DOWNLOADS & RECENTLY VIEWED ----------
export async function getUserBookmarkedNoteIds(userUid: string) {
  try {
    const rows = await db
      .select({ noteId: bookmarks.noteId })
      .from(bookmarks)
      .where(eq(bookmarks.userUid, userUid));
    return rows.map((r) => r.noteId);
  } catch (error) {
    wrapDbError('getUserBookmarkedNoteIds', error);
  }
}

export async function toggleBookmark(userUid: string, noteId: number) {
  try {
    const existing = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userUid, userUid), eq(bookmarks.noteId, noteId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
      return { bookmarked: false };
    }
    await db.insert(bookmarks).values({ userUid, noteId });
    return { bookmarked: true };
  } catch (error) {
    wrapDbError('toggleBookmark', error);
  }
}

export async function getUserLibrary(userUid: string) {
  try {
    const bookmarkedRows = await db
      .select({ note: notes, createdAt: bookmarks.createdAt })
      .from(bookmarks)
      .innerJoin(notes, eq(bookmarks.noteId, notes.id))
      .where(eq(bookmarks.userUid, userUid))
      .orderBy(desc(bookmarks.createdAt));

    const downloadedRows = await db
      .select({ note: notes, downloadedAt: downloads.downloadedAt })
      .from(downloads)
      .innerJoin(notes, eq(downloads.noteId, notes.id))
      .where(eq(downloads.userUid, userUid))
      .orderBy(desc(downloads.downloadedAt))
      .limit(40);

    const recentRows = await db
      .select({ note: notes, viewedAt: recentlyViewed.viewedAt })
      .from(recentlyViewed)
      .innerJoin(notes, eq(recentlyViewed.noteId, notes.id))
      .where(eq(recentlyViewed.userUid, userUid))
      .orderBy(desc(recentlyViewed.viewedAt))
      .limit(20);

    return {
      bookmarks: bookmarkedRows.map((r) => ({ ...r.note, bookmarkedAt: r.createdAt })),
      downloads: downloadedRows.map((r) => ({ ...r.note, downloadedAt: r.downloadedAt })),
      recentlyViewed: recentRows.map((r) => ({ ...r.note, viewedAt: r.viewedAt })),
    };
  } catch (error) {
    wrapDbError('getUserLibrary', error);
  }
}

// ---------- VIDEOS & CONTINUE WATCHING ----------
export async function listVideos(filters: {
  includeUnpublished?: boolean;
  courseId?: number;
  subjectId?: number;
  search?: string;
}) {
  try {
    const conditions = [];
    if (!filters.includeUnpublished) {
      conditions.push(eq(videos.isPublished, true));
    }
    if (filters.courseId) {
      conditions.push(eq(videos.courseId, filters.courseId));
    }
    if (filters.subjectId) {
      conditions.push(eq(videos.subjectId, filters.subjectId));
    }
    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(or(ilike(videos.title, q), ilike(videos.description, q)));
    }
    return await db
      .select()
      .from(videos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(videos.createdAt));
  } catch (error) {
    wrapDbError('listVideos', error);
  }
}

export async function createVideo(data: {
  title: string;
  description: string;
  courseId?: number | null;
  subjectId?: number | null;
  chapterId?: number | null;
  topicId?: number | null;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  instructorName?: string;
  isPublished?: boolean;
}) {
  try {
    const [created] = await db.insert(videos).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError('createVideo', error);
  }
}

export async function updateVideo(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    courseId: number | null;
    subjectId: number | null;
    videoUrl: string;
    thumbnailUrl: string;
    durationSeconds: number;
    instructorName: string;
    isPublished: boolean;
  }>
) {
  try {
    const [updated] = await db.update(videos).set(data).where(eq(videos.id, id)).returning();
    return updated;
  } catch (error) {
    wrapDbError('updateVideo', error);
  }
}

export async function deleteVideo(id: number) {
  try {
    const [deleted] = await db.delete(videos).where(eq(videos.id, id)).returning();
    return deleted;
  } catch (error) {
    wrapDbError('deleteVideo', error);
  }
}

export async function getUserVideoProgress(userUid: string) {
  try {
    return await db
      .select()
      .from(videoProgress)
      .where(eq(videoProgress.userUid, userUid))
      .orderBy(desc(videoProgress.updatedAt));
  } catch (error) {
    wrapDbError('getUserVideoProgress', error);
  }
}

export async function upsertVideoProgress(
  userUid: string,
  videoId: number,
  watchedSeconds: number,
  completed: boolean
) {
  try {
    const [row] = await db
      .insert(videoProgress)
      .values({ userUid, videoId, watchedSeconds, completed, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [videoProgress.userUid, videoProgress.videoId],
        set: { watchedSeconds, completed, updatedAt: new Date() },
      })
      .returning();

    await db
      .update(videos)
      .set({ viewsCount: sql`${videos.viewsCount} + 1` })
      .where(eq(videos.id, videoId));

    return row;
  } catch (error) {
    wrapDbError('upsertVideoProgress', error);
  }
}

// ---------- ANNOUNCEMENTS & NOTIFICATIONS ----------
export async function listAnnouncements(includeUnpublished = false) {
  try {
    return includeUnpublished
      ? await db
          .select()
          .from(announcements)
          .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
      : await db
          .select()
          .from(announcements)
          .where(eq(announcements.isPublished, true))
          .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
  } catch (error) {
    wrapDbError('listAnnouncements', error);
  }
}

export async function createAnnouncement(data: {
  title: string;
  body: string;
  category: string;
  isPinned?: boolean;
  isPublished?: boolean;
  createdByUid: string;
}) {
  try {
    const [created] = await db.insert(announcements).values(data).returning();
    if (created.isPublished) {
      await db.insert(notifications).values({
        userUid: '',
        title: created.title,
        message: created.body.slice(0, 140),
        type: 'announcement',
        linkUrl: '/announcements',
      });
    }
    return created;
  } catch (error) {
    wrapDbError('createAnnouncement', error);
  }
}

export async function updateAnnouncement(
  id: number,
  data: Partial<{
    title: string;
    body: string;
    category: string;
    isPinned: boolean;
    isPublished: boolean;
  }>
) {
  try {
    const [updated] = await db
      .update(announcements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  } catch (error) {
    wrapDbError('updateAnnouncement', error);
  }
}

export async function deleteAnnouncement(id: number) {
  try {
    const [deleted] = await db
      .delete(announcements)
      .where(eq(announcements.id, id))
      .returning();
    return deleted;
  } catch (error) {
    wrapDbError('deleteAnnouncement', error);
  }
}

export async function listNotifications(userUid?: string) {
  try {
    if (userUid) {
      return await db
        .select()
        .from(notifications)
        .where(or(eq(notifications.userUid, ''), eq(notifications.userUid, userUid)))
        .orderBy(desc(notifications.createdAt))
        .limit(25);
    }
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userUid, ''))
      .orderBy(desc(notifications.createdAt))
      .limit(15);
  } catch (error) {
    wrapDbError('listNotifications', error);
  }
}

// ---------- CONTACT MESSAGES ----------
export async function createContactMessage(data: {
  studentUid?: string;
  studentName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  try {
    const [created] = await db.insert(contactMessages).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError('createContactMessage', error);
  }
}

export async function listContactMessages() {
  try {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  } catch (error) {
    wrapDbError('listContactMessages', error);
  }
}

export async function updateContactMessage(
  id: number,
  data: { status?: string; adminReplyNote?: string }
) {
  try {
    const [updated] = await db
      .update(contactMessages)
      .set({
        ...(data.status ? { status: data.status } : {}),
        ...(data.adminReplyNote !== undefined ? { adminReplyNote: data.adminReplyNote } : {}),
        ...(data.status === 'resolved' ? { resolvedAt: new Date() } : {}),
      })
      .where(eq(contactMessages.id, id))
      .returning();
    return updated;
  } catch (error) {
    wrapDbError('updateContactMessage', error);
  }
}

export async function deleteContactMessage(id: number) {
  try {
    const [deleted] = await db
      .delete(contactMessages)
      .where(eq(contactMessages.id, id))
      .returning();
    return deleted;
  } catch (error) {
    wrapDbError('deleteContactMessage', error);
  }
}

// ---------- ADMIN DASHBOARD METRICS ----------
export async function getAdminStats() {
  try {
    const [
      studentRows,
      courseRows,
      subjectRows,
      noteRows,
      videoRows,
      openMessageRows,
      totalDownloadsRow,
      recentNotes,
      recentMessages,
      recentUsers,
    ] = await Promise.all([
      db.select({ value: count() }).from(profiles),
      db.select({ value: count() }).from(courses),
      db.select({ value: count() }).from(subjects),
      db.select({ value: count() }).from(notes),
      db.select({ value: count() }).from(videos),
      db
        .select({ value: count() })
        .from(contactMessages)
        .where(eq(contactMessages.status, 'open')),
      db.select({ total: sql<number>`coalesce(sum(${notes.downloadsCount}), 0)` }).from(notes),
      db.select().from(notes).orderBy(desc(notes.createdAt)).limit(5),
      db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(5),
      db.select().from(profiles).orderBy(desc(profiles.createdAt)).limit(5),
    ]);

    return {
      totalStudents: Number(studentRows[0]?.value || 0),
      totalCourses: Number(courseRows[0]?.value || 0),
      totalSubjects: Number(subjectRows[0]?.value || 0),
      totalNotes: Number(noteRows[0]?.value || 0),
      totalVideos: Number(videoRows[0]?.value || 0),
      totalDownloads: Number(totalDownloadsRow[0]?.total || 0),
      openContactMessages: Number(openMessageRows[0]?.value || 0),
      recentActivity: {
        notes: recentNotes,
        messages: recentMessages,
        users: recentUsers,
      },
    };
  } catch (error) {
    wrapDbError('getAdminStats', error);
  }
}
