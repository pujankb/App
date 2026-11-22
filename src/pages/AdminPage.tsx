import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { BRAND_LOGO_URL } from '../components/Layout';
import {
  AdminOverviewData,
  formatBytes,
  formatDateShort,
  formatDuration,
  NoteItem,
} from '../types';

type AdminSection =
  | 'overview'
  | 'notes'
  | 'videos'
  | 'curriculum'
  | 'announcements'
  | 'students'
  | 'messages'
  | 'settings';

export const AdminPage: React.FC = () => {
  const {
    isAuthenticated,
    profile,
    settings,
    authLoading,
    signInWithGoogle,
    signInWithCredentials,
    claimAdminAccess,
    signOut,
    apiFetch,
    refreshData,
    syncVersion,
  } = usePlatform();

  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Admin ID+Password & First-run claim state
  const [adminStatus, setAdminStatus] = useState<{ claimed: boolean; envConfigured: boolean } | null>(null);
  const [adminLoginId, setAdminLoginId] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Note creation / editing state
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    description: '',
    courseId: '',
    subjectId: '',
    chapterId: '',
    topicId: '',
    category: 'Lecture Notes',
    fileType: 'pdf' as 'pdf' | 'image' | 'document',
    fileUrl: '',
    fileName: 'ASPD_Study_Note.pdf',
    fileSizeBytes: 0,
    thumbnailUrl: '',
    contentBody: '',
    isPublished: true,
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  // Video form state
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    courseId: '',
    subjectId: '',
    chapterId: '',
    videoUrl: '',
    thumbnailUrl: '',
    durationMinutes: '30',
    instructorName: 'ASPD Faculty',
    isPublished: true,
  });

  // Curriculum forms
  const [courseForm, setCourseForm] = useState({
    title: '',
    category: 'JEE Main & Adv',
    level: 'Class 12',
    description: '',
    instructorName: 'ASPD Senior Faculty',
    thumbnailUrl: '/src/assets/images/course_physics_optics_1795284689844.jpg',
  });
  const [subjectForm, setSubjectForm] = useState({
    courseId: '',
    name: '',
    code: '',
    description: '',
  });
  const [chapterForm, setChapterForm] = useState({
    subjectId: '',
    title: '',
    chapterNumber: '1',
    summary: '',
  });
  const [topicForm, setTopicForm] = useState({
    chapterId: '',
    title: '',
    topicOrder: '1',
    summary: '',
  });

  // Announcement form
  const [annForm, setAnnForm] = useState({
    title: '',
    body: '',
    category: 'general' as 'general' | 'new_notes' | 'new_course' | 'exam_alert',
    isPinned: false,
    isPublished: true,
  });

  // Student search & message filter
  const [studentQuery, setStudentQuery] = useState('');
  const [messageFilter, setMessageFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Platform settings form
  const [settingsForm, setSettingsForm] = useState({
    platformName: 'ASPD',
    tagline: '',
    ownerName: '',
    ownerEmail: '',
    whatsappNumber: '',
    supportHours: '',
  });

  // Admin ID & Password update form (inside Settings tab)
  const [credForm, setCredForm] = useState({
    loginId: 'admin',
    password: '',
    confirmPassword: '',
  });
  const [savingCreds, setSavingCreds] = useState(false);
  const [apkStatus, setApkStatus] = useState<{ available: boolean; sizeBytes: number; updatedAt: string | null } | null>(null);
  const [uploadingApk, setUploadingApk] = useState(false);

  const showNotice = (kind: 'ok' | 'err', text: string) => {
    setBanner({ kind, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const loadAdminData = useCallback(
    async (silent = false) => {
      if (!isAuthenticated || profile?.role !== 'admin') return;
      if (!silent) setLoading(true);
      try {
        const res = await apiFetch<AdminOverviewData>('/api/admin/overview', { cache: 'no-store' });
        setData(res);
        if (!silent) {
          setSettingsForm({
            platformName: res.settings.platformName,
            tagline: res.settings.tagline,
            ownerName: res.settings.ownerName,
            ownerEmail: res.settings.ownerEmail,
            whatsappNumber: res.settings.whatsappNumber,
            supportHours: res.settings.supportHours,
          });
        }
        if (res.adminAuth?.adminLoginId) {
          setCredForm((prev) => ({ ...prev, loginId: res.adminAuth?.adminLoginId || prev.loginId }));
        }
        fetch('/api/app/status', { cache: 'no-store' })
          .then((r) => r.json())
          .then((s) =>
            setApkStatus({
              available: Boolean(s.available),
              sizeBytes: Number(s.sizeBytes || 0),
              updatedAt: s.updatedAt || null,
            })
          )
          .catch(() => {});
      } catch (err: any) {
        if (!silent) showNotice('err', err.message || 'Failed to load admin console.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isAuthenticated, profile?.role, apiFetch]
  );

  const notifyOtherTabs = useCallback(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('aspd_platform_sync');
      ch.postMessage({ at: Date.now() });
      ch.close();
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (syncVersion > 0 && isAuthenticated && profile?.role === 'admin') {
      loadAdminData(true);
    }
  }, [syncVersion, isAuthenticated, profile?.role, loadAdminData]);

  useEffect(() => {
    if (isAuthenticated && profile?.role === 'admin') return;
    fetch('/api/auth/admin-status')
      .then((r) => r.json())
      .then((s) => setAdminStatus({ claimed: Boolean(s.claimed), envConfigured: Boolean(s.envConfigured) }))
      .catch(() => setAdminStatus({ claimed: true, envConfigured: false }));
  }, [isAuthenticated, profile?.role]);

  const handleAdminCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const isClaimFlow = adminStatus && !adminStatus.claimed && !adminStatus.envConfigured;
      if (isClaimFlow) {
        if (adminPassword !== adminConfirmPassword) {
          setAuthError('Passwords do not match.');
          setAuthSubmitting(false);
          return;
        }
        await claimAdminAccess(adminLoginId, adminPassword);
        setAdminStatus({ claimed: true, envConfigured: false });
      } else {
        const loggedIn = await signInWithCredentials(adminLoginId, adminPassword);
        if (loggedIn.role !== 'admin') {
          setAuthError('This account does not have administrator privileges.');
        }
      }
      setAdminPassword('');
      setAdminConfirmPassword('');
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to authenticate.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // ---------- AUTH / RBAC GATES ----------
  if (authLoading || ((!isAuthenticated || (profile && profile.role !== 'admin')) && adminStatus === null)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-sm text-slate-500">
        Verifying administrator session...
      </div>
    );
  }

  if (!isAuthenticated || (profile && profile.role !== 'admin')) {
    const needsFirstRunClaim = adminStatus !== null && !adminStatus.claimed && !adminStatus.envConfigured;
    const isSignedInAsStudent = Boolean(isAuthenticated && profile && profile.role !== 'admin');

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 space-y-5">
          <div className="text-center space-y-2">
            <img
              src={BRAND_LOGO_URL}
              alt={`${settings.platformName} Logo`}
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-lg object-cover border border-slate-200 mx-auto"
            />
            <h1 className="font-display text-2xl font-bold text-[#0F172A]">
              {needsFirstRunClaim
                ? `Set Up ${settings.platformName} Admin Login`
                : `${settings.platformName} Admin Login`}
            </h1>
            <p className="text-sm text-slate-600">
              {needsFirstRunClaim
                ? 'First-time setup: save your Admin ID and password once. After this, you can sign in normally on /login or /admin.'
                : 'Sign in normally with your Admin ID and password, or continue with an authorized Google administrator account.'}
            </p>
          </div>

          {isSignedInAsStudent && profile && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Currently signed in as student <span className="font-semibold">{profile.email}</span>. Enter your Admin ID and password below to switch directly to the Admin Panel.
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Link to="/dashboard" className="font-semibold text-[#1D4ED8] hover:underline">
                  Student Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="font-semibold text-amber-900 hover:underline cursor-pointer"
                >
                  Sign Out Student
                </button>
              </div>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminCredentialSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="admin-login-id" className="block text-xs font-semibold text-slate-700 mb-1">
                Admin ID
              </label>
              <input
                id="admin-login-id"
                type="text"
                required
                minLength={3}
                autoComplete="username"
                value={adminLoginId}
                onChange={(e) => setAdminLoginId(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label htmlFor="admin-login-pw" className="block text-xs font-semibold text-slate-700 mb-1">
                {needsFirstRunClaim ? 'Create Admin Password' : 'Password'}
              </label>
              <input
                id="admin-login-pw"
                type="password"
                required
                minLength={needsFirstRunClaim ? 6 : 1}
                autoComplete={needsFirstRunClaim ? 'new-password' : 'current-password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            {needsFirstRunClaim && (
              <div>
                <label htmlFor="admin-confirm-pw" className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Admin Password
                </label>
                <input
                  id="admin-confirm-pw"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 rounded-lg cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>
                {authSubmitting
                  ? 'Verifying...'
                  : needsFirstRunClaim
                  ? 'Save Password & Sign In'
                  : 'Sign In to Admin'}
              </span>
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full py-2.5 px-4 text-sm font-semibold text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Sign In with Google
          </button>

          <Link to="/" className="block text-center text-xs font-medium text-slate-500 hover:text-[#0F172A]">
            Return to Student Website
          </Link>
        </div>
      </div>
    );
  }

  // ---------- UPLOAD & CRUD HANDLERS ----------
  const handleFileUpload = async (file: File, target: 'note' | 'thumbnail' | 'video') => {
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch<{
        fileUrl: string;
        fileName: string;
        fileSizeBytes: number;
        fileType: string;
      }>('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });

      if (target === 'note') {
        setNoteForm((prev) => ({
          ...prev,
          fileUrl: res.fileUrl,
          fileName: res.fileName,
          fileSizeBytes: res.fileSizeBytes,
          fileType: (['pdf', 'image', 'document'].includes(res.fileType)
            ? res.fileType
            : 'document') as 'pdf' | 'image' | 'document',
        }));
      } else if (target === 'thumbnail') {
        setNoteForm((prev) => ({ ...prev, thumbnailUrl: res.fileUrl }));
      } else if (target === 'video') {
        setVideoForm((prev) => ({ ...prev, videoUrl: res.fileUrl }));
      }
      showNotice('ok', `Uploaded ${res.fileName} (${formatBytes(res.fileSizeBytes)})`);
    } catch (err: any) {
      showNotice('err', err.message || 'Upload failed.');
    } finally {
      setUploadingFile(false);
    }
  };

  const resetNoteForm = () => {
    setEditingNoteId(null);
    setNoteForm({
      title: '',
      description: '',
      courseId: '',
      subjectId: '',
      chapterId: '',
      topicId: '',
      category: 'Lecture Notes',
      fileType: 'pdf',
      fileUrl: '',
      fileName: 'ASPD_Study_Note.pdf',
      fileSizeBytes: 0,
      thumbnailUrl: '',
      contentBody: '',
      isPublished: true,
    });
  };

  const startEditNote = (n: NoteItem) => {
    setEditingNoteId(n.id);
    setNoteForm({
      title: n.title,
      description: n.description,
      courseId: n.courseId ? String(n.courseId) : '',
      subjectId: n.subjectId ? String(n.subjectId) : '',
      chapterId: n.chapterId ? String(n.chapterId) : '',
      topicId: n.topicId ? String(n.topicId) : '',
      category: n.category,
      fileType: (['pdf', 'image', 'document'].includes(n.fileType)
        ? n.fileType
        : 'pdf') as 'pdf' | 'image' | 'document',
      fileUrl: n.fileUrl || '',
      fileName: n.fileName,
      fileSizeBytes: n.fileSizeBytes || 0,
      thumbnailUrl: n.thumbnailUrl || '',
      contentBody: n.contentBody || '',
      isPublished: n.isPublished,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: noteForm.title,
      description: noteForm.description,
      courseId: noteForm.courseId ? Number(noteForm.courseId) : null,
      subjectId: noteForm.subjectId ? Number(noteForm.subjectId) : null,
      chapterId: noteForm.chapterId ? Number(noteForm.chapterId) : null,
      topicId: noteForm.topicId ? Number(noteForm.topicId) : null,
      category: noteForm.category,
      fileType: noteForm.fileType,
      fileUrl: noteForm.fileUrl,
      fileName: noteForm.fileName || `${noteForm.title.replace(/\s+/g, '_')}.pdf`,
      fileSizeBytes: noteForm.fileSizeBytes,
      thumbnailUrl: noteForm.thumbnailUrl,
      contentBody: noteForm.contentBody,
      isPublished: noteForm.isPublished,
    };

    try {
      if (editingNoteId) {
        await apiFetch(`/api/admin/notes/${editingNoteId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showNotice('ok', 'Study note updated.');
      } else {
        await apiFetch('/api/admin/notes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showNotice('ok', 'Study note published to web and Android feed.');
      }
      resetNoteForm();
      await Promise.all([loadAdminData(), refreshData()]);
    } catch (err: any) {
      showNotice('err', err.message || 'Unable to save note.');
    }
  };

  const handleToggleNotePublish = async (note: NoteItem) => {
    try {
      await apiFetch(`/api/admin/notes/${note.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !note.isPublished }),
      });
      await Promise.all([loadAdminData(), refreshData()]);
      showNotice('ok', note.isPublished ? 'Note unpublished.' : 'Note published.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await apiFetch(`/api/admin/notes/${id}`, { method: 'DELETE' });
      await Promise.all([loadAdminData(), refreshData()]);
      showNotice('ok', 'Note deleted.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/videos', {
        method: 'POST',
        body: JSON.stringify({
          title: videoForm.title,
          description: videoForm.description,
          courseId: videoForm.courseId ? Number(videoForm.courseId) : null,
          subjectId: videoForm.subjectId ? Number(videoForm.subjectId) : null,
          chapterId: videoForm.chapterId ? Number(videoForm.chapterId) : null,
          videoUrl: videoForm.videoUrl,
          thumbnailUrl: videoForm.thumbnailUrl,
          durationSeconds: Math.max(60, Number(videoForm.durationMinutes || 30) * 60),
          instructorName: videoForm.instructorName,
          isPublished: videoForm.isPublished,
        }),
      });
      setVideoForm({
        title: '',
        description: '',
        courseId: '',
        subjectId: '',
        chapterId: '',
        videoUrl: '',
        thumbnailUrl: '',
        durationMinutes: '30',
        instructorName: 'ASPD Faculty',
        isPublished: true,
      });
      await Promise.all([loadAdminData(), refreshData()]);
      showNotice('ok', 'Video lecture added.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify({ ...courseForm, isPublished: true }),
      });
      setCourseForm({
        title: '',
        category: 'JEE Main & Adv',
        level: 'Class 12',
        description: '',
        instructorName: 'ASPD Senior Faculty',
        thumbnailUrl: '/src/assets/images/course_physics_optics_1795284689844.jpg',
      });
      await Promise.all([loadAdminData(), refreshData()]);
      showNotice('ok', 'Course created.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          courseId: Number(subjectForm.courseId),
          name: subjectForm.name,
          code: subjectForm.code,
          description: subjectForm.description,
        }),
      });
      setSubjectForm({ courseId: '', name: '', code: '', description: '' });
      await Promise.all([loadAdminData(), refreshData()]);
      showNotice('ok', 'Subject added.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/chapters', {
        method: 'POST',
        body: JSON.stringify({
          subjectId: Number(chapterForm.subjectId),
          title: chapterForm.title,
          chapterNumber: Number(chapterForm.chapterNumber || 1),
          summary: chapterForm.summary,
        }),
      });
      setChapterForm({ subjectId: '', title: '', chapterNumber: '1', summary: '' });
      await Promise.all([loadAdminData(), refreshData()]);
      showNotice('ok', 'Chapter created.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/topics', {
        method: 'POST',
        body: JSON.stringify({
          chapterId: Number(topicForm.chapterId),
          title: topicForm.title,
          topicOrder: Number(topicForm.topicOrder || 1),
          summary: topicForm.summary,
        }),
      });
      setTopicForm({ chapterId: '', title: '', topicOrder: '1', summary: '' });
      await Promise.all([loadAdminData(), refreshData()]);
      showNotice('ok', 'Topic added.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(annForm),
      });
      setAnnForm({ title: '', body: '', category: 'general', isPinned: false, isPublished: true });
      await Promise.all([loadAdminData(), refreshData()]);
      showNotice('ok', 'Announcement published.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settingsForm),
      });
      await Promise.all([loadAdminData(false), refreshData(true)]);
      notifyOtherTabs();
      showNotice('ok', 'Platform branding and owner contact settings updated across the entire platform.');
    } catch (err: any) {
      showNotice('err', err.message);
    }
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credForm.password !== credForm.confirmPassword) {
      showNotice('err', 'New passwords do not match.');
      return;
    }
    setSavingCreds(true);
    try {
      await apiFetch('/api/admin/credentials', {
        method: 'PUT',
        body: JSON.stringify({
          loginId: credForm.loginId,
          password: credForm.password,
        }),
      });
      setCredForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      await loadAdminData();
      showNotice('ok', 'Admin ID and password updated. You can now sign in normally from /login or /admin.');
    } catch (err: any) {
      showNotice('err', err.message || 'Unable to update admin credentials.');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleApkUpload = async (file: File) => {
    setUploadingApk(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await apiFetch('/api/admin/upload-apk', { method: 'POST', body: fd });
      await Promise.all([loadAdminData(true), refreshData(true)]);
      notifyOtherTabs();
      showNotice('ok', 'Android Release APK uploaded! The "Download Our App" button is now serving your new APK.');
    } catch (err: any) {
      showNotice('err', err.message || 'APK upload failed.');
    } finally {
      setUploadingApk(false);
    }
  };

  const navItems: { id: AdminSection; label: string; icon: React.ComponentType<any>; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'notes', label: 'Notes & Files', icon: FileText, badge: data?.stats.totalNotes },
    { id: 'videos', label: 'Video Lectures', icon: PlayCircle, badge: data?.stats.totalVideos },
    { id: 'curriculum', label: 'Courses & Syllabus', icon: BookOpen },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'students', label: 'Students & Roles', icon: Users, badge: data?.stats.totalStudents },
    {
      id: 'messages',
      label: 'Contact Messages',
      icon: MessageSquare,
      badge: data?.stats.openContactMessages,
    },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];

  const filteredStudents = (data?.students || []).filter((s) => {
    if (!studentQuery.trim()) return true;
    const q = studentQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.gradeTarget || '').toLowerCase().includes(q)
    );
  });

  const filteredMessages = (data?.messages || []).filter((m) => {
    if (messageFilter === 'all') return true;
    return m.status === messageFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={BRAND_LOGO_URL}
              alt={settings.platformName}
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-md object-cover border border-slate-200"
            />
            <span className="font-display font-bold text-base text-[#0F172A] truncate">
              {settings.platformName} Admin
            </span>
          </div>
          <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F172A]'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badge === 'number' && (
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      active ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <p className="text-xs font-medium text-[#0F172A] truncate">{profile?.fullName}</p>
          <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
          <div className="pt-2 flex items-center justify-between gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Student Site</span>
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full border-r border-slate-200 flex flex-col">
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-display font-bold text-base truncate">
                {settings.platformName} Admin
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-[#0F172A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
                      active ? 'bg-[#0F172A] text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && (
                      <span className="text-xs font-mono tabular-nums">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <Link to="/" className="text-xs font-semibold text-[#1D4ED8] hover:underline">
                Return to Student Site
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-1.5 text-slate-600 hover:text-[#0F172A]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-slate-500 truncate">
              Admin /{' '}
              <span className="text-[#0F172A] font-semibold">
                {navItems.find((i) => i.id === section)?.label}
              </span>
            </p>
          </div>
          <Link
            to="/notes"
            className="px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0"
          >
            Preview Live Site
          </Link>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full mx-auto space-y-6">
          {banner && (
            <div
              className={`p-3.5 rounded-lg border text-sm font-medium flex items-center justify-between ${
                banner.kind === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span>{banner.text}</span>
              <button type="button" onClick={() => setBanner(null)} className="text-xs underline">
                Dismiss
              </button>
            </div>
          )}

          {loading && !data ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((k) => (
                <div key={k} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* OVERVIEW SECTION */}
              {section === 'overview' && data && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Registered Students', value: data.stats.totalStudents },
                      { label: 'Courses', value: data.stats.totalCourses },
                      { label: 'Subjects', value: data.stats.totalSubjects },
                      { label: 'Uploaded Notes', value: data.stats.totalNotes },
                      { label: 'Video Lectures', value: data.stats.totalVideos },
                      { label: 'Tracked Downloads', value: data.stats.totalDownloads },
                      { label: 'Open Contact Messages', value: data.stats.openContactMessages },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-5">
                        <p className="text-xs text-slate-500">{stat.label}</p>
                        <p className="mt-1.5 font-display text-2xl font-bold text-[#0F172A] tabular-nums">
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-base font-bold text-[#0F172A]">
                          Recent Study Material Uploads
                        </h2>
                        <button
                          type="button"
                          onClick={() => setSection('notes')}
                          className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                        >
                          Manage Notes
                        </button>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {data.stats.recentActivity.notes.map((n) => (
                          <li key={n.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#0F172A] truncate">{n.title}</p>
                              <p className="text-xs text-slate-500 tabular-nums">
                                {n.category} · {n.downloadsCount} downloads · {formatDateShort(n.createdAt)}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-slate-600 shrink-0">
                              {n.isPublished ? 'Published' : 'Draft'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-base font-bold text-[#0F172A]">
                          Recent Contact Inquiries
                        </h2>
                        <button
                          type="button"
                          onClick={() => setSection('messages')}
                          className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                        >
                          View Inbox
                        </button>
                      </div>
                      {data.stats.recentActivity.messages.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4">No student contact messages received yet.</p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {data.stats.recentActivity.messages.map((m) => (
                            <li key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#0F172A] truncate">{m.subject}</p>
                                <p className="text-xs text-slate-500 truncate">
                                  {m.studentName} · {m.email}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-semibold shrink-0 ${
                                  m.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                {m.status === 'resolved' ? 'Resolved' : 'Open'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* NOTES & STUDY MATERIALS MANAGEMENT */}
              {section === 'notes' && data && (
                <div className="space-y-8">
                  <form
                    onSubmit={handleSaveNote}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-bold text-[#0F172A]">
                        {editingNoteId ? `Edit Study Note #${editingNoteId}` : 'Upload Study Note / PDF / Image'}
                      </h2>
                      {editingNoteId && (
                        <button
                          type="button"
                          onClick={resetNoteForm}
                          className="text-xs font-semibold text-slate-600 hover:underline cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                        <input
                          type="text"
                          required
                          value={noteForm.title}
                          onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                          placeholder="e.g. Ray Optics Formula Handbook"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                        <select
                          value={noteForm.category}
                          onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        >
                          <option value="Lecture Notes">Lecture Notes</option>
                          <option value="Formula Sheet">Formula Sheet</option>
                          <option value="DPP">DPP</option>
                          <option value="Revision Guide">Revision Guide</option>
                          <option value="Diagram">Diagram</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
                        <select
                          value={noteForm.courseId}
                          onChange={(e) => setNoteForm({ ...noteForm, courseId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        >
                          <option value="">None</option>
                          {data.courses.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                        <select
                          value={noteForm.subjectId}
                          onChange={(e) => setNoteForm({ ...noteForm, subjectId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        >
                          <option value="">None</option>
                          {data.subjects.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Chapter</label>
                        <select
                          value={noteForm.chapterId}
                          onChange={(e) => setNoteForm({ ...noteForm, chapterId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        >
                          <option value="">None</option>
                          {data.chapters.map((ch) => (
                            <option key={ch.id} value={String(ch.id)}>
                              Ch {ch.chapterNumber}: {ch.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Topic</label>
                        <select
                          value={noteForm.topicId}
                          onChange={(e) => setNoteForm({ ...noteForm, topicId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        >
                          <option value="">None</option>
                          {data.topics.map((t) => (
                            <option key={t.id} value={String(t.id)}>
                              {t.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Short Description</label>
                      <input
                        type="text"
                        value={noteForm.description}
                        onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                        placeholder="Summarize what this study note covers..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Attach Study File (PDF, Image, DOC, TXT — max 25MB)
                        </label>
                        <label className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">
                          <Upload className="h-4 w-4 text-[#1D4ED8]" />
                          <span>
                            {uploadingFile
                              ? 'Uploading...'
                              : noteForm.fileUrl
                              ? `Attached: ${noteForm.fileName}`
                              : 'Choose PDF / Image / Document'}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.md"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(f, 'note');
                            }}
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Optional Thumbnail Image
                        </label>
                        <label className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">
                          <Upload className="h-4 w-4 text-slate-500" />
                          <span>{noteForm.thumbnailUrl ? 'Thumbnail Uploaded' : 'Upload Thumbnail (PNG/JPG)'}</span>
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(f, 'thumbnail');
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        In-App Readable Study Content (Also auto-generates downloadable PDF if no file uploaded)
                      </label>
                      <textarea
                        rows={5}
                        value={noteForm.contentBody}
                        onChange={(e) => setNoteForm({ ...noteForm, contentBody: e.target.value })}
                        placeholder="Write structured headings, formulas, derivations, and solved examples..."
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noteForm.isPublished}
                          onChange={(e) => setNoteForm({ ...noteForm, isPublished: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                        <span>Publish immediately to students (Website & Android)</span>
                      </label>

                      <button
                        type="submit"
                        disabled={uploadingFile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        <span>{editingNoteId ? 'Update Study Note' : 'Save & Publish Note'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Notes Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-[#0F172A]">
                        All Study Materials ({data.notes.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                            <th className="py-2.5 px-4 font-semibold">Title</th>
                            <th className="py-2.5 px-4 font-semibold">Category</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Downloads</th>
                            <th className="py-2.5 px-4 font-semibold">Status</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {data.notes.map((n) => (
                            <tr key={n.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4">
                                <p className="font-medium text-[#0F172A]">{n.title}</p>
                                <p className="text-xs text-slate-500 font-mono">{n.fileName}</p>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-600">{n.category}</td>
                              <td className="py-3 px-4 text-xs text-slate-700 text-right font-mono tabular-nums">
                                {n.downloadsCount}
                              </td>
                              <td className="py-3 px-4 text-xs font-semibold">
                                <span className={n.isPublished ? 'text-emerald-700' : 'text-amber-700'}>
                                  {n.isPublished ? 'Published' : 'Unpublished'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => startEditNote(n)}
                                    title="Edit"
                                    className="p-1.5 text-slate-600 hover:text-[#1D4ED8] cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleNotePublish(n)}
                                    title={n.isPublished ? 'Unpublish' : 'Publish'}
                                    className="p-1.5 text-slate-600 hover:text-[#0F172A] cursor-pointer"
                                  >
                                    {n.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(n.id)}
                                    title="Delete"
                                    className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIDEO LECTURES MANAGEMENT */}
              {section === 'videos' && data && (
                <div className="space-y-8">
                  <form
                    onSubmit={handleCreateVideo}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">
                      Add Video Lecture (YouTube Link or Uploaded MP4/WebM)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Title *</label>
                        <input
                          type="text"
                          required
                          value={videoForm.title}
                          onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                          placeholder="e.g. L03: Kirchhoff Laws & Circuit Reduction"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Instructor</label>
                        <input
                          type="text"
                          value={videoForm.instructorName}
                          onChange={(e) => setVideoForm({ ...videoForm, instructorName: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={videoForm.courseId}
                        onChange={(e) => setVideoForm({ ...videoForm, courseId: e.target.value })}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="">Course (Optional)</option>
                        {data.courses.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <select
                        value={videoForm.subjectId}
                        onChange={(e) => setVideoForm({ ...videoForm, subjectId: e.target.value })}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="">Subject (Optional)</option>
                        {data.subjects.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={600}
                        value={videoForm.durationMinutes}
                        onChange={(e) => setVideoForm({ ...videoForm, durationMinutes: e.target.value })}
                        placeholder="Duration (minutes)"
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-8">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Video URL (YouTube / Embed / MP4 URL) *
                        </label>
                        <input
                          type="text"
                          required
                          value={videoForm.videoUrl}
                          onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">
                          <Upload className="h-4 w-4 text-[#1D4ED8]" />
                          <span>Or Upload MP4/WebM</span>
                          <input
                            type="file"
                            accept=".mp4,.webm"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(f, 'video');
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={videoForm.description}
                      onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                      placeholder="Lecture description and covered topics..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Publish Video Lecture</span>
                    </button>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {data.videos.map((v) => (
                      <div key={v.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0F172A] truncate">{v.title}</p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {v.instructorName} · {formatDuration(v.durationSeconds)} ·{' '}
                            {v.isPublished ? 'Published' : 'Unpublished'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/videos/${v.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ isPublished: !v.isPublished }),
                              });
                              await Promise.all([loadAdminData(), refreshData()]);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
                          >
                            {v.isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/videos/${v.id}`, { method: 'DELETE' });
                              await Promise.all([loadAdminData(), refreshData()]);
                              showNotice('ok', 'Video lecture deleted.');
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CURRICULUM (COURSES, SUBJECTS, CHAPTERS, TOPICS) */}
              {section === 'curriculum' && data && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Create Course */}
                    <form
                      onSubmit={handleCreateCourse}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <h2 className="font-display text-base font-bold text-[#0F172A]">Create Course</h2>
                      <input
                        type="text"
                        required
                        placeholder="Course title"
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          required
                          placeholder="Category (e.g. JEE Main)"
                          value={courseForm.category}
                          onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Level (e.g. Class 12)"
                          value={courseForm.level}
                          onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Instructor name"
                        value={courseForm.instructorName}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorName: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <textarea
                        rows={2}
                        required
                        placeholder="Course description..."
                        value={courseForm.description}
                        onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
                      >
                        Add Course
                      </button>
                    </form>

                    {/* Create Subject */}
                    <form
                      onSubmit={handleCreateSubject}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <h2 className="font-display text-base font-bold text-[#0F172A]">Create Subject</h2>
                      <select
                        required
                        value={subjectForm.courseId}
                        onChange={(e) => setSubjectForm({ ...subjectForm, courseId: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="">Select parent course *</option>
                        {data.courses.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          required
                          placeholder="Subject name"
                          value={subjectForm.name}
                          onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                          className="col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Code (PHY-301)"
                          value={subjectForm.code}
                          onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Subject summary..."
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
                      >
                        Add Subject
                      </button>
                    </form>

                    {/* Create Chapter */}
                    <form
                      onSubmit={handleCreateChapter}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <h2 className="font-display text-base font-bold text-[#0F172A]">Create Chapter</h2>
                      <select
                        required
                        value={chapterForm.subjectId}
                        onChange={(e) => setChapterForm({ ...chapterForm, subjectId: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="">Select subject *</option>
                        {data.subjects.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.code} — {s.name}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-4 gap-2.5">
                        <input
                          type="number"
                          min={1}
                          value={chapterForm.chapterNumber}
                          onChange={(e) =>
                            setChapterForm({ ...chapterForm, chapterNumber: e.target.value })
                          }
                          placeholder="#"
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Chapter title"
                          value={chapterForm.title}
                          onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                          className="col-span-3 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Chapter summary"
                        value={chapterForm.summary}
                        onChange={(e) => setChapterForm({ ...chapterForm, summary: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        Add Chapter
                      </button>
                    </form>

                    {/* Create Topic */}
                    <form
                      onSubmit={handleCreateTopic}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <h2 className="font-display text-base font-bold text-[#0F172A]">Create Topic</h2>
                      <select
                        required
                        value={topicForm.chapterId}
                        onChange={(e) => setTopicForm({ ...topicForm, chapterId: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="">Select chapter *</option>
                        {data.chapters.map((ch) => (
                          <option key={ch.id} value={String(ch.id)}>
                            Ch {ch.chapterNumber}: {ch.title}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-4 gap-2.5">
                        <input
                          type="number"
                          min={1}
                          value={topicForm.topicOrder}
                          onChange={(e) => setTopicForm({ ...topicForm, topicOrder: e.target.value })}
                          placeholder="#"
                          className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Topic title"
                          value={topicForm.title}
                          onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                          className="col-span-3 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Topic overview"
                        value={topicForm.summary}
                        onChange={(e) => setTopicForm({ ...topicForm, summary: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        Add Topic
                      </button>
                    </form>
                  </div>

                  {/* Existing Courses List */}
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    <div className="px-5 py-3.5 bg-slate-50 font-display text-sm font-bold">
                      Existing Courses ({data.courses.length})
                    </div>
                    {data.courses.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{c.title}</p>
                          <p className="text-xs text-slate-500">
                            {c.category} · {c.level} · {c.isPublished ? 'Published' : 'Unpublished'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/courses/${c.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ isPublished: !c.isPublished }),
                              });
                              await Promise.all([loadAdminData(), refreshData()]);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
                          >
                            {c.isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/courses/${c.id}`, { method: 'DELETE' });
                              await Promise.all([loadAdminData(), refreshData()]);
                              showNotice('ok', 'Course removed.');
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Existing Subjects, Chapters & Topics */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                      <div className="px-4 py-3 bg-slate-50 font-display text-xs font-bold uppercase tracking-wide text-slate-600">
                        Subjects ({data.subjects.length})
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {data.subjects.map((s) => (
                          <div key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#0F172A] truncate">{s.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{s.code}</p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/subjects/${s.id}`, { method: 'DELETE' });
                                await Promise.all([loadAdminData(true), refreshData(true)]);
                                notifyOtherTabs();
                                showNotice('ok', 'Subject deleted.');
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                      <div className="px-4 py-3 bg-slate-50 font-display text-xs font-bold uppercase tracking-wide text-slate-600">
                        Chapters ({data.chapters.length})
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {data.chapters.map((ch) => (
                          <div key={ch.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#0F172A] truncate">
                                Ch. {ch.chapterNumber}: {ch.title}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/chapters/${ch.id}`, { method: 'DELETE' });
                                await Promise.all([loadAdminData(true), refreshData(true)]);
                                notifyOtherTabs();
                                showNotice('ok', 'Chapter deleted.');
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                      <div className="px-4 py-3 bg-slate-50 font-display text-xs font-bold uppercase tracking-wide text-slate-600">
                        Topics ({data.topics.length})
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {data.topics.map((t) => (
                          <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#0F172A] truncate">
                                {t.topicOrder}. {t.title}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/topics/${t.id}`, { method: 'DELETE' });
                                await Promise.all([loadAdminData(true), refreshData(true)]);
                                notifyOtherTabs();
                                showNotice('ok', 'Topic deleted.');
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ANNOUNCEMENTS MANAGEMENT */}
              {section === 'announcements' && data && (
                <div className="space-y-6">
                  <form
                    onSubmit={handleCreateAnnouncement}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">
                      Create & Broadcast Announcement
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Announcement headline"
                        value={annForm.title}
                        onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                        className="md:col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <select
                        value={annForm.category}
                        onChange={(e) =>
                          setAnnForm({
                            ...annForm,
                            category: e.target.value as 'general' | 'new_notes' | 'new_course' | 'exam_alert',
                          })
                        }
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="general">General</option>
                        <option value="new_notes">New Notes Uploaded</option>
                        <option value="new_course">New Course</option>
                        <option value="exam_alert">Exam Alert</option>
                      </select>
                    </div>
                    <textarea
                      rows={3}
                      required
                      placeholder="Write announcement details..."
                      value={annForm.body}
                      onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={annForm.isPinned}
                          onChange={(e) => setAnnForm({ ...annForm, isPinned: e.target.checked })}
                        />
                        <span>Pin to top of announcements</span>
                      </label>
                      <button
                        type="submit"
                        className="px-5 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
                      >
                        Publish Announcement
                      </button>
                    </div>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {data.announcements.map((a) => (
                      <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            {a.isPinned ? 'Pinned · ' : ''}
                            {a.category} · {formatDateShort(a.createdAt)} ·{' '}
                            {a.isPublished ? 'Published' : 'Hidden'}
                          </p>
                          <p className="font-display text-sm font-bold text-[#0F172A]">{a.title}</p>
                          <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{a.body}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/announcements/${a.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ isPublished: !a.isPublished }),
                              });
                              await Promise.all([loadAdminData(), refreshData()]);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
                          >
                            {a.isPublished ? 'Hide' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
                              await Promise.all([loadAdminData(), refreshData()]);
                              showNotice('ok', 'Announcement deleted.');
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STUDENTS & ROLE MANAGEMENT */}
              {section === 'students' && data && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">
                      Registered Accounts ({filteredStudents.length})
                    </h2>
                    <input
                      type="search"
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      placeholder="Search by name, email, or target..."
                      className="w-full sm:w-72 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                          <th className="py-2.5 px-4 font-semibold">Student</th>
                          <th className="py-2.5 px-4 font-semibold">Target</th>
                          <th className="py-2.5 px-4 font-semibold">Role</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                          <th className="py-2.5 px-4 font-semibold">Joined</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredStudents.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <p className="font-medium text-[#0F172A]">{st.fullName}</p>
                              <p className="text-xs text-slate-500">{st.email}</p>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600">{st.gradeTarget}</td>
                            <td className="py-3 px-4 text-xs font-mono font-semibold">{st.role}</td>
                            <td className="py-3 px-4 text-xs font-semibold">
                              <span
                                className={
                                  st.status === 'active' ? 'text-emerald-700' : 'text-red-700'
                                }
                              >
                                {st.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">
                              {formatDateShort(st.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextRole = st.role === 'admin' ? 'student' : 'admin';
                                  await apiFetch(`/api/admin/students/${st.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ role: nextRole }),
                                  });
                                  await loadAdminData();
                                  showNotice('ok', `Updated ${st.fullName} role to ${nextRole}.`);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                              >
                                {st.role === 'admin' ? 'Set Student' : 'Make Admin'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextStatus = st.status === 'active' ? 'suspended' : 'active';
                                  await apiFetch(`/api/admin/students/${st.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: nextStatus }),
                                  });
                                  await loadAdminData();
                                  showNotice('ok', `Account status changed to ${nextStatus}.`);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                              >
                                {st.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CONTACT MESSAGES MANAGEMENT */}
              {section === 'messages' && data && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">
                      Student Contact Messages ({filteredMessages.length})
                    </h2>
                    <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                      {(['all', 'open', 'resolved'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setMessageFilter(f)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                            messageFilter === f ? 'bg-white text-[#0F172A]' : 'text-slate-600'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredMessages.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                      No contact messages in this view.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs text-slate-500 tabular-nums">
                                {msg.studentName} · {msg.email}
                                {msg.phone ? ` · ${msg.phone}` : ''} · {formatDateShort(msg.createdAt)}
                              </p>
                              <h3 className="mt-1 font-display text-base font-bold text-[#0F172A]">
                                {msg.subject}
                              </h3>
                            </div>
                            <span
                              className={`text-xs font-semibold ${
                                msg.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {msg.status === 'resolved' ? 'Resolved' : 'Open Inquiry'}
                            </span>
                          </div>

                          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                            {msg.message}
                          </p>

                          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject}`)}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] border border-blue-200 bg-blue-50/50 rounded-lg"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                <span>Reply via Email</span>
                              </a>
                              {msg.phone && (
                                <a
                                  href={`https://wa.me/${msg.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50/50 rounded-lg"
                                >
                                  WhatsApp Student
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  const next = msg.status === 'resolved' ? 'open' : 'resolved';
                                  await apiFetch(`/api/admin/messages/${msg.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: next }),
                                  });
                                  await loadAdminData();
                                  showNotice('ok', `Message marked as ${next}.`);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>
                                  {msg.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/messages/${msg.id}`, { method: 'DELETE' });
                                  await loadAdminData();
                                  showNotice('ok', 'Message deleted.');
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PLATFORM SETTINGS */}
              {section === 'settings' && (
                <div className="space-y-6 max-w-2xl">
                  <form
                    onSubmit={handleSaveSettings}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
                  >
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#0F172A]">
                        Platform Branding & Owner Contact Settings
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Changes here propagate immediately to the website header, footer, PDF note headers, and Contact Owner page.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Name</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.platformName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, platformName: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Owner / Desk Name</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.ownerName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, ownerName: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Tagline</label>
                      <textarea
                        rows={2}
                        required
                        value={settingsForm.tagline}
                        onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Email</label>
                        <input
                          type="email"
                          required
                          value={settingsForm.ownerEmail}
                          onChange={(e) => setSettingsForm({ ...settingsForm, ownerEmail: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          WhatsApp Number (with country code)
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsForm.whatsappNumber}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Support Hours</label>
                      <input
                        type="text"
                        required
                        value={settingsForm.supportHours}
                        onChange={(e) => setSettingsForm({ ...settingsForm, supportHours: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Platform Settings</span>
                    </button>
                  </form>

                  <form
                    onSubmit={handleUpdateAdminCredentials}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#0F172A]">
                        Admin ID & Password Login
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Set or update the Admin ID and password used for normal sign-in on /login and /admin.
                      </p>
                    </div>

                    {data?.adminAuth?.envConfigured ? (
                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                        Admin password login is currently managed via the <span className="font-mono font-semibold">ADMIN_PASSCODE</span> server secret (Admin ID: <span className="font-mono font-semibold">{data.adminAuth.adminLoginId || 'admin'}</span>). Update it in Settings &rarr; Secrets to change it.
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Admin ID</label>
                          <input
                            type="text"
                            required
                            minLength={3}
                            value={credForm.loginId}
                            onChange={(e) => setCredForm({ ...credForm, loginId: e.target.value })}
                            placeholder="admin"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              New Admin Password
                            </label>
                            <input
                              type="password"
                              required
                              minLength={6}
                              autoComplete="new-password"
                              value={credForm.password}
                              onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
                              placeholder="Minimum 6 characters"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              required
                              minLength={6}
                              autoComplete="new-password"
                              value={credForm.confirmPassword}
                              onChange={(e) =>
                                setCredForm({ ...credForm, confirmPassword: e.target.value })
                              }
                              placeholder="Re-enter password"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={savingCreds}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F172A] hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer"
                        >
                          <KeyRound className="h-4 w-4" />
                          <span>{savingCreds ? 'Updating...' : 'Save Admin Login Credentials'}</span>
                        </button>
                      </>
                    )}
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#0F172A]">
                        Android Release APK (Download Our App)
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Upload your signed universal <span className="font-mono">ASPD-Release.apk</span> here to update the website&apos;s &ldquo;Download Our App&rdquo; button instantly.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold text-[#0F172A]">
                          {apkStatus?.available ? 'Release APK Active' : 'No APK Uploaded Yet'}
                        </span>
                        {apkStatus?.available && apkStatus.sizeBytes > 0 && (
                          <span className="ml-2 text-slate-500 font-mono">
                            ({formatBytes(apkStatus.sizeBytes)})
                          </span>
                        )}
                      </div>
                      {apkStatus?.available && (
                        <a
                          href="/api/app/download"
                          download="ASPD-Release.apk"
                          className="font-semibold text-[#1D4ED8] hover:underline"
                        >
                          Test Download
                        </a>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer">
                      <Upload className="h-4 w-4" />
                      <span>{uploadingApk ? 'Uploading APK...' : 'Upload ASPD-Release.apk'}</span>
                      <input
                        type="file"
                        accept=".apk,application/vnd.android.package-archive"
                        disabled={uploadingApk}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleApkUpload(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
