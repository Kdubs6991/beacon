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
import Contact from './pages/Contact'

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

import SiteAdmin, { SiteAdminDocs, SiteAdminLanding, SiteAdminPages, SiteAdminPageEditor } from './pages/SiteAdmin/SiteAdmin'
import SitePage from './pages/SitePage'

function StudioRoute({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function AdminOnlyRoute({ children }) {
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

        {/* Beacon Studio — all require auth; Organization/Users/Integrations require admin role */}
        <Route path="/studio" element={<StudioRoute><Dashboard /></StudioRoute>} />
        <Route path="/studio/locations" element={<StudioRoute><Locations /></StudioRoute>} />
        <Route path="/studio/templates" element={<StudioRoute><Templates /></StudioRoute>} />
        <Route path="/studio/people" element={<StudioRoute><People /></StudioRoute>} />
        <Route path="/studio/labels" element={<StudioRoute><Labels /></StudioRoute>} />
        <Route path="/studio/automation" element={<StudioRoute><Automation /></StudioRoute>} />
        <Route path="/studio/screens" element={<StudioRoute><Screens /></StudioRoute>} />
        <Route path="/studio/schedules" element={<StudioRoute><Schedules /></StudioRoute>} />
        <Route path="/studio/organization" element={<AdminOnlyRoute><Organization /></AdminOnlyRoute>} />
        <Route path="/studio/users" element={<AdminOnlyRoute><Users /></AdminOnlyRoute>} />
        <Route path="/studio/integrations" element={<AdminOnlyRoute><Integrations /></AdminOnlyRoute>} />
        <Route path="/studio/profile" element={<StudioRoute><Profile /></StudioRoute>} />

        {/* Site Admin — website content management, uses its own password auth */}
        <Route path="/admin" element={<SiteAdmin />} />
        <Route path="/admin/docs" element={<SiteAdminDocs />} />
        <Route path="/admin/landing" element={<SiteAdminLanding />} />
        <Route path="/admin/pages" element={<SiteAdminPages />} />
        <Route path="/admin/pages/:slug" element={<SiteAdminPageEditor />} />

        <Route path="/" element={<Landing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/:slug" element={<SitePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
