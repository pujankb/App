import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Bookmark,
  BookOpen,
  Clock,
  Download,
  FileText,
  MessageSquare,
  PlayCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { formatBytes, formatDateShort, formatDuration, UserLibrary } from '../types';

export const DashboardPage: React.FC = () => {
  const {
    isAuthenticated,
    profile,
    courses,
    subjects,
    notes,
    videos,
    announcements,
    videoProgress,
    bookmarkedNoteIds,
    apiFetch,
    syncVersion,
  } = usePlatform();

  const navigate = useNavigate();
  const [library, setLibrary] = useState<UserLibrary | null>(null);
  const [loadingLib, setLoadingLib] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) return;
    setLoadingLib((prev) => (library ? prev : true));
    apiFetch('/api/me', { cache: 'no-store' })
      .then((res) => {
        if (active) setLibrary(res.library || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingLib(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, apiFetch, syncVersion]);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const videoMap = new Map(videos.map((v) => [v.id, v]));

  const continueWatching = videoProgress
    .map((vp) => ({ progress: vp, video: videoMap.get(vp.videoId) }))
    .filter((item): item is { progress: typeof videoProgress[number]; video: typeof videos[number] } =>
      Boolean(item.video)
    )
    .slice(0, 3);

  const bookmarkedNotes = notes.filter((n) => bookmarkedNoteIds.includes(n.id)).slice(0, 4);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    navigate(`/notes?q=${encodeURIComponent(quickQuery.trim())}`);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#1D4ED8]">
              {profile?.gradeTarget || 'Student Workspace'}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
              {profile ? `Welcome back, ${profile.fullName}` : 'Student Study Dashboard'}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              {isAuthenticated
                ? 'Continue your lectures, revise saved PDF notes, and stay updated with faculty announcements.'
                : 'Sign in with ID & password or Google to save bookmarks, track your lecture progress, and sync downloaded study notes.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!isAuthenticated && (
              <Link
                to="/login"
                className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap"
              >
                Sign In to Sync
              </Link>
            )}
            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Open Admin Panel</span>
              </Link>
            )}
            <Link
              to="/profile"
              className="px-4 py-2.5 text-sm font-semibold text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              Profile & Downloads
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Contact Owner</span>
            </Link>
          </div>
        </div>

        <form onSubmit={handleQuickSearch} className="pt-4 border-t border-slate-100 flex gap-2.5 max-w-xl">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search study notes, formula sheets, or DPPs..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg whitespace-nowrap cursor-pointer"
          >
            Search Notes
          </button>
        </form>
      </div>

      {/* Key Workspace Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Available Courses</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-[#0F172A] tabular-nums">
            {courses.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Published Study Notes</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-[#0F172A] tabular-nums">
            {notes.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Saved Bookmarks</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-[#0F172A] tabular-nums">
            {bookmarkedNoteIds.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Downloaded Notes</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-[#0F172A] tabular-nums">
            {loadingLib ? '—' : library?.downloads.length ?? 0}
          </p>
        </div>
      </div>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-[#0F172A]">Continue Watching</h2>
            <Link to="/videos" className="text-sm font-semibold text-[#1D4ED8] hover:underline">
              All Video Lectures
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {continueWatching.map(({ progress, video }) => {
              const pct = Math.min(
                100,
                Math.round(((progress.watchedSeconds || 0) / Math.max(1, video.durationSeconds)) * 100)
              );
              return (
                <Link
                  key={video.id}
                  to={`/videos?videoId=${video.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">{video.instructorName}</p>
                      <h3 className="mt-0.5 font-display text-sm font-semibold text-[#0F172A] line-clamp-2">
                        {video.title}
                      </h3>
                    </div>
                    <PlayCircle className="h-5 w-5 text-[#1D4ED8] shrink-0" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1D4ED8]" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {progress.completed
                        ? 'Completed'
                        : `${formatDuration(progress.watchedSeconds)} / ${formatDuration(video.durationSeconds)} (${pct}%)`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Split: Notes & Recently Viewed vs Announcements & Bookmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Quick Subjects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-[#0F172A]">Quick Subject Access</h2>
              <Link to="/subjects" className="text-sm font-semibold text-[#1D4ED8] hover:underline">
                Full Syllabus
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {subjects.slice(0, 6).map((sub) => (
                <Link
                  key={sub.id}
                  to={`/notes?subjectId=${sub.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-500">{sub.code}</p>
                    <p className="font-display text-sm font-semibold text-[#0F172A] truncate">
                      {sub.name}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                </Link>
              ))}
            </div>
          </section>

          {/* Latest Study Materials */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-[#0F172A]">Recently Added Study Material</h2>
              <Link to="/notes" className="text-sm font-semibold text-[#1D4ED8] hover:underline">
                Browse All Notes
              </Link>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {notes.slice(0, 5).map((note) => {
                const sub = note.subjectId ? subjectMap.get(note.subjectId) : null;
                return (
                  <div
                    key={note.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 tabular-nums">
                        {sub?.name || 'General'} · {note.category} · {formatBytes(note.fileSizeBytes)}
                      </p>
                      <Link
                        to={`/notes/${note.id}`}
                        className="mt-0.5 block font-display text-sm font-semibold text-[#0F172A] hover:text-[#1D4ED8]"
                      >
                        {note.title}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/notes/${note.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0F172A] border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Open</span>
                      </Link>
                      <a
                        href={`/api/notes/${note.id}/file?download=1`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recently Viewed Notes */}
          {library && library.recentlyViewed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-slate-500" />
                <h2 className="font-display text-xl font-bold text-[#0F172A]">Recently Viewed Notes</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {library.recentlyViewed.slice(0, 4).map((note) => (
                  <Link
                    key={note.id}
                    to={`/notes/${note.id}`}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
                  >
                    <p className="text-xs text-slate-500 tabular-nums">
                      {note.category} · Viewed {formatDateShort(note.viewedAt)}
                    </p>
                    <p className="mt-1 font-display text-sm font-semibold text-[#0F172A] line-clamp-1">
                      {note.title}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Bookmarked Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-[#1D4ED8]" />
                <h2 className="font-display text-base font-bold text-[#0F172A]">Bookmarked Notes</h2>
              </div>
              <Link to="/profile" className="text-xs font-semibold text-[#1D4ED8] hover:underline">
                Manage
              </Link>
            </div>
            {bookmarkedNotes.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {bookmarkedNotes.map((note) => (
                  <li key={note.id} className="py-2.5">
                    <Link
                      to={`/notes/${note.id}`}
                      className="text-sm font-medium text-[#0F172A] hover:text-[#1D4ED8] line-clamp-1"
                    >
                      {note.title}
                    </Link>
                    <p className="text-xs text-slate-500">{note.category}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                No bookmarked notes yet. Open any note in the library and click Bookmark to pin it here.
              </p>
            )}
          </div>

          {/* Announcements */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#1D4ED8]" />
                <h2 className="font-display text-base font-bold text-[#0F172A]">Announcements</h2>
              </div>
              <Link to="/announcements" className="text-xs font-semibold text-[#1D4ED8] hover:underline">
                All
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {announcements.slice(0, 3).map((a) => (
                <li key={a.id} className="py-3 first:pt-1 last:pb-0">
                  <p className="text-xs text-slate-500 tabular-nums">{formatDateShort(a.createdAt)}</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">{a.title}</p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{a.body}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Courses */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-[#1D4ED8]" />
              <h2 className="font-display text-base font-bold text-[#0F172A]">Recommended Tracks</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {courses.slice(0, 3).map((c) => (
                <li key={c.id} className="py-2.5 first:pt-1 last:pb-0">
                  <Link
                    to={`/courses?courseId=${c.id}`}
                    className="text-sm font-semibold text-[#0F172A] hover:text-[#1D4ED8]"
                  >
                    {c.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {c.category} · {c.instructorName}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
