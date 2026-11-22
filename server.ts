import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  claimAdminCredentialAtomic,
  createAnnouncement,
  createChapter,
  createContactMessage,
  createCourse,
  createLocalAccount,
  createNote,
  createSubject,
  createTopic,
  createVideo,
  deleteAnnouncement,
  deleteChapter,
  deleteContactMessage,
  deleteCourse,
  deleteNote,
  deleteSubject,
  deleteTopic,
  deleteVideo,
  getAdminStats,
  getClaimedAdminCredential,
  getLocalAccountByLoginId,
  getNoteById,
  getOrCreateProfile,
  getPlatformSettings,
  getProfileByUid,
  getUserBookmarkedNoteIds,
  getUserLibrary,
  getUserVideoProgress,
  listAnnouncements,
  listChapters,
  listContactMessages,
  listCourses,
  listNotes,
  listNotifications,
  listProfiles,
  listSubjects,
  listTopics,
  listVideos,
  recordNoteDownload,
  recordNoteView,
  toggleBookmark,
  updateAnnouncement,
  updateContactMessage,
  updateCourse,
  updateNote,
  updatePlatformSettings,
  updateProfile,
  updateProfileAdminFields,
  updateVideo,
  upsertAdminCredential,
  upsertVideoProgress,
} from './src/db/queries.ts';
import { buildStudyNotePdf } from './src/lib/pdfGenerator.ts';
import {
  hashPassword,
  safeCompareSecret,
  signSessionToken,
  verifyPassword,
} from './src/lib/sessionToken.ts';
import { AuthRequest, optionalAuth, requireAdmin, requireAuth } from './src/middleware/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'aspd-uploads')
  : path.resolve(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.mp4',
  '.webm',
]);

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'video/mp4',
  'video/webm',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIMES.has(file.mimetype)) {
      return cb(new Error('Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, DOC, DOCX, TXT, MD, MP4, WEBM.'));
    }
    cb(null, true);
  },
});

const PUBLIC_APK_PATH = path.resolve(__dirname, 'public', 'downloads', 'ASPD-Release.apk');
const UPLOADED_APK_PATH = path.resolve(UPLOADS_DIR, 'ASPD-Release.apk');

const apkStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, _file, cb) => cb(null, 'ASPD-Release.apk'),
});

const apkUpload = multer({
  storage: apkStorage,
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.apk') {
      return cb(new Error('Only signed Android .apk files are allowed.'));
    }
    cb(null, true);
  },
});

function resolveAvailableApkPath(): string | null {
  if (fs.existsSync(UPLOADED_APK_PATH)) return UPLOADED_APK_PATH;
  if (fs.existsSync(PUBLIC_APK_PATH)) return PUBLIC_APK_PATH;
  return null;
}

function isSafeMediaUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  if (url.startsWith('/')) return !url.startsWith('//');
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const app = express();
app.use(express.json({ limit: '4mb' }));

// Security headers suitable for AI Studio iframe preview
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Prevent stale browser/proxy caching of dynamic API data
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Real-time Server-Sent Events (SSE) hub so admin updates propagate immediately to all connected clients
const sseClients = new Set<express.Response>();
let platformSyncVersion = 1;

function broadcastPlatformChange(source: string) {
  platformSyncVersion += 1;
  const payload = `event: platform_updated\ndata: ${JSON.stringify({
    version: platformSyncVersion,
    source,
    at: Date.now(),
  })}\n\n`;

  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(
    `event: connected\ndata: ${JSON.stringify({ version: platformSyncVersion, at: Date.now() })}\n\n`
  );
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Serve uploaded files safely with strict path confinement
app.get('/api/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename || '');
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid file request.' });
  }
  const resolved = path.resolve(UPLOADS_DIR, filename);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'File not found.' });
  }
  res.sendFile(resolved);
});

