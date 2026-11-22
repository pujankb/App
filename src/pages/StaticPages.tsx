import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, ShieldCheck, Smartphone } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export const AboutPage: React.FC = () => {
  const { settings } = usePlatform();
  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A]">
          About {settings.platformName}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
          {settings.tagline} Built for distraction-free revision, structured course progression, and instant cross-platform access across web and Android.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <FileText className="h-5 w-5 text-[#1D4ED8]" />
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Curated PDF Study Library</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every chapter pairs structured formula sheets, lecture notes, and daily practice problem sets (DPPs) readable online or downloadable for offline exam prep.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <BookOpen className="h-5 w-5 text-[#1D4ED8]" />
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Syllabus-First Architecture</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Content is organized cleanly from Course to Subject, Chapter, and Topic so students never lose track of where a derivation or video lecture belongs.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <Smartphone className="h-5 w-5 text-[#1D4ED8]" />
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Shared Web & Android Backend</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Study materials, announcements, and courses published by administrators synchronize immediately to both the responsive website and native Kotlin Android app.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <ShieldCheck className="h-5 w-5 text-[#1D4ED8]" />
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Direct Academic Accountability</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Reach {settings.ownerName} directly via the Contact Owner form, email, or WhatsApp during support hours ({settings.supportHours}).
          </p>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPolicyPage: React.FC = () => {
  const { settings } = usePlatform();
  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-10 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#0F172A]">Privacy Policy</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-1.5">
          <h2 className="font-display text-base font-bold text-[#0F172A]">1. Information We Collect</h2>
          <p>
            When you sign in to {settings.platformName}, we store your account identifier, name, email address, and optional academic profile fields (such as target exam and phone number) in our PostgreSQL database. We also record your bookmarked notes, downloaded files, video watch progress, and contact form submissions so your study workspace stays synchronized.
          </p>
        </section>
        <section className="space-y-1.5">
          <h2 className="font-display text-base font-bold text-[#0F172A]">2. How Information Is Used</h2>
          <p>
            Your data is used strictly to deliver educational materials, persist bookmarks and lecture checkpoints, deliver official announcements, and respond to support requests submitted via Contact Owner. We never sell student information to third parties.
          </p>
        </section>
        <section className="space-y-1.5">
          <h2 className="font-display text-base font-bold text-[#0F172A]">3. Data Security & Role Isolation</h2>
          <p>
            All protected endpoints verify authenticated tokens on the server. Administrative routes require explicit role verification, and service credentials are never exposed in client-side code.
          </p>
        </section>
        <section className="space-y-1.5">
          <h2 className="font-display text-base font-bold text-[#0F172A]">4. Contact & Account Deletion</h2>
          <p>
            To request profile updates or deletion of your stored records, email {settings.ownerEmail} or submit a request via the Contact Owner page.
          </p>
        </section>
      </div>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  const { settings } = usePlatform();
  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-10 space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#0F172A]">Terms & Conditions</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-1.5">
          <h2 className="font-display text-base font-bold text-[#0F172A]">1. Academic Usage License</h2>
          <p>
            All PDF notes, formula sheets, practice problem sets, and video lectures published on {settings.platformName} are licensed exclusively for personal, non-commercial academic study. Redistributing or reselling study content without written authorization is prohibited.
          </p>
        </section>
        <section className="space-y-1.5">
          <h2 className="font-display text-base font-bold text-[#0F172A]">2. Student Conduct</h2>
          <p>
            Users must provide accurate information when contacting faculty and must not attempt to bypass authentication, probe administrative endpoints, or upload unauthorized files. Administrators may suspend accounts that violate platform rules.
          </p>
        </section>
        <section className="space-y-1.5">
          <h2 className="font-display text-base font-bold text-[#0F172A]">3. Content Updates</h2>
          <p>
            Course syllabi, study sheets, and schedules may be updated periodically by {settings.ownerName} to stay aligned with current examination patterns.
          </p>
        </section>
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => (
  <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
    <p className="font-mono text-sm font-semibold text-[#1D4ED8]">404</p>
    <h1 className="font-display text-3xl font-bold text-[#0F172A]">Page not found</h1>
    <p className="text-sm text-slate-600">
      The study note, course, or page you requested does not exist or may have moved.
    </p>
    <div className="pt-2 flex items-center justify-center gap-3">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return Home</span>
      </Link>
      <Link
        to="/notes"
        className="px-4 py-2.5 text-sm font-semibold text-[#0F172A] border border-slate-300 hover:bg-slate-50 rounded-lg"
      >
        Browse Notes
      </Link>
    </div>
  </div>
);
