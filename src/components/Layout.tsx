import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Home,
  PlayCircle,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export const BRAND_LOGO_URL = '/src/assets/images/aspd_brand_emblem_1795284685809.jpg';

export const SafeImage: React.FC<{
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}> = ({ src, alt, className = '', fallbackLabel }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 text-slate-500 ${className}`}
        role="img"
        aria-label={alt}
      >
        <GraduationCap className="h-8 w-8 text-[#1D4ED8]/60 mb-1.5" />
        {fallbackLabel && (
          <span className="text-xs font-medium text-slate-600 px-3 text-center line-clamp-2">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, profile, isAuthenticated, error, refreshData } = usePlatform();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home', end: true },
    { to: '/courses', label: 'Courses', end: false },
    { to: '/notes', label: 'Notes', end: false },
    { to: '/videos', label: 'Videos', end: false },
    { to: '/contact', label: 'Contact', end: false },
  ];

  const mobileTabs = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/courses', label: 'Courses', icon: BookOpen },
    { to: '/notes', label: 'Notes', icon: FileText },
    { to: '/videos', label: 'Lectures', icon: PlayCircle },
    { to: isAuthenticated ? '/profile' : '/login', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Title */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 font-display"
          >
            <img
              src={BRAND_LOGO_URL}
              alt={`${settings.platformName} Emblem`}
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-md object-cover border border-slate-200"
            />
            <span>{settings.platformName}</span>
          </Link>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#0F172A] border-[#1D4ED8] font-semibold'
                      : 'border-transparent hover:text-[#0F172A] hover:border-slate-300'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            {isAuthenticated ? (
              <Link
                to={profile?.role === 'admin' ? '/admin' : '/dashboard'}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {profile?.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4 text-sm text-red-800">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => refreshData()}
              className="text-xs font-semibold underline hover:text-red-950 whitespace-nowrap shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Clean Academic Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 pb-20 md:pb-0">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="inline-flex items-center gap-2.5 font-display text-lg font-bold text-[#0F172A]">
              <img
                src={BRAND_LOGO_URL}
                alt={`${settings.platformName} Emblem`}
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-md object-cover border border-slate-200"
              />
              <span>{settings.platformName}</span>
            </Link>
            <p className="text-sm text-slate-600 leading-relaxed">{settings.tagline}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Learning Hub</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link to="/courses" className="hover:text-[#1D4ED8]">Courses</Link></li>
              <li><Link to="/subjects" className="hover:text-[#1D4ED8]">Subjects & Syllabus</Link></li>
              <li><Link to="/notes" className="hover:text-[#1D4ED8]">Notes & PDF Library</Link></li>
              <li><Link to="/videos" className="hover:text-[#1D4ED8]">Video Lectures</Link></li>
              <li><Link to="/announcements" className="hover:text-[#1D4ED8]">Announcements</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Student Account</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link to="/dashboard" className="hover:text-[#1D4ED8]">Student Dashboard</Link></li>
              <li><Link to="/profile" className="hover:text-[#1D4ED8]">Profile & Bookmarks</Link></li>
              <li><Link to="/contact" className="hover:text-[#1D4ED8]">Contact Owner</Link></li>
              <li>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 hover:text-[#1D4ED8]"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Information</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link to="/about" className="hover:text-[#1D4ED8]">About {settings.platformName}</Link></li>
              <li><Link to="/privacy" className="hover:text-[#1D4ED8]">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#1D4ED8]">Terms & Conditions</Link></li>
              <li>
                <a
                  href="/api/app/download"
                  download="ASPD-Release.apk"
                  className="font-semibold text-[#1D4ED8] hover:underline"
                >
                  Download Our App (Android APK)
                </a>
              </li>
              <li className="pt-1 text-xs text-slate-500">
                Support: {settings.supportHours}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} {settings.platformName}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {profile?.role === 'admin' && (
                <Link to="/admin" className="font-medium text-[#1D4ED8] hover:underline">
                  Open Admin Panel
                </Link>
              )}
              <span>Web & Native Android Study Platform</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Compact Mobile Bottom Navigation Bar (56px height) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white/95 backdrop-blur border-t border-slate-200 grid grid-cols-5"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'text-[#1D4ED8]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate max-w-[64px]">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