// Android Universal Release APK status & direct download
app.get('/api/app/status', (_req, res) => {
  const apkPath = resolveAvailableApkPath();
  const externalUrl = process.env.APP_DOWNLOAD_URL?.trim() || null;
  if (apkPath) {
    const stats = fs.statSync(apkPath);
    return res.json({
      available: true,
      fileName: 'ASPD-Release.apk',
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString(),
      source: apkPath === UPLOADED_APK_PATH ? 'uploaded' : 'bundled',
    });
  }
  if (externalUrl && isSafeMediaUrl(externalUrl)) {
    return res.json({
      available: true,
      fileName: 'ASPD-Release.apk',
      sizeBytes: 0,
      updatedAt: null,
      source: 'external',
    });
  }
  return res.json({
    available: false,
    fileName: 'ASPD-Release.apk',
    sizeBytes: 0,
    updatedAt: null,
    source: null,
  });
});

app.get('/api/app/download', (_req, res) => {
  const apkPath = resolveAvailableApkPath();
  if (apkPath) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="ASPD-Release.apk"');
    return res.sendFile(apkPath);
  }
  const externalUrl = process.env.APP_DOWNLOAD_URL?.trim();
  if (externalUrl && isSafeMediaUrl(externalUrl)) {
    return res.redirect(302, externalUrl);
  }
  return res.status(404).json({
    error: 'The Android Release APK is being prepared. Please check back shortly or upload ASPD-Release.apk in Admin Settings.',
  });
});

// ---------- ID + PASSWORD AUTHENTICATION & FIRST-RUN ADMIN CLAIM ----------
const DEFAULT_ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || 'mihirbharwada5612@gmail.com'
).toLowerCase();

app.get('/api/auth/admin-status', async (_req, res) => {
  try {
    const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
    const claimed = envConfigured ? true : Boolean(await getClaimedAdminCredential());
    res.json({ envConfigured, claimed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to check admin status.' });
  }
});

const adminClaimSchema = z.object({
  loginId: z.string().trim().min(3).max(120),
  password: z.string().min(6).max(128),
});

app.post('/api/auth/admin-claim', async (req, res) => {
  const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
  if (envConfigured) {
    return res
      .status(409)
      .json({ error: 'Administrator passcode is already configured on the server.' });
  }

  const parsed = adminClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Please provide an Admin ID (3+ chars) and password (6+ chars).' });
  }

  try {
    const passwordHash = hashPassword(parsed.data.password);
    const created = await claimAdminCredentialAtomic(parsed.data.loginId, passwordHash);
    if (!created) {
      return res
        .status(409)
        .json({ error: 'Admin access has already been claimed. Please sign in with your ID and password.' });
    }

    const email = created.adminLoginId.includes('@')
      ? created.adminLoginId
      : DEFAULT_ADMIN_EMAIL;
    const profile = await getOrCreateProfile({
      uid: 'admin-local',
      email,
      fullName: 'ASPD Administrator',
      defaultAdmin: true,
    });

    const token = signSessionToken(profile.uid, profile.email);
    res.status(201).json({ token, profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to claim admin access.' });
  }
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  loginId: z.string().trim().min(3).max(120),
  password: z.string().min(6).max(128),
});

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Please enter your name, a login ID/email (3+ chars), and a password (6+ chars).',
    });
  }

  try {
    const existing = await getLocalAccountByLoginId(parsed.data.loginId);
    if (existing) {
      return res.status(409).json({ error: 'An account with that ID or email already exists.' });
    }

    const uid = `local_${crypto.randomUUID()}`;
    const email = parsed.data.loginId.includes('@')
      ? parsed.data.loginId.toLowerCase()
      : `${parsed.data.loginId.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@students.aspd.local`;

    const profile = await createLocalAccount({
      uid,
      loginId: parsed.data.loginId,
      passwordHash: hashPassword(parsed.data.password),
      fullName: parsed.data.fullName,
      email,
    });

    const token = signSessionToken(profile.uid, profile.email);
    res.status(201).json({ token, profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to register account.' });
  }
});

