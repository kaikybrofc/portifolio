import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import AboutSection from '@/components/AboutSection';
import ProjectsSection from '@/components/ProjectsSection';
import GitHubActivitySection from '@/components/GitHubActivitySection';
import SkillsSection from '@/components/SkillsSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import { useVisitors } from '@/hooks/useVisitors';
import { AuthProvider } from '@/contexts/AuthContext';

// Lazy load blog pages to reduce initial bundle size.
const BlogListPage = lazy(() => import('@/pages/BlogListPage'));
const BlogPostDetailPage = lazy(() => import('@/pages/BlogPostDetailPage'));
const BlogPostEditor = lazy(() => import('@/pages/BlogPostEditor'));

// Component to handle tracking and hash routing on mount
const HomePage = () => {
  useVisitors('home');
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <>
      <main>
        <Hero />
        <AboutSection />
        <ProjectsSection />
        <GitHubActivitySection />
        <SkillsSection />
        {/* BlogSection inside home was replaced by the separate Blog routing */}
        <ContactSection />
      </main>
    </>
  );
};

function App() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-950 text-white">
          <Header />

          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />

              {/* Blog Routes */}
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/:id" element={<BlogPostDetailPage />} />

              {/* Editor Routes (Protected) */}
              <Route
                path="/blog/editor"
                element={
                  <ProtectedRoute>
                    <BlogPostEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blog/:id/edit"
                element={
                  <ProtectedRoute>
                    <BlogPostEditor />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>

          <Footer />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

const RouteLoadingFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
  </div>
);

export default App;
