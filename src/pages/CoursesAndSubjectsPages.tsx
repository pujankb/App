import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronRight, FileText, PlayCircle, Search } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { SafeImage } from '../components/Layout';
import { formatDuration } from '../types';

export const CoursesPage: React.FC = () => {
  const { courses, subjects, chapters, topics, notes, videos } = usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCourseParam = Number(searchParams.get('courseId') || 0);

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(
    selectedCourseParam || null
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(courses.map((c) => c.category)));
    return ['All', ...unique];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.instructorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [courses, categoryFilter, search]);

  const toggleExpand = (id: number) => {
    const next = expandedCourseId === id ? null : id;
    setExpandedCourseId(next);
    if (next) {
      setSearchParams({ courseId: String(next) });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0F172A]">Courses & Study Tracks</h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Explore complete course structures organized into subjects, chapters, topics, PDF notes, and video lectures.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses or faculty..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
          />
        </div>
      </div>

      {/* Interactive Category Segmented Filter */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              categoryFilter === cat
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {filteredCourses.map((course) => {
          const courseSubjects = subjects.filter((s) => s.courseId === course.id);
          const courseNotes = notes.filter((n) => n.courseId === course.id);
          const courseVideos = videos.filter((v) => v.courseId === course.id);
          const isOpen = expandedCourseId === course.id;

          return (
            <article
              key={course.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-4 aspect-[4/3] lg:aspect-auto bg-slate-100">
                  <SafeImage
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    fallbackLabel={course.category}
                  />
                </div>
                <div className="lg:col-span-8 p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      {course.category} · {course.level} · {course.instructorName}
                    </p>
                    <h2 className="mt-1.5 font-display text-2xl font-bold text-[#0F172A]">
                      {course.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 tabular-nums">
                      {courseSubjects.length} Subjects · {courseNotes.length} Study Notes ·{' '}
                      {courseVideos.length} Video Lectures
                    </p>

                    <div className="flex items-center gap-2.5">
                      <Link
                        to={`/notes?courseId=${course.id}`}
                        className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap"
                      >
                        View Notes
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleExpand(course.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg whitespace-nowrap cursor-pointer"
                      >
                        <span>{isOpen ? 'Hide Curriculum' : 'Inspect Curriculum'}</span>
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-200 bg-slate-50/70 p-6 space-y-6">
                  {courseSubjects.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No subjects have been linked to this course yet.
                    </p>
                  ) : (
                    courseSubjects.map((sub) => {
                      const subChapters = chapters.filter((ch) => ch.subjectId === sub.id);
                      return (
                        <div key={sub.id} className="space-y-3">
                          <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-2">
                            <div>
                              <span className="text-xs font-mono text-slate-500 mr-2">
                                {sub.code}
                              </span>
                              <h3 className="inline font-display text-lg font-bold text-[#0F172A]">
                                {sub.name}
                              </h3>
                            </div>
                            <Link
                              to={`/notes?subjectId=${sub.id}`}
                              className="text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
                            >
                              All Subject Notes
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subChapters.map((ch) => {
                              const chTopics = topics.filter((t) => t.chapterId === ch.id);
                              const chNotes = notes.filter((n) => n.chapterId === ch.id);
                              const chVideos = videos.filter((v) => v.chapterId === ch.id);
                              return (
                                <div
                                  key={ch.id}
                                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
                                >
                                  <div>
                                    <p className="text-xs font-mono text-slate-500">
                                      Chapter {String(ch.chapterNumber).padStart(2, '0')}
                                    </p>
                                    <h4 className="font-display text-sm font-semibold text-[#0F172A]">
                                      {ch.title}
                                    </h4>
                                    {ch.summary && (
                                      <p className="mt-1 text-xs text-slate-600">{ch.summary}</p>
                                    )}
                                  </div>

                                  {chTopics.length > 0 && (
                                    <ul className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                                      {chTopics.map((tp) => (
                                        <li key={tp.id} className="flex items-start gap-2">
                                          <span className="font-mono text-slate-400">
                                            {tp.topicOrder}.
                                          </span>
                                          <span>{tp.title}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
                                    {chNotes.map((n) => (
                                      <Link
                                        key={n.id}
                                        to={`/notes/${n.id}`}
                                        className="inline-flex items-center gap-1 font-medium text-[#1D4ED8] hover:underline"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        <span className="truncate max-w-[200px]">{n.title}</span>
                                      </Link>
                                    ))}
                                    {chVideos.map((v) => (
                                      <Link
                                        key={v.id}
                                        to={`/videos?videoId=${v.id}`}
                                        className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-[#1D4ED8]"
                                      >
                                        <PlayCircle className="h-3.5 w-3.5" />
                                        <span>{formatDuration(v.durationSeconds)}</span>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </article>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
            <BookOpen className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="font-display font-semibold text-[#0F172A]">No matching courses found</p>
            <p className="text-sm text-slate-500">
              Try clearing your search query or selecting All categories.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const SubjectsPage: React.FC = () => {
  const { courses, subjects, chapters, topics, notes, videos } = usePlatform();
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
    subjects[0]?.id || null
  );

  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0] || null;
  const activeChapters = activeSubject
    ? chapters.filter((ch) => ch.subjectId === activeSubject.id)
    : [];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#0F172A]">Subjects & Syllabus Tree</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Select any subject to inspect its chapters, topic outlines, linked PDF notes, and video lectures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-2.5">
          {subjects.map((sub) => {
            const active = activeSubject?.id === sub.id;
            const course = courseMap.get(sub.courseId);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white text-[#0F172A] border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className={`text-xs font-mono ${active ? 'text-blue-300' : 'text-slate-500'}`}>
                  {sub.code} · {course?.category || 'Track'}
                </p>
                <p className="mt-1 font-display text-base font-semibold">{sub.name}</p>
                <p className={`mt-1 text-xs line-clamp-2 ${active ? 'text-slate-300' : 'text-slate-600'}`}>
                  {sub.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8">
          {activeSubject ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-mono text-slate-500">{activeSubject.code}</p>
                  <h2 className="font-display text-2xl font-bold text-[#0F172A]">
                    {activeSubject.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{activeSubject.description}</p>
                </div>
                <Link
                  to={`/notes?subjectId=${activeSubject.id}`}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg whitespace-nowrap self-start"
                >
                  Open Subject Notes
                </Link>
              </div>

              <div className="space-y-5">
                {activeChapters.map((ch) => {
                  const chTopics = topics.filter((t) => t.chapterId === ch.id);
                  const chNotes = notes.filter((n) => n.chapterId === ch.id);
                  const chVideos = videos.filter((v) => v.chapterId === ch.id);
                  return (
                    <div key={ch.id} className="border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                      <p className="text-xs font-mono text-slate-500">
                        Chapter {String(ch.chapterNumber).padStart(2, '0')}
                      </p>
                      <h3 className="font-display text-lg font-semibold text-[#0F172A]">
                        {ch.title}
                      </h3>
                      {ch.summary && <p className="mt-1 text-sm text-slate-600">{ch.summary}</p>}

                      {chTopics.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs font-semibold text-slate-700">Topics Covered</p>
                          <ul className="space-y-1 text-sm text-slate-600">
                            {chTopics.map((tp) => (
                              <li key={tp.id}>
                                <span className="font-mono text-xs text-slate-400 mr-2">
                                  {ch.chapterNumber}.{tp.topicOrder}
                                </span>
                                {tp.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        {chNotes.map((n) => (
                          <Link
                            key={n.id}
                            to={`/notes/${n.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1D4ED8] bg-blue-50/70 hover:bg-blue-50 rounded-lg"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>{n.title}</span>
                          </Link>
                        ))}
                        {chVideos.map((v) => (
                          <Link
                            key={v.id}
                            to={`/videos?videoId=${v.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/70 rounded-lg"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            <span>{v.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {activeChapters.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No chapters have been published under this subject yet.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              No subjects available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