const loginSchema = z.object({
  loginId: z.string().trim().min(2).max(120),
  password: z.string().min(1).max(128),
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please enter your ID and password.' });
  }

  const normalizedId = parsed.data.loginId.toLowerCase();
  const submittedPassword = parsed.data.password;

  try {
    // 1. Server-configured ADMIN_PASSCODE always overrides any claimed fallback hash
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      const configuredAdminId = (process.env.ADMIN_ID || '').trim().toLowerCase();
      const allowedIds = new Set(
        [configuredAdminId, 'admin', DEFAULT_ADMIN_EMAIL].filter(Boolean)
      );
      if (allowedIds.has(normalizedId) && safeCompareSecret(submittedPassword, envPasscode)) {
        const email = normalizedId.includes('@') ? normalizedId : DEFAULT_ADMIN_EMAIL;
        const profile = await getOrCreateProfile({
          uid: 'admin-env',
          email,
          fullName: 'ASPD Administrator',
          defaultAdmin: true,
        });
        const token = signSessionToken(profile.uid, profile.email);
        return res.json({ token, profile });
      }
    } else {
      // 2. Check claimed admin credential persisted in PostgreSQL
      const claimed = await getClaimedAdminCredential();
      const allowedClaimedIds = claimed
        ? new Set([claimed.adminLoginId.toLowerCase(), DEFAULT_ADMIN_EMAIL].filter(Boolean))
        : new Set<string>();
      if (
        claimed &&
        allowedClaimedIds.has(normalizedId) &&
        verifyPassword(submittedPassword, claimed.passwordHash)
      ) {
        const email = claimed.adminLoginId.includes('@')
          ? claimed.adminLoginId
          : DEFAULT_ADMIN_EMAIL;
        const profile = await getOrCreateProfile({
          uid: 'admin-local',
          email,
          fullName: 'ASPD Administrator',
          defaultAdmin: true,
        });
        const token = signSessionToken(profile.uid, profile.email);
        return res.json({ token, profile });
      }
    }

    // 3. Check standard student / promoted local accounts
    const account = await getLocalAccountByLoginId(normalizedId);
    if (!account || !verifyPassword(submittedPassword, account.passwordHash)) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }

    const profile = await getProfileByUid(account.profileUid);
    if (!profile) {
      return res.status(401).json({ error: 'Account profile not found.' });
    }
    if (profile.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended by an administrator. Please contact support.',
      });
    }

    const token = signSessionToken(profile.uid, profile.email);
    res.json({ token, profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to sign in.' });
  }
});

// ---------- PUBLIC & AUTHENTICATED BOOTSTRAP ----------
app.get('/api/bootstrap', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const [
      settings,
      courseList,
      subjectList,
      chapterList,
      topicList,
      noteList,
      videoList,
      announcementList,
      notificationList,
    ] = await Promise.all([
      getPlatformSettings(),
      listCourses(false),
      listSubjects(false),
      listChapters(),
      listTopics(),
      listNotes({ includeUnpublished: false }),
      listVideos({ includeUnpublished: false }),
      listAnnouncements(false),
      listNotifications(req.user?.uid),
    ]);

    let bookmarkedNoteIds: number[] = [];
    let progressList: Awaited<ReturnType<typeof getUserVideoProgress>> = [];
    if (req.user?.uid) {
      [bookmarkedNoteIds, progressList] = await Promise.all([
        getUserBookmarkedNoteIds(req.user.uid),
        getUserVideoProgress(req.user.uid),
      ]);
    }

    res.json({
      settings,
      profile: req.profile || null,
      courses: courseList,
      subjects: subjectList,
      chapters: chapterList,
      topics: topicList,
      notes: noteList,
      videos: videoList,
      announcements: announcementList,
      notifications: notificationList,
      bookmarkedNoteIds,
      videoProgress: progressList,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load platform data.' });
  }
});

// ---------- PROFILE & STUDENT LIBRARY ----------
app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [library, videoProg, notifs] = await Promise.all([
      getUserLibrary(req.user!.uid),
      getUserVideoProgress(req.user!.uid),
      listNotifications(req.user!.uid),
    ]);
    res.json({
      profile: req.profile,
      library,
      videoProgress: videoProg,
      notifications: notifs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch profile.' });
  }
});

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  gradeTarget: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(500).optional(),
});

