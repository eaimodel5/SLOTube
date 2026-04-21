import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import TeacherHome from './pages/teacher/TeacherHome';
import GoalBrowser from './pages/teacher/GoalBrowser';
import GoalDetail from './pages/teacher/GoalDetail';
import VideoDetail from './pages/teacher/VideoDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReview from './pages/admin/AdminReview';

// Simple Router Guard
function RoleGuard({ requiredRole, children }: { requiredRole: string, children: React.ReactNode }) {
  const { role } = useAuth();
  if (role !== requiredRole) {
    return <Navigate to={`/${role === 'admin' ? 'admin' : 'teacher'}`} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/teacher" replace />} />
          <Route element={<Layout />}>
            {/* Teacher Routes */}
            <Route path="/teacher" element={
              <RoleGuard requiredRole="docent">
                <TeacherHome />
              </RoleGuard>
            } />
            <Route path="/teacher/goals" element={
              <RoleGuard requiredRole="docent">
                <GoalBrowser />
              </RoleGuard>
            } />
            <Route path="/teacher/goals/:id" element={
              <RoleGuard requiredRole="docent">
                <GoalDetail />
              </RoleGuard>
            } />
            <Route path="/teacher/videos/:id" element={
              <RoleGuard requiredRole="docent">
                <VideoDetail />
              </RoleGuard>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <RoleGuard requiredRole="admin">
                <AdminDashboard />
              </RoleGuard>
            } />
            <Route path="/admin/review" element={
              <RoleGuard requiredRole="admin">
                <AdminReview />
              </RoleGuard>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
