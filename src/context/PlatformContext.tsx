import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  AnnouncementItem,
  Chapter,
  Course,
  NoteItem,
  NotificationItem,
  PlatformSettings,
  Profile,
  Subject,
  Topic,
  VideoItem,
  VideoProgress,
} from '../types';

interface PlatformContextValue {
  firebaseUser: User | null;
  isAuthenticated: boolean;
  profile: Profile | null;
  authLoading: boolean;
  dataLoading: boolean;
  error: string | null;
  settings: PlatformSettings;
  courses: Course[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  notes: NoteItem[];
  videos: VideoItem[];
  announcements: AnnouncementItem[];
  notifications: NotificationItem[];
  bookmarkedNoteIds: number[];
  videoProgress: VideoProgress[];
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (loginId: string, password: string) => Promise<Profile>;
  registerWithCredentials: (fullName: string, loginId: string, password: string) => Promise<Profile>;
  claimAdminAccess: (loginId: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  refreshData: (silent?: boolean) => Promise<void>;
  syncVersion: number;
  toggleNoteBookmark: (noteId: number) => Promise<boolean>;
  saveVideoProgress: (videoId: number, watchedSeconds: number, completed: boolean) => Promise<void>;
  apiFetch: <T = any>(url: string, options?: RequestInit) => Promise<T>;
  getAuthToken: () => Promise<string | null>;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  id: 1,
  platformName: 'ASPD',
  tagline:
    'Structured academic preparation with curated study notes, HD video lectures, and direct faculty mentorship.',
  ownerName: 'ASPD Academic Desk',
  ownerEmail: 'support@aspd-academy.edu',
  whatsappNumber: '+919876543210',
  supportHours: 'Mon–Sat, 9:00 AM – 8:00 PM IST',
  updatedAt: '',
};

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [hasLocalSession, setHasLocalSession] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [syncVersion, setSyncVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [bookmarkedNoteIds, setBookmarkedNoteIds] = useState<number[]>([]);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);

  // Strictly in-memory auth tokens (never stored in localStorage or sessionStorage)
  const firebaseTokenRef = useRef<string | null>(null);
  const localTokenRef = useRef<string | null>(null);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (localTokenRef.current) {
      return localTokenRef.current;
    }
    const current = auth.currentUser;
    if (!current) {
      firebaseTokenRef.current = null;
      return null;
    }
    const freshToken = await current.getIdToken();
    firebaseTokenRef.current = freshToken;
    return freshToken;
  }, []);

  const apiFetch = useCallback(
    async <T = any,>(url: string, options: RequestInit = {}): Promise<T> => {
      const token = await getAuthToken();
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const res = await fetch(url, { ...options, headers });
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json() : null;

      if (!res.ok) {
        const message = payload?.error || `Request failed (${res.status})`;
        throw new Error(message);
      }
      return payload as T;
    },
    [getAuthToken]
  );

  const refreshData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setDataLoading(true);
      }
      setError(null);
      try {
        const data = await apiFetch('/api/bootstrap', { cache: 'no-store' });
        if (data.settings) setSettings(data.settings);
        setProfile(data.profile || null);
        setCourses(data.courses || []);
        setSubjects(data.subjects || []);
        setChapters(data.chapters || []);
        setTopics(data.topics || []);
        setNotes(data.notes || []);
        setVideos(data.videos || []);
        setAnnouncements(data.announcements || []);
        setNotifications(data.notifications || []);
        setBookmarkedNoteIds(data.bookmarkedNoteIds || []);
        setVideoProgress(data.videoProgress || []);
        setSyncVersion((v) => v + 1);
      } catch (err: any) {
        if (!silent) {
          setError(err.message || 'Unable to connect to the platform service.');
        }
      } finally {
        if (!silent) {
          setDataLoading(false);
        }
      }
    },
    [apiFetch]
  );

  // Keep browser tab title synced whenever platformName changes in Admin Settings
  useEffect(() => {
    if (settings.platformName) {
      document.title = `${settings.platformName} — Academic Notes, Courses & Video Lectures`;
    }
  }, [settings.platformName]);

  // Live updates: listen to Server-Sent Events (/api/events), BroadcastChannel, and tab focus
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleSilentRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshData(true);
      }, 150);
    };

    let eventSource: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('platform_updated', scheduleSilentRefresh);
    }

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('aspd_platform_sync');
      channel.onmessage = () => scheduleSilentRefresh();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleSilentRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      eventSource?.close();
      channel?.close();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        firebaseTokenRef.current = await user.getIdToken();
      } else {
        firebaseTokenRef.current = null;
        if (!localTokenRef.current) {
          setProfile(null);
        }
      }
      setAuthLoading(false);
      await refreshData();
    });
    return () => unsubscribe();
  }, [refreshData]);

  const signInWithGoogle = useCallback(async () => {
    localTokenRef.current = null;
    setHasLocalSession(false);
    const credential = await signInWithPopup(auth, googleAuthProvider);
    firebaseTokenRef.current = await credential.user.getIdToken();
    await refreshData();
  }, [refreshData]);

  const signInWithCredentials = useCallback(
    async (loginId: string, password: string): Promise<Profile> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Invalid ID or password.');
      }
      localTokenRef.current = payload.token;
      setHasLocalSession(true);
      setProfile(payload.profile);
      await refreshData();
      return payload.profile as Profile;
    },
    [refreshData]
  );

  const registerWithCredentials = useCallback(
    async (fullName: string, loginId: string, password: string): Promise<Profile> => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, loginId, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Unable to create account.');
      }
      localTokenRef.current = payload.token;
      setHasLocalSession(true);
      setProfile(payload.profile);
      await refreshData();
      return payload.profile as Profile;
    },
    [refreshData]
  );

  const claimAdminAccess = useCallback(
    async (loginId: string, password: string): Promise<Profile> => {
      const res = await fetch('/api/auth/admin-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Unable to claim admin access.');
      }
      localTokenRef.current = payload.token;
      setHasLocalSession(true);
      setProfile(payload.profile);
      await refreshData();
      return payload.profile as Profile;
    },
    [refreshData]
  );

  const signOut = useCallback(async () => {
    localTokenRef.current = null;
    setHasLocalSession(false);
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
    firebaseTokenRef.current = null;
    setProfile(null);
    setBookmarkedNoteIds([]);
    setVideoProgress([]);
    await refreshData();
  }, [refreshData]);

  const toggleNoteBookmark = useCallback(
    async (noteId: number): Promise<boolean> => {
      const res = await apiFetch<{ bookmarked: boolean }>(`/api/notes/${noteId}/bookmark`, {
        method: 'POST',
      });
      setBookmarkedNoteIds((prev) =>
        res.bookmarked ? Array.from(new Set([...prev, noteId])) : prev.filter((id) => id !== noteId)
      );
      return res.bookmarked;
    },
    [apiFetch]
  );

  const saveVideoProgress = useCallback(
    async (videoId: number, watchedSeconds: number, completed: boolean) => {
      if (!auth.currentUser && !localTokenRef.current) return;
      const res = await apiFetch<{ progress: VideoProgress }>(`/api/videos/${videoId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ watchedSeconds, completed }),
      });
      setVideoProgress((prev) => {
        const filtered = prev.filter((p) => p.videoId !== videoId);
        return [res.progress, ...filtered];
      });
    },
    [apiFetch]
  );

  const isAuthenticated = Boolean(firebaseUser || hasLocalSession);

  return (
    <PlatformContext.Provider
      value={{
        firebaseUser,
        isAuthenticated,
        profile,
        authLoading,
        dataLoading,
        error,
        settings,
        courses,
        subjects,
        chapters,
        topics,
        notes,
        videos,
        announcements,
        notifications,
        bookmarkedNoteIds,
        videoProgress,
        signInWithGoogle,
        signInWithCredentials,
        registerWithCredentials,
        claimAdminAccess,
        signOut,
        refreshData,
        syncVersion,
        toggleNoteBookmark,
        saveVideoProgress,
        apiFetch,
        getAuthToken,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
