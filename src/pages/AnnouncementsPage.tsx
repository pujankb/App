import React, { useMemo, useState } from 'react';
import { Bell, Pin } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { formatDateShort } from '../types';

const CATEGORIES = [
  { id: 'all', label: 'All Updates' },
  { id: 'new_notes', label: 'New Notes' },
  { id: 'exam_alert', label: 'Exam Alerts' },
  { id: 'new_course', label: 'New Courses' },
  { id: 'general', label: 'General' },
];

export const AnnouncementsPage: React.FC = () => {
  const { announcements, settings, dataLoading } = usePlatform();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return announcements;
    return announcements.filter((a) => a.category === filter);
  }, [announcements, filter]);

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#0F172A]">Announcements & Notices</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Official updates from {settings.platformName} faculty regarding newly uploaded notes, exam schedules, and new batches.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filter === c.id
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {dataLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <Bell className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="font-display font-semibold text-[#0F172A]">No announcements in this category</p>
          <p className="text-sm text-slate-500">Check back soon for new faculty updates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-4 text-xs text-slate-500 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  {item.isPinned && <Pin className="h-3.5 w-3.5 text-[#1D4ED8]" />}
                  <span>
                    {item.isPinned ? 'Pinned · ' : ''}
                    {item.category.replace('_', ' ')}
                  </span>
                </span>
                <span>{formatDateShort(item.createdAt)}</span>
              </div>
              <h2 className="font-display text-xl font-bold text-[#0F172A]">{item.title}</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
