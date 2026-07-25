import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/pages/Dashboard';
import Clinics from '@/pages/Clinics';
import Therapists from '@/pages/Therapists';
import Patients from '@/pages/Patients';
import PatientDetail from '@/pages/PatientDetail';
import Videos from '@/pages/Videos';
import Games from '@/pages/Games';
import Taxonomy from '@/pages/Taxonomy';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import BlockCrasher from '@/pages/BlockCrasher';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // The standalone Block Crasher game is playable without admin login
  // (it receives patientId + callbackUrl via URL params), so bypass the auth gate.
  if (location.pathname.startsWith('/block-crasher')) {
    return (
      <Routes>
        <Route path="/block-crasher" element={<BlockCrasher />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clinics" element={<Clinics />} />
          <Route path="/therapists" element={<Therapists />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/games" element={<Games />} />
          <Route path="/taxonomy" element={<Taxonomy />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="/block-crasher" element={<BlockCrasher />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App