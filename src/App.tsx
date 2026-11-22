import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PlatformProvider } from './context/PlatformContext';
import { AppLayout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage, SubjectsPage } from './pages/CoursesAndSubjectsPages';
import { NotesPage } from './pages/NotesPage';
import { NoteViewerPage } from './pages/NoteViewerPage';
import { VideosPage } from './pages/VideosPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { ContactPage } from './pages/ContactPage';
import { ProfilePage } from './pages/ProfilePage';
import { AboutPage, NotFoundPage, PrivacyPolicyPage, TermsPage } from './pages/StaticPages';
import { AdminPage } from './pages/AdminPage';

const StudentShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppLayout>{children}</AppLayout>
);

export default function App() {
  return (
    <PlatformProvider>
      <BrowserRouter>
        <Routes>
          {/* Separate Protected Admin Portal */}
          <Route path="/admin/*" element={<AdminPage />} />

          {/* Student Web Application Routes */}
          <Route
            path="/"
            element={
              <StudentShell>
                <HomePage />
              </StudentShell>
            }
          />
          <Route
            path="/login"
            element={
              <StudentShell>
                <AuthPage mode="login" />
              </StudentShell>
            }
          />
          <Route
            path="/register"
            element={
              <StudentShell>
                <AuthPage mode="register" />
              </StudentShell>
            }
          />
          <Route
            path="/dashboard"
            element={
              <StudentShell>
                <DashboardPage />
              </StudentShell>
            }
          />
          <Route
            path="/courses"
            element={
              <StudentShell>
                <CoursesPage />
              </StudentShell>
            }
          />
          <Route
            path="/subjects"
            element={
              <StudentShell>
                <SubjectsPage />
              </StudentShell>
            }
          />
          <Route
            path="/notes"
            element={
              <StudentShell>
                <NotesPage />
              </StudentShell>
            }
          />
          <Route
            path="/notes/:id"
            element={
              <StudentShell>
                <NoteViewerPage />
              </StudentShell>
            }
          />
          <Route
            path="/videos"
            element={
              <StudentShell>
                <VideosPage />
              </StudentShell>
            }
          />
          <Route
            path="/announcements"
            element={
              <StudentShell>
                <AnnouncementsPage />
              </StudentShell>
            }
          />
          <Route
            path="/contact"
            element={
              <StudentShell>
                <ContactPage />
              </StudentShell>
            }
          />
          <Route
            path="/profile"
            element={
              <StudentShell>
                <ProfilePage />
              </StudentShell>
            }
          />
          <Route
            path="/about"
            element={
              <StudentShell>
                <AboutPage />
              </StudentShell>
            }
          />
          <Route
            path="/privacy"
            element={
              <StudentShell>
                <PrivacyPolicyPage />
              </StudentShell>
            }
          />
          <Route
            path="/terms"
            element={
              <StudentShell>
                <TermsPage />
              </StudentShell>
            }
          />
          <Route
            path="*"
            element={
              <StudentShell>
                <NotFoundPage />
              </StudentShell>
            }
          />
        </Routes>
      </BrowserRouter>
    </PlatformProvider>
  );
}
