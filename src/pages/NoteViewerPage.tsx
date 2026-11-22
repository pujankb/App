import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Printer,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { SafeImage } from '../components/Layout';
import { formatBytes, formatDateShort, NoteItem } from '../types';

export const NoteViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    notes,
    subjects,
    courses,
    chapters,
    bookmarkedNoteIds,
    toggleNoteBookmark,
    isAuthenticated,
    apiFetch,
    syncVersion,
  } = usePlatform();

  const [note, setNote] = useState<NoteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'reader' | 'pdf'>('reader');
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) return;
    const isInitialLoad = !note || String(note.id) !== String(id);
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);
    apiFetch<{ note: NoteItem }>(`/api/notes/${id}`, { cache: 'no-store' })
      .then((res) => {
        if (active) {
          setNote(res.note);
          if (res.note.fileType === 'image' || !res.note.contentBody?.trim()) {
            setViewMode('pdf');
          }
        }
      })
      .catch((err) => {
        if (active) {
          setNote(null);
          setError(err.message || 'Unable to load this study note.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, apiFetch, syncVersion]);

  const handleBookmark = async () => {
    if (!note) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/notes/${note.id}` } });
      return;
    }
    setBookmarkBusy(true);
    try {
      await toggleNoteBookmark(note.id);
    } finally {
      setBookmarkBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-10 space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0F172A]">Note not found</h1>
        <p className="text-sm text-slate-600">{error || 'This study note may have been unpublished or removed.'}</p>
        <Link
          to="/notes"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Notes Library</span>
        </Link>
      </div>
    );
  }

  const subject = subjects.find((s) => s.id === note.subjectId);
  const course = courses.find((c) => c.id === note.courseId);
  const chapter = chapters.find((ch) => ch.id === note.chapterId);
  const isBookmarked = bookmarkedNoteIds.includes(note.id);

  const relatedNotes = notes
    .filter((n) => n.id !== note.id && (n.subjectId === note.subjectId || n.courseId === note.courseId))
    .slice(0, 4);

  const inlineFileUrl = `/api/notes/${note.id}/file?v=${syncVersion}`;
  const downloadFileUrl = `/api/notes/${note.id}/file?download=1&v=${syncVersion}`;

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/notes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0F172A]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Notes Library</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={bookmarkBusy}
            onClick={handleBookmark}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              isBookmarked
                ? 'bg-blue-50 text-[#1D4ED8] border-blue-200'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>

          <a
            href={downloadFileUrl}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Header Metadata Block */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <p className="text-xs text-slate-500 tabular-nums">
          {[course?.title, subject?.name, chapter ? `Ch. ${chapter.chapterNumber}: ${chapter.title}` : null, note.category]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
          {note.title}
        </h1>
        {note.description && (
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">{note.description}</p>
        )}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-500 tabular-nums">
            File: {note.fileName} · {formatBytes(note.fileSizeBytes)} · {note.viewsCount} views ·{' '}
            {note.downloadsCount} downloads · Updated {formatDateShort(note.updatedAt)}
          </p>

          {/* Interactive Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('reader')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'reader'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Study Reader</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pdf')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'pdf'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{note.fileType === 'image' ? 'Image View' : 'PDF Document'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewer + Related Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {viewMode === 'reader' ? (
            <div className="p-6 sm:p-8 space-y-5">
              {note.contentBody?.trim() ? (
                <div className="space-y-4">
                  {note.contentBody.split(/\n\n+/).map((block, idx) => {
                    const lines = block.split('\n');
                    const firstLine = lines[0] || '';
                    const isSectionHeading = /^\d+\.\s+/.test(firstLine.trim());
                    if (isSectionHeading) {
                      return (
                        <div key={idx} className="space-y-2 pt-2 first:pt-0">
                          <h2 className="font-display text-lg font-bold text-[#0F172A]">
                            {firstLine}
                          </h2>
                          {lines.slice(1).map((line, lIdx) => {
                            const isFormula = line.startsWith('  ');
                            return (
                              <p
                                key={lIdx}
                                className={
                                  isFormula
                                    ? 'font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-[#0F172A] overflow-x-auto'
                                    : 'text-sm sm:text-base text-slate-700 leading-relaxed'
                                }
                              >
                                {line.trim()}
                              </p>
                            );
                          })}
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                        {block}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <p className="text-sm text-slate-600">
                    This resource is stored as an attached file. Switch to the Document View or download it directly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('pdf')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] rounded-lg cursor-pointer"
                  >
                    Open Document View
                  </button>
                </div>
              )}
            </div>
          ) : note.fileType === 'image' && note.fileUrl ? (
            <div className="p-6 bg-slate-50 flex flex-col items-center">
              <SafeImage
                src={note.fileUrl}
                alt={note.title}
                className="max-h-[720px] w-auto rounded-lg border border-slate-200"
                fallbackLabel={note.title}
              />
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="font-mono truncate">{note.fileName}</span>
                <a
                  href={inlineFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:underline shrink-0 ml-3"
                >
                  <span>Open Full Screen</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <iframe
                src={inlineFileUrl}
                title={note.title}
                className="w-full h-[680px] bg-slate-100"
              />
            </div>
          )}
        </div>

        {/* Related Materials */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-[#0F172A]">
              Related Study Materials
            </h2>
            {relatedNotes.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {relatedNotes.map((rel) => (
                  <li key={rel.id} className="py-3 first:pt-1 last:pb-0">
                    <Link
                      to={`/notes/${rel.id}`}
                      className="text-sm font-semibold text-[#0F172A] hover:text-[#1D4ED8] line-clamp-2"
                    >
                      {rel.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      {rel.category} · {rel.downloadsCount} downloads
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No additional notes linked to this subject yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
