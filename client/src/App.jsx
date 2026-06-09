import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import OrgLogin from './pages/OrgLogin'
import Register from './pages/Register'
import Setup from './pages/Setup'
import NoAccess from './pages/NoAccess'
import NotFound from './pages/NotFound'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Display from './pages/Display'
import DisplayMobileSetup from './pages/DisplayMobileSetup'
import Docs from './pages/Docs'
import Landing from './pages/Landing'

import Dashboard from './pages/Admin/Dashboard'
import Locations from './pages/Admin/Locations'
import Templates from './pages/Admin/Templates'
import People from './pages/Admin/People'
import Labels from './pages/Admin/Labels'
import Automation from './pages/Admin/Automation'
import Screens from './pages/Admin/Screens'
import Schedules from './pages/Admin/Schedules'
import Users from './pages/Admin/Users'
import Integrations from './pages/Admin/Integrations'
import Profile from './pages/Admin/Profile'
import Organization from './pages/Admin/Organization'

function AdminRoute({ children }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/org" element={<OrgLogin />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/display" element={<Display />} />
        <Route path="/display/setup" element={<DisplayMobileSetup />} />
        <Route path="/display/:token" element={<Display />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/no-access" element={<ProtectedRoute><NoAccess /></ProtectedRoute>} />

        {/* Admin panel — all require auth; Organization/Users/Integrations require admin role */}
        <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
        <Route path="/admin/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
        <Route path="/admin/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
        <Route path="/admin/labels" element={<ProtectedRoute><Labels /></ProtectedRoute>} />
        <Route path="/admin/automation" element={<ProtectedRoute><Automation /></ProtectedRoute>} />
        <Route path="/admin/screens" element={<ProtectedRoute><Screens /></ProtectedRoute>} />
        <Route path="/admin/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
        <Route path="/admin/organization" element={<AdminRoute><Organization /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="/admin/integrations" element={<AdminRoute><Integrations /></AdminRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="/" element={<Landing />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