app.patch('/api/me', requireAuth, async (req: AuthRequest, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid profile fields provided.' });
  }
  try {
    const updated = await updateProfile(req.user!.uid, parsed.data);
    res.json({ profile: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});

// ---------- NOTES VIEWING, PDF STREAMING, DOWNLOADS & BOOKMARKS ----------
app.get('/api/notes', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const list = await listNotes({
      includeUnpublished: false,
      subjectId: parsePositiveInt(req.query.subjectId as string) || undefined,
      courseId: parsePositiveInt(req.query.courseId as string) || undefined,
      chapterId: parsePositiveInt(req.query.chapterId as string) || undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.json({ notes: list });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load notes.' });
  }
});

app.get('/api/notes/:id', optionalAuth, async (req: AuthRequest, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid note ID.' });

  try {
    const note = await getNoteById(id);
    if (!note || (!note.isPublished && req.profile?.role !== 'admin')) {
      return res.status(404).json({ error: 'Study note not found.' });
    }
    await recordNoteView(id, req.user?.uid);
    res.json({ note });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch note.' });
  }
});

app.get('/api/notes/:id/file', optionalAuth, async (req: AuthRequest, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid note ID.' });

  try {
    const note = await getNoteById(id);
    if (!note || (!note.isPublished && req.profile?.role !== 'admin')) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const isDownload = req.query.download === '1';
    if (isDownload) {
      await recordNoteDownload(id, req.user?.uid);
    }

    // If an uploaded file exists on disk inside UPLOADS_DIR, stream it directly
    if (note.fileUrl && note.fileUrl.startsWith('/api/uploads/')) {
      const filename = path.basename(note.fileUrl);
      const resolved = path.resolve(UPLOADS_DIR, filename);
      if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
        const disposition = isDownload ? 'attachment' : 'inline';
        const safeName = note.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
        return res.sendFile(resolved);
      }
    }

    // Otherwise build a clean, real PDF document dynamically from note content
    const [settings, subjectList, courseList, chapterList] = await Promise.all([
      getPlatformSettings(),
      listSubjects(true),
      listCourses(true),
      listChapters(),
    ]);

    const subjectName = subjectList.find((s) => s.id === note.subjectId)?.name;
    const courseTitle = courseList.find((c) => c.id === note.courseId)?.title;
    const chapterTitle = chapterList.find((ch) => ch.id === note.chapterId)?.title;

    const pdfBuffer = buildStudyNotePdf({
      title: note.title,
      subjectName,
      courseTitle,
      chapterTitle,
      category: note.category,
      description: note.description,
      contentBody: note.contentBody,
      platformName: settings.platformName,
    });

    const brandPrefix = (settings.platformName || 'ASPD').replace(/[^a-zA-Z0-9]+/g, '_');
    const safeFileName = (note.fileName || `${brandPrefix}_Note_${note.id}.pdf`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.[^.]+$/, '') + '.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${safeFileName}"`
    );
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to serve study material.' });
  }
});

app.post('/api/notes/:id/bookmark', requireAuth, async (req: AuthRequest, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid note ID.' });

  try {
    const result = await toggleBookmark(req.user!.uid, id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update bookmark.' });
  }
});

// ---------- VIDEO PROGRESS ----------
const progressSchema = z.object({
  watchedSeconds: z.number().int().min(0).max(86400),
  completed: z.boolean().default(false),
});

app.post('/api/videos/:id/progress', requireAuth, async (req: AuthRequest, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid video ID.' });

  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid progress payload.' });
  }

  try {
    const row = await upsertVideoProgress(
      req.user!.uid,
      id,
      parsed.data.watchedSeconds,
      parsed.data.completed
    );
    res.json({ progress: row });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save video progress.' });
  }
});

// ---------- CONTACT OWNER ----------
const contactSchema = z.object({
  studentName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(30).optional().default(''),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(4000),
});

app.post('/api/contact', optionalAuth, async (req: AuthRequest, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Please complete all required fields with a valid email and detailed message.' });
  }
  try {
    const saved = await createContactMessage({
      ...parsed.data,
      studentUid: req.user?.uid || '',
    });
    broadcastPlatformChange('/contact');
    res.status(201).json({ message: saved });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit contact message.' });
  }
});

