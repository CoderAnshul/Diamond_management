import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout & Pages
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LockerEntryFlow from './pages/LockerEntryFlow';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import CustomerRegister from './pages/CustomerRegister';
import LockerList from './pages/LockerList';
import Reports from './pages/Reports';
import StaffManagement from './pages/StaffManagement';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient();

// Security Guards
const ProtectedRoute = ({ children, permission }) => {
  const { user, loading, hasPermission } = useAuth();
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const OwnerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'owner') return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Endpoint */}
              <Route path="/login" element={<Login />} />

              {/* Secure Dashboard Shell */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route
                  path="entry"
                  element={
                    <ProtectedRoute permission="canCreateLockerEntry">
                      <LockerEntryFlow />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="customers"
                  element={
                    <ProtectedRoute permission="canRegisterCustomer">
                      <CustomerList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="customers/:id"
                  element={
                    <ProtectedRoute>
                      <CustomerDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="customers/new"
                  element={
                    <ProtectedRoute permission="canRegisterCustomer">
                      <CustomerRegister />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="customers/edit/:id"
                  element={
                    <ProtectedRoute permission="canEditCustomer">
                      <CustomerRegister />
                    </ProtectedRoute>
                  }
                />
                <Route path="lockers" element={<LockerList />} />
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute permission="canViewReports">
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="staff"
                  element={
                    <OwnerRoute>
                      <StaffManagement />
                    </OwnerRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <OwnerRoute>
                      <SettingsPage />
                    </OwnerRoute>
                  }
                />
              </Route>

              {/* Wildcard Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#18181b',
                color: '#fafafa',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                fontSize: '13px'
              }
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
