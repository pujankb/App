import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, PlayCircle, Search } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { SafeImage } from '../components/Layout';
import { formatDuration, VideoItem } from '../types';

function toEmbedUrl(raw: string): { kind: 'iframe' | 'video'; src: string } {
  const url = (raw || '').trim();
  if (url.endsWith('.mp4') || url.endsWith('.webm') || url.startsWith('/api/uploads/')) {
    return { kind: 'video', src: url };
  }
  // Convert standard youtube watch/short URLs to embed format
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.pathname === '/watch' && u.searchParams.get('v')) {
      return {
        kind: 'iframe',
        src: `https://www.youtube.com/embed/${u.searchParams.get('v')}`,
      };
    }
    if (u.hostname === 'youtu.be' && u.pathname.length > 1) {
      return {
        kind: 'iframe',
        src: `https://www.youtube.com/embed/${u.pathname.slice(1)}`,
      };
    }
  } catch {
    // Keep as-is
  }
  return { kind: 'iframe', src: url };
}

export const VideosPage: React.FC = () => {
  const {
    videos,
    courses,
    subjects,
    videoProgress,
    saveVideoProgress,
    isAuthenticated,
  } = usePlatform();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialVideoId = Number(searchParams.get('videoId') || 0);

  const [courseFilter, setCourseFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const progressMap = useMemo(
    () => new Map(videoProgress.map((vp) => [vp.videoId, vp])),
    [videoProgress]
  );

  const filteredVideos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (courseFilter !== 'all' && String(v.courseId) !== courseFilter) return false;
      if (subjectFilter !== 'all' && String(v.subjectId) !== subjectFilter) return false;
      if (q) {
        return (
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.instructorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [videos, courseFilter, subjectFilter, search]);

  const activeVideo: VideoItem | null =
    videos.find((v) => v.id === initialVideoId) || filteredVideos[0] || videos[0] || null;

  const selectVideo = (video: VideoItem) => {
    setSearchParams({ videoId: String(video.id) });
    if (isAuthenticated) {
      const existing = progressMap.get(video.id);
      const nextSeconds = existing?.watchedSeconds ? existing.watchedSeconds : Math.min(120, video.durationSeconds);
      saveVideoProgress(video.id, nextSeconds, existing?.completed || false).catch(() => {});
    }
  };

  const handleMarkProgress = async (completed: boolean) => {
    if (!activeVideo || !isAuthenticated) return;
    setSavingProgress(true);
    try {
      const nextSec = completed
        ? activeVideo.durationSeconds
        : Math.round(activeVideo.durationSeconds * 0.5);
      await saveVideoProgress(activeVideo.id, nextSec, completed);
    } finally {
      setSavingProgress(false);
    }
  };

  const activeProgress = activeVideo ? progressMap.get(activeVideo.id) : null;
  const media = activeVideo ? toEmbedUrl(activeVideo.videoUrl) : null;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0F172A]">Video Lectures</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Course-wise and subject-wise HD lectures with playback progress tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lectures..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>
          <select
            aria-label="Filter videos by course"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter videos by subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Player + Playlist Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Video Stage */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {activeVideo && media ? (
            <>
              <div className="aspect-video bg-[#0F172A]">
                {media.kind === 'video' ? (
                  <video
                    key={activeVideo.id}
                    src={media.src}
                    controls
                    className="w-full h-full"
                    onTimeUpdate={(e) => {
                      const sec = Math.floor(e.currentTarget.currentTime);
                      if (isAuthenticated && sec > 0 && sec % 30 === 0) {
                        saveVideoProgress(activeVideo.id, sec, false).catch(() => {});
                      }
                    }}
                    onEnded={() => {
                      if (isAuthenticated) {
                        saveVideoProgress(activeVideo.id, activeVideo.durationSeconds, true).catch(
                          () => {}
                        );
                      }
                    }}
                  />
                ) : (
                  <iframe
                    key={activeVideo.id}
                    src={media.src}
                    title={activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                )}
              </div>

              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 tabular-nums">
                      {[
                        activeVideo.courseId ? courseMap.get(activeVideo.courseId)?.title : null,
                        activeVideo.subjectId ? subjectMap.get(activeVideo.subjectId)?.name : null,
                        activeVideo.instructorName,
                        formatDuration(activeVideo.durationSeconds),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A]">
                      {activeVideo.title}
                    </h2>
                  </div>

                  {isAuthenticated && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={savingProgress}
                        onClick={() => handleMarkProgress(false)}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Save Checkpoint
                      </button>
                      <button
                        type="button"
                        disabled={savingProgress}
                        onClick={() => handleMarkProgress(!activeProgress?.completed)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                          activeProgress?.completed
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{activeProgress?.completed ? 'Completed' : 'Mark Completed'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">{activeVideo.description}</p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 tabular-nums">
                  <span>{activeVideo.viewsCount.toLocaleString()} lecture views</span>
                  {activeProgress && (
                    <span>
                      {activeProgress.completed
                        ? 'Status: Completed'
                        : `Saved position: ${formatDuration(activeProgress.watchedSeconds)}`}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              No video lectures are published yet.
            </div>
          )}
        </div>

        {/* Lecture Queue */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#0F172A]">Lecture Playlist</h2>
            <span className="text-xs text-slate-500 tabular-nums">{filteredVideos.length} videos</span>
          </div>
          <div className="divide-y divide-slate-200 max-h-[620px] overflow-y-auto">
            {filteredVideos.map((v) => {
              const isSelected = activeVideo?.id === v.id;
              const prog = progressMap.get(v.id);
              const sub = v.subjectId ? subjectMap.get(v.subjectId) : null;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectVideo(v)}
                  className={`w-full text-left p-3.5 flex gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="relative w-24 h-16 rounded-md overflow-hidden bg-slate-900 shrink-0">
                    <SafeImage
                      src={v.thumbnailUrl}
                      alt={v.title}
                      className="w-full h-full object-cover opacity-90"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-mono px-1 rounded tabular-nums">
                      {formatDuration(v.durationSeconds)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-500 truncate">
                      {sub?.name || 'Lecture'}
                      {prog?.completed ? ' · Completed' : prog ? ' · In Progress' : ''}
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-semibold line-clamp-2 ${
                        isSelected ? 'text-[#1D4ED8]' : 'text-[#0F172A]'
                      }`}
                    >
                      {v.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 truncate">{v.instructorName}</p>
                  </div>
                  {isSelected && <PlayCircle className="h-4 w-4 text-[#1D4ED8] shrink-0 self-center" />}
                </button>
              );
            })}
            {filteredVideos.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No lectures match your current filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