// =========================================================================
// PROTECTED ADMIN API ROUTES (/api/admin/*)
// =========================================================================
app.use('/api/admin', requireAuth, requireAdmin, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        broadcastPlatformChange(req.path);
      }
    });
  }
  next();
});

app.get('/api/admin/overview', async (_req, res) => {
  try {
    const [
      stats,
      allCourses,
      allSubjects,
      allChapters,
      allTopics,
      allNotes,
      allVideos,
      allAnnouncements,
      allMessages,
      allStudents,
      settings,
      claimedAdmin,
    ] = await Promise.all([
      getAdminStats(),
      listCourses(true),
      listSubjects(true),
      listChapters(),
      listTopics(),
      listNotes({ includeUnpublished: true }),
      listVideos({ includeUnpublished: true }),
      listAnnouncements(true),
      listContactMessages(),
      listProfiles(),
      getPlatformSettings(),
      getClaimedAdminCredential(),
    ]);

    const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());

    res.json({
      stats,
      courses: allCourses,
      subjects: allSubjects,
      chapters: allChapters,
      topics: allTopics,
      notes: allNotes,
      videos: allVideos,
      announcements: allAnnouncements,
      messages: allMessages,
      students: allStudents,
      settings,
      adminAuth: {
        envConfigured,
        adminLoginId: envConfigured
          ? (process.env.ADMIN_ID || 'admin').trim()
          : claimedAdmin?.adminLoginId || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load admin overview.' });
  }
});

app.put('/api/admin/credentials', async (req, res) => {
  const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
  if (envConfigured) {
    return res.status(409).json({
      error:
        'ADMIN_PASSCODE is currently configured in Settings -> Secrets and overrides database credentials.',
    });
  }

  const parsed = adminClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Please provide an Admin ID (3+ chars) and password (6+ chars).' });
  }

  try {
    const passwordHash = hashPassword(parsed.data.password);
    const saved = await upsertAdminCredential(parsed.data.loginId, passwordHash);
    res.json({ ok: true, adminLoginId: saved.adminLoginId });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to update admin credentials.' });
  }
});

app.post('/api/admin/upload', (req, res) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    let fileType = 'document';
    if (ext === '.pdf') fileType = 'pdf';
    else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) fileType = 'image';
    else if (['.mp4', '.webm'].includes(ext)) fileType = 'video';

    res.status(201).json({
      fileUrl: `/api/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSizeBytes: req.file.size,
      fileType,
    });
  });
});

app.post('/api/admin/upload-apk', (req, res) => {
  apkUpload.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'APK upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a signed .apk file to upload.' });
    }
    res.status(201).json({
      ok: true,
      fileName: 'ASPD-Release.apk',
      sizeBytes: req.file.size,
      downloadUrl: '/api/app/download',
    });
  });
});

// Admin Courses CRUD
const courseSchema = z.object({
  title: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  level: z.string().trim().min(2).max(80).default('Intermediate'),
  description: z.string().trim().min(10).max(2000),
  instructorName: z.string().trim().min(2).max(120).default('ASPD Faculty'),
  thumbnailUrl: z.string().trim().max(500).optional().default(''),
  isPublished: z.boolean().optional().default(true),
});

app.post('/api/admin/courses', async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success || !isSafeMediaUrl(parsed.data.thumbnailUrl)) {
    return res.status(400).json({ error: 'Invalid course fields or thumbnail URL.' });
  }
  try {
    const slugBase = parsed.data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
    const created = await createCourse({ ...parsed.data, slug });
    res.status(201).json({ course: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create course.' });
  }
});

app.patch('/api/admin/courses/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid course ID.' });
  const parsed = courseSchema.partial().safeParse(req.body);
  if (!parsed.success || !isSafeMediaUrl(parsed.data.thumbnailUrl)) {
    return res.status(400).json({ error: 'Invalid course update payload.' });
  }
  try {
    const updated = await updateCourse(id, parsed.data);
    res.json({ course: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update course.' });
  }
});

app.delete('/api/admin/courses/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid course ID.' });
  try {
    await deleteCourse(id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete course.' });
  }
});

// Admin Subjects CRUD
const subjectSchema = z.object({
  courseId: z.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(32),
  description: z.string().trim().max(1000).optional().default(''),
  accentColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#1D4ED8'),
  isPublished: z.boolean().optional().default(true),
});

app.post('/api/admin/subjects', async (req, res) => {
  const parsed = subjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid subject payload.' });
  try {
    const created = await createSubject(parsed.data);
    res.status(201).json({ subject: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create subject.' });
  }
});

app.delete('/api/admin/subjects/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid subject ID.' });
  try {
    await deleteSubject(id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete subject.' });
  }
});

// Admin Chapters & Topics CRUD
const chapterSchema = z.object({
  subjectId: z.number().int().positive(),
  title: z.string().trim().min(2).max(180),
  chapterNumber: z.number().int().min(1).max(200).optional().default(1),
  summary: z.string().trim().max(1000).optional().default(''),
});

app.post('/api/admin/chapters', async (req, res) => {
  const parsed = chapterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid chapter payload.' });
  try {
    const created = await createChapter(parsed.data);
    res.status(201).json({ chapter: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create chapter.' });
  }
});

app.delete('/api/admin/chapters/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid chapter ID.' });
  try {
    await deleteChapter(id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete chapter.' });
  }
});

const topicSchema = z.object({
  chapterId: z.number().int().positive(),
  title: z.string().trim().min(2).max(180),
  topicOrder: z.number().int().min(1).max(200).optional().default(1),
  summary: z.string().trim().max(1000).optional().default(''),
});

app.post('/api/admin/topics', async (req, res) => {
  const parsed = topicSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid topic payload.' });
  try {
    const created = await createTopic(parsed.data);
    res.status(201).json({ topic: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create topic.' });
  }
});

app.delete('/api/admin/topics/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid topic ID.' });
  try {
    await deleteTopic(id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete topic.' });
  }
});

// Admin Notes CRUD
const noteSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().default(''),
  courseId: z.number().int().positive().nullable().optional(),
  subjectId: z.number().int().positive().nullable().optional(),
  chapterId: z.number().int().positive().nullable().optional(),
  topicId: z.number().int().positive().nullable().optional(),
  category: z.string().trim().min(2).max(80).default('Lecture Notes'),
  fileType: z.enum(['pdf', 'image', 'document']).default('pdf'),
  fileUrl: z.string().trim().max(500).optional().default(''),
  fileName: z.string().trim().min(1).max(200).default('ASPD_Study_Note.pdf'),
  fileSizeBytes: z.number().int().min(0).optional().default(0),
  thumbnailUrl: z.string().trim().max(500).optional().default(''),
  contentBody: z.string().max(40000).optional().default(''),
  isPublished: z.boolean().optional().default(true),
});

app.post('/api/admin/notes', async (req: AuthRequest, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (
    !parsed.success ||
    !isSafeMediaUrl(parsed.data.fileUrl) ||
    !isSafeMediaUrl(parsed.data.thumbnailUrl)
  ) {
    return res.status(400).json({ error: 'Invalid note fields or media URLs.' });
  }
  try {
    const created = await createNote({
      ...parsed.data,
      uploadedByUid: req.user!.uid,
    });
    res.status(201).json({ note: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create study note.' });
  }
});

app.patch('/api/admin/notes/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid note ID.' });
  const parsed = noteSchema.partial().safeParse(req.body);
  if (
    !parsed.success ||
    !isSafeMediaUrl(parsed.data.fileUrl) ||
    !isSafeMediaUrl(parsed.data.thumbnailUrl)
  ) {
    return res.status(400).json({ error: 'Invalid note update payload.' });
  }
  try {
    const updated = await updateNote(id, parsed.data);
    res.json({ note: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update note.' });
  }
});

app.delete('/api/admin/notes/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid note ID.' });
  try {
    await deleteNote(id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete note.' });
  }
});

// Admin Videos CRUD
const videoSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().default(''),
  courseId: z.number().int().positive().nullable().optional(),
  subjectId: z.number().int().positive().nullable().optional(),
  chapterId: z.number().int().positive().nullable().optional(),
  topicId: z.number().int().positive().nullable().optional(),
  videoUrl: z.string().trim().min(3).max(500),
  thumbnailUrl: z.string().trim().max(500).optional().default(''),
  durationSeconds: z.number().int().min(30).max(36000).optional().default(1800),
  instructorName: z.string().trim().min(2).max(120).optional().default('ASPD Faculty'),
  isPublished: z.boolean().optional().default(true),
});

app.post('/api/admin/videos', async (req, res) => {
  const parsed = videoSchema.safeParse(req.body);
  if (
    !parsed.success ||
    !isSafeMediaUrl(parsed.data.videoUrl) ||
    !isSafeMediaUrl(parsed.data.thumbnailUrl)
  ) {
    return res.status(400).json({ error: 'Invalid video fields or URL.' });
  }
  try {
    const created = await createVideo(parsed.data);
    res.status(201).json({ video: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add video lecture.' });
  }
});

app.patch('/api/admin/videos/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid video ID.' });
  const parsed = videoSchema.partial().safeParse(req.body);
  if (
    !parsed.success ||
    !isSafeMediaUrl(parsed.data.videoUrl) ||
    !isSafeMediaUrl(parsed.data.thumbnailUrl)
  ) {
    return res.status(400).json({ error: 'Invalid video update payload.' });
  }
  try {
    const updated = await updateVideo(id, parsed.data);
    res.json({ video: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update video lecture.' });
  }
});

app.delete('/api/admin/videos/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid video ID.' });
  try {
    await deleteVideo(id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete video lecture.' });
  }
});

// Admin Announcements CRUD
const announcementSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(5).max(4000),
  category: z.enum(['general', 'new_notes', 'new_course', 'exam_alert']).default('general'),
  isPinned: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(true),
});

app.post('/api/admin/announcements', async (req: AuthRequest, res) => {
  const parsed = announcementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid announcement payload.' });
  try {
    const created = await createAnnouncement({
      ...parsed.data,
      createdByUid: req.user!.uid,
    });
    res.status(201).json({ announcement: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create announcement.' });
  }
});

app.patch('/api/admin/announcements/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid announcement ID.' });
  const parsed = announcementSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid announcement update.' });
  try {
    const updated = await updateAnnouncement(id, parsed.data);
    res.json({ announcement: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update announcement.' });
  }
});

app.delete('/api/admin/announcements/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid announcement ID.' });
  try {
    await deleteAnnouncement(id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete announcement.' });
  }
});

// Admin Student & Role Management
const studentPatchSchema = z.object({
  role: z.enum(['student', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

app.patch('/api/admin/students/:id', async (req: AuthRequest, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid student ID.' });
  const parsed = studentPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid role or status.' });
  try {
    const updated = await updateProfileAdminFields(id, parsed.data, req.user!.uid);
    res.json({ student: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update student.' });
  }
});

// Admin Contact Messages Management
const contactPatchSchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  adminReplyNote: z.string().trim().max(2000).optional(),
});

app.patch('/api/admin/messages/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid message ID.' });
  const parsed = contactPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid message update.' });
  try {
    const updated = await updateContactMessage(id, parsed.data);
    res.json({ message: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update message.' });
  }
});

app.delete('/api/admin/messages/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid message ID.' });
  try {
    await deleteContactMessage(id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete message.' });
  }
});

// Admin Platform Settings
const settingsSchema = z.object({
  platformName: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().min(5).max(300).optional(),
  ownerName: z.string().trim().min(2).max(120).optional(),
  ownerEmail: z.string().trim().email().max(180).optional(),
  whatsappNumber: z.string().trim().min(7).max(30).optional(),
  supportHours: z.string().trim().min(3).max(140).optional(),
});

app.patch('/api/admin/settings', async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid platform settings.' });
  try {
    const updated = await updatePlatformSettings(parsed.data);
    res.json({ settings: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update platform settings.' });
  }
});

// ---------- VITE / STATIC SPA SERVING ----------
async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASPD server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start ASPD server:', err);
    process.exit(1);
  });
}
