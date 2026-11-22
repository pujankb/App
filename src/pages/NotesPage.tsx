import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, Download, FileText, Search } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { formatBytes, formatDateShort } from '../types';

const NOTE_CATEGORIES = ['All', 'Lecture Notes', 'Formula Sheet', 'DPP', 'Revision Guide', 'Diagram'];

export const NotesPage: React.FC = () => {
  const {
    notes,
    subjects,
    courses,
    chapters,
    bookmarkedNoteIds,
    toggleNoteBookmark,
    isAuthenticated,
    dataLoading,
  } = usePlatform();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subjectId') || 'all');
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('courseId') || 'all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'downloads' | 'views'>('newest');
  const [bookmarkBusyId, setBookmarkBusyId] = useState<number | null>(null);

  useEffect(() => {
    const qParam = searchParams.get('q');
    const subParam = searchParams.get('subjectId');
    const courseParam = searchParams.get('courseId');
    if (qParam !== null) setSearch(qParam);
    if (subParam !== null) setSelectedSubject(subParam || 'all');
    if (courseParam !== null) setSelectedCourse(courseParam || 'all');
  }, [searchParams]);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const chapterMap = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = notes.filter((n) => {
      if (selectedSubject !== 'all' && String(n.subjectId) !== selectedSubject) return false;
      if (selectedCourse !== 'all' && String(n.courseId) !== selectedCourse) return false;
      if (selectedCategory !== 'All' && n.category !== selectedCategory) return false;
      if (q) {
        const subName = n.subjectId ? subjectMap.get(n.subjectId)?.name.toLowerCase() || '' : '';
        return (
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q) ||
          subName.includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'downloads') return (b.downloadsCount || 0) - (a.downloadsCount || 0);
      if (sortBy === 'views') return (b.viewsCount || 0) - (a.viewsCount || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, search, selectedSubject, selectedCourse, selectedCategory, sortBy, subjectMap]);

  const handleBookmarkClick = async (noteId: number) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/notes' } });
      return;
    }
    setBookmarkBusyId(noteId);
    try {
      await toggleNoteBookmark(noteId);
    } finally {
      setBookmarkBusyId(null);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedSubject('all');
    setSelectedCourse('all');
    setSelectedCategory('All');
    setSearchParams({});
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0F172A]">Notes & Study Materials</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Search, filter by subject or category, read in-app, bookmark for revision, and download PDFs.
          </p>
        </div>
        <p className="text-xs text-slate-500 tabular-nums">
          Showing {filteredNotes.length} of {notes.length} study documents
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes, formulas, topics..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by Subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#1D4ED8]"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter by Course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#1D4ED8]"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Sort Notes"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'downloads' | 'views')}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#1D4ED8]"
            >
              <option value="newest">Sort: Newest</option>
              <option value="downloads">Sort: Most Downloaded</option>
              <option value="views">Sort: Most Viewed</option>
            </select>
          </div>
        </div>

        {/* Category Interactive Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {NOTE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {(search || selectedSubject !== 'all' || selectedCourse !== 'all' || selectedCategory !== 'All') && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Notes Grid */}
      {dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <FileText className="h-9 w-9 text-slate-400 mx-auto" />
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">No matching notes found</h2>
          <p className="text-sm text-slate-500">
            Adjust your subject, category, or search filter to explore available materials.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
          >
            Show All Notes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const sub = note.subjectId ? subjectMap.get(note.subjectId) : null;
            const ch = note.chapterId ? chapterMap.get(note.chapterId) : null;
            const isBookmarked = bookmarkedNoteIds.includes(note.id);
            return (
              <article
                key={note.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-slate-500 tabular-nums">
                      {sub?.name || 'General'} · {note.category} · {note.fileType.toUpperCase()}
                    </p>
                    <button
                      type="button"
                      disabled={bookmarkBusyId === note.id}
                      onClick={() => handleBookmarkClick(note.id)}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark note'}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isBookmarked
                          ? 'text-[#1D4ED8] bg-blue-50 border-blue-200'
                          : 'text-slate-400 border-slate-200 hover:text-slate-700'
                      }`}
                    >
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <Link
                    to={`/notes/${note.id}`}
                    className="mt-1.5 block font-display text-lg font-semibold text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
                  >
                    {note.title}
                  </Link>

                  {ch && (
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Chapter {ch.chapterNumber}: {ch.title}
                    </p>
                  )}

                  <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {note.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 tabular-nums">
                    {formatBytes(note.fileSizeBytes)} · {note.downloadsCount} downloads ·{' '}
                    {formatDateShort(note.createdAt)}
                  </p>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/notes/${note.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Read Note</span>
                    </Link>
                    <a
                      href={`/api/notes/${note.id}/file?download=1`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
