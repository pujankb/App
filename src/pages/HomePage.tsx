import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Download,
  FileText,
  Mail,
  MessageSquare,
  PlayCircle,
  Smartphone,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { SafeImage } from '../components/Layout';
import { formatBytes, formatDateShort, formatDuration } from '../types';

const HERO_IMAGE = '/src/assets/images/hero_aspd_scholar_desk_1795284686126.jpg';

export const HomePage: React.FC = () => {
  const {
    settings,
    profile,
    courses,
    subjects,
    notes,
    videos,
    announcements,
    dataLoading,
    syncVersion,
  } = usePlatform();

  const [apkInfo, setApkInfo] = useState<{ available: boolean; sizeBytes: number } | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/app/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s) => setApkInfo({ available: Boolean(s.available), sizeBytes: Number(s.sizeBytes || 0) }))
      .catch(() => setApkInfo({ available: false, sizeBytes: 0 }));
  }, [syncVersion]);

  const handleAppDownload = () => {
    setDownloadNotice(null);
    if (apkInfo && !apkInfo.available) {
      setDownloadNotice(
        'The Android APK is being finalized. Administrators can upload ASPD-Release.apk anytime in Admin -> Platform Settings.'
      );
      return;
    }
    const link = document.createElement('a');
    link.href = '/api/app/download';
    link.download = 'ASPD-Release.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const totalDownloads = notes.reduce((acc, n) => acc + (n.downloadsCount || 0), 0);

  return (
    <div>
      {/* Editorial 2-Column Hero Split */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-sm font-medium text-[#1D4ED8] tracking-normal">
                {profile
                  ? `Welcome back, ${profile.fullName}`
                  : `${settings.platformName} Academic Preparation Platform`}
              </p>

              <h1
                className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-bold tracking-tight text-[#0F172A] leading-[1.12] max-w-xl"
                style={{ textWrap: 'balance' }}
              >
                Focused courses, readable PDF notes, and structured video lectures.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                {settings.tagline} Browse chapter-wise notes, download revision sheets, and resume lectures from any device.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/notes"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Browse Study Notes</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={handleAppDownload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Download Our App</span>
                </button>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explore Courses</span>
                </Link>
              </div>
              {downloadNotice && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2 max-w-xl">
                  {downloadNotice}
                </p>
              )}
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[260px] lg:min-h-[360px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <SafeImage
                  src={HERO_IMAGE}
                  alt="Sunlit student study desk with physics and calculus notebooks"
                  className="w-full h-full object-cover"
                  fallbackLabel={`${settings.platformName} Study Desk`}
                />
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Curriculum Summary Strip */}
          <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-500">Active Courses</p>
              <p className="mt-1 text-2xl font-display font-bold text-[#0F172A] tabular-nums">
                {dataLoading ? '—' : courses.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Subjects Covered</p>
              <p className="mt-1 text-2xl font-display font-bold text-[#0F172A] tabular-nums">
                {dataLoading ? '—' : subjects.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Study Notes & DPPs</p>
              <p className="mt-1 text-2xl font-display font-bold text-[#0F172A] tabular-nums">
                {dataLoading ? '—' : notes.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Note Downloads</p>
              <p className="mt-1 text-2xl font-display font-bold text-[#0F172A] tabular-nums">
                {dataLoading ? '—' : totalDownloads.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access to Subjects */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0F172A]">Quick Access to Subjects</h2>
            <p className="text-sm text-slate-600 mt-1">
              Jump directly to chapter notes, formula sheets, and recorded lectures by subject.
            </p>
          </div>
          <Link
            to="/subjects"
            className="text-sm font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0"
          >
            All Subjects
          </Link>
        </div>

        {dataLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.slice(0, 6).map((subject) => {
              const subjectNoteCount = notes.filter((n) => n.subjectId === subject.id).length;
              const subjectVideoCount = videos.filter((v) => v.subjectId === subject.id).length;
              return (
                <Link
                  key={subject.id}
                  to={`/notes?subjectId=${subject.id}`}
                  className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs font-mono text-slate-500">{subject.code}</p>
                    <h3 className="mt-1 font-display text-base font-semibold text-[#0F172A] group-hover:text-[#1D4ED8] transition-colors">
                      {subject.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{subject.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 tabular-nums">
                    <span>
                      {subjectNoteCount} Notes · {subjectVideoCount} Lectures
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#1D4ED8] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Courses */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0F172A]">Available Courses</h2>
            <p className="text-sm text-slate-600 mt-1">
              Structured tracks organized from subject syllabus down to topic-level materials.
            </p>
          </div>
          <Link
            to="/courses"
            className="text-sm font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0"
          >
            View All Courses
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {courses.slice(0, 4).map((course) => {
            const subCount = subjects.filter((s) => s.courseId === course.id).length;
            return (
              <Link
                key={course.id}
                to={`/courses?courseId=${course.id}`}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors flex flex-col"
              >
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                  <SafeImage
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    fallbackLabel={course.category}
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      {course.category} · {course.level}
                    </p>
                    <h3 className="mt-1.5 font-display text-base font-semibold text-[#0F172A] group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{course.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between tabular-nums">
                    <span className="truncate">{course.instructorName}</span>
                    <span className="shrink-0 ml-2">{subCount} Subjects</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Latest Uploaded Notes + Important Announcements */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Latest Study Notes (8 cols) */}
          <div className="lg:col-span-8">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#0F172A]">Latest Uploaded Notes</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Read directly inside {settings.platformName} or download print-ready PDF sheets.
                </p>
              </div>
              <Link
                to="/notes"
                className="text-sm font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0"
              >
                Full Library
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {notes.slice(0, 5).map((note) => {
                const sub = note.subjectId ? subjectMap.get(note.subjectId) : null;
                return (
                  <div
                    key={note.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 tabular-nums">
                        {sub ? sub.name : 'General'} · {note.category} · {formatBytes(note.fileSizeBytes)} ·{' '}
                        {formatDateShort(note.createdAt)}
                      </p>
                      <Link
                        to={`/notes/${note.id}`}
                        className="mt-1 block font-display text-base font-semibold text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
                      >
                        {note.title}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-1">{note.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/notes/${note.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Read</span>
                      </Link>
                      <a
                        href={`/api/notes/${note.id}/file?download=1`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </a>
                    </div>
                  </div>
                );
              })}
              {!dataLoading && notes.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No study notes have been published yet.
                </div>
              )}
            </div>
          </div>

          {/* Important Announcements (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <div className="flex items-end justify-between gap-4 mb-5">
                <h2 className="font-display text-2xl font-bold text-[#0F172A]">Announcements</h2>
                <Link
                  to="/announcements"
                  className="text-sm font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0"
                >
                  View All
                </Link>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                {announcements.slice(0, 4).map((item) => (
                  <div key={item.id} className="p-4">
                    <p className="text-xs text-slate-500 tabular-nums">
                      {item.isPinned ? 'Pinned · ' : ''}
                      {item.category.replace('_', ' ')} · {formatDateShort(item.createdAt)}
                    </p>
                    <h3 className="mt-1 font-display text-sm font-semibold text-[#0F172A]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Owner Direct Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <Bell className="h-4 w-4 text-[#1D4ED8]" />
                <h3 className="font-display text-base font-semibold">Need Study Guidance?</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Reach {settings.ownerName} directly for syllabus requests, missing notes, or batch inquiries.
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Contact Owner</span>
                </Link>
                <a
                  href={`mailto:${settings.ownerEmail}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email Desk</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Video Lectures */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0F172A]">Recommended Video Lectures</h2>
            <p className="text-sm text-slate-600 mt-1">
              Concept derivations and problem-solving sessions synced with your study notes.
            </p>
          </div>
          <Link
            to="/videos"
            className="text-sm font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0"
          >
            All Lectures
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {videos.slice(0, 3).map((video) => {
            const sub = video.subjectId ? subjectMap.get(video.subjectId) : null;
            return (
              <Link
                key={video.id}
                to={`/videos?videoId=${video.id}`}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors flex flex-col"
              >
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <SafeImage
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-90 group-hover:scale-[1.02] transition-transform duration-200"
                    fallbackLabel={video.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent flex items-end justify-between p-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                      <PlayCircle className="h-4 w-4" />
                      <span>Watch Lecture</span>
                    </span>
                    <span className="text-xs font-mono text-white/95 tabular-nums">
                      {formatDuration(video.durationSeconds)}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      {sub ? sub.name : 'Lecture'} · {video.instructorName}
                    </p>
                    <h3 className="mt-1 font-display text-base font-semibold text-[#0F172A] group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                      {video.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 tabular-nums">
                    {video.viewsCount.toLocaleString()} views
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};
