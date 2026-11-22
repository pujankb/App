import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Mail, MessageCircle, Send } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export const ContactPage: React.FC = () => {
  const { settings, profile, apiFetch } = usePlatform();

  const [studentName, setStudentName] = useState(profile?.fullName || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setStudentName((prev) => prev || profile.fullName);
      setEmail((prev) => prev || profile.email);
      setPhone((prev) => prev || profile.phone);
    }
  }, [profile]);

  const cleanWhatsapp = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `Hello ${settings.ownerName}, I have a question regarding ${settings.platformName}.`
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ studentName, email, phone, subject, message }),
      });
      setSubmitted(true);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Unable to send your message. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#0F172A]">Contact Owner</h1>
        <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
          Send a direct inquiry to {settings.ownerName}. Every submitted message is stored securely and reviewed in the {settings.platformName} Admin Dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                Message delivered to {settings.ownerName}
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Thank you for reaching out. Your message has been recorded in our academic support desk and our team will respond using your email or phone contact.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0F172A]">
                Direct Message Form
              </h2>

              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Student Name *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    minLength={2}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Subject *
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    minLength={3}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Request for Optics DPP solutions"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  required
                  minLength={10}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your academic query, study note request, or technical issue..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'Sending Message...' : 'Submit Message'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Direct Configurable Contact Options */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0F172A]">Direct Channels</h2>
              <p className="mt-1 text-sm text-slate-600">
                Prefer instant messaging or email? Reach {settings.ownerName} directly using the verified channels below.
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between gap-3 p-3.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-emerald-700 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">WhatsApp Academic Desk</p>
                    <p className="text-xs text-slate-500 font-mono">{settings.whatsappNumber}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-700">Chat</span>
              </a>

              <a
                href={`mailto:${settings.ownerEmail}`}
                className="w-full flex items-center justify-between gap-3 p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#1D4ED8] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Official Email</p>
                    <p className="text-xs text-slate-500">{settings.ownerEmail}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#1D4ED8]">Email</span>
              </a>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Support Hours: {settings.supportHours}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
