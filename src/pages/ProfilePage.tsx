import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  CheckCircle2,
  Download,
  LogOut,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { formatDateShort, UserLibrary } from '../types';

type ProfileTab = 'profile' | 'bookmarks' | 'downloads' | 'notifications';

export const ProfilePage: React.FC = () => {
  const {
    isAuthenticated,
    profile,
    settings,
    notifications,
    signOut,
    refreshData,
    apiFetch,
    syncVersion,
  } = usePlatform();
  const navigate = useNavigate();

  const [tab, setTab] = useState<ProfileTab>('profile');
  const [library, setLibrary] = useState<UserLibrary | null>(null);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [gradeTarget, setGradeTarget] = useState(profile?.gradeTarget || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setGradeTarget(profile.gradeTarget || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) return;
    setLoading((prev) => (library ? prev : true));
    apiFetch('/api/me', { cache: 'no-store' })
      .then((res) => {
        if (active) setLibrary(res.library || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, apiFetch, syncVersion]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <UserIcon className="h-10 w-10 text-slate-400 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#0F172A]">Sign in to view your profile</h1>
        <p className="text-sm text-slate-600">
          Manage your student profile, bookmarked study notes, download history, and notifications.
        </p>
        <Link
          to="/login"
          className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveNotice(null);
    try {
      await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, phone, gradeTarget, bio }),
      });
      await refreshData();
      setSaveNotice('Profile updated successfully.');
    } catch (err: any) {
      setSaveNotice(err.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-bold text-lg text-[#0F172A]">
              {(profile?.fullName || 'S').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-[#0F172A]">
              {profile?.fullName || `${settings.platformName} Scholar`}
            </h1>
            <p className="text-xs text-slate-500">
              {profile?.email} · Role: {profile?.role || 'student'} · Joined{' '}
              {formatDateShort(profile?.createdAt || '')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {profile?.role === 'admin' && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg whitespace-nowrap"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Dashboard</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {(
          [
            { id: 'profile', label: 'Profile Settings', icon: UserIcon },
            { id: 'bookmarks', label: `Bookmarks (${library?.bookmarks.length ?? 0})`, icon: Bookmark },
            { id: 'downloads', label: `Downloads (${library?.downloads.length ?? 0})`, icon: Download },
            { id: 'notifications', label: `Notifications (${notifications.length})`, icon: Bell },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === item.id
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-2xl"
        >
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Edit Student Profile</h2>

          {saveNotice && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{saveNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Exam / Class
            </label>
            <input
              type="text"
              value={gradeTarget}
              onChange={(e) => setGradeTarget(e.target.value)}
              placeholder="e.g. JEE Main 2027 / NEET UG / Class 12 PCM"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Study Goals / Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write your academic focus areas..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 rounded-lg cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </form>
      )}

      {tab === 'bookmarks' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading bookmarks...</div>
          ) : library && library.bookmarks.length > 0 ? (
            library.bookmarks.map((note) => (
              <div key={note.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {note.category} · Saved {formatDateShort(note.bookmarkedAt)}
                  </p>
                  <Link
                    to={`/notes/${note.id}`}
                    className="font-display text-base font-semibold text-[#0F172A] hover:text-[#1D4ED8]"
                  >
                    {note.title}
                  </Link>
                </div>
                <a
                  href={`/api/notes/${note.id}/file?download=1`}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg whitespace-nowrap"
                >
                  Download PDF
                </a>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-slate-500">
              You have not bookmarked any study notes yet.
            </div>
          )}
        </div>
      )}

      {tab === 'downloads' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading download history...</div>
          ) : library && library.downloads.length > 0 ? (
            library.downloads.map((note, idx) => (
              <div key={`${note.id}-${idx}`} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {note.fileName} · Downloaded {formatDateShort(note.downloadedAt)}
                  </p>
                  <Link
                    to={`/notes/${note.id}`}
                    className="font-display text-base font-semibold text-[#0F172A] hover:text-[#1D4ED8]"
                  >
                    {note.title}
                  </Link>
                </div>
                <a
                  href={`/api/notes/${note.id}/file?download=1`}
                  className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap"
                >
                  Download Again
                </a>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-slate-500">
              No downloaded notes recorded yet. Download any PDF from the Notes library to access it here.
            </div>
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={n.linkUrl || '/announcements'}
                className="block p-4 sm:p-5 hover:bg-slate-50 transition-colors"
              >
                <p className="text-xs text-slate-500 tabular-nums">
                  {n.type} · {formatDateShort(n.createdAt)}
                </p>
                <p className="mt-0.5 font-display text-sm font-semibold text-[#0F172A]">{n.title}</p>
                <p className="mt-1 text-xs text-slate-600">{n.message}</p>
              </Link>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-slate-500">
              You are all caught up. No new notifications.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
