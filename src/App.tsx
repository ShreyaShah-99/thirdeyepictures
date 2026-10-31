import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { ActivityPage } from './pages/ActivityPage'
import { CalendarPage } from './pages/CalendarPage'
import { Dashboard } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HardDriveDetailsPage } from './pages/HardDriveDetailsPage'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ShootDetails } from './pages/ShootDetailsPage'
import { ShootsPage } from './pages/ShootsPage'
import { SignupPage } from './pages/SignupPage'
import { SimpleResourcePage } from './pages/SimpleResourcePage'
import { TasksPage } from './pages/TasksPage'
import { PageLoader } from './Spinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader message="Loading..." />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/**
 * Routes available only to team/admin users. A "viewer" (self-registered, not
 * yet on a team) is redirected to the Dashboard — they get Dashboard-only access.
 */
function TeamRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader message="Loading..." />
  if (!user) return <Navigate to="/login" replace />
  if (user.accessLevel === 'viewer') return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/shoots" element={<TeamRoute><ShootsPage /></TeamRoute>} />
      <Route path="/shoots/:id" element={<TeamRoute><ShootDetails /></TeamRoute>} />
      <Route path="/calendar" element={<TeamRoute><CalendarPage /></TeamRoute>} />
      <Route path="/team" element={<TeamRoute><SimpleResourcePage title="Team" subtitle="Manage photographers, videographers and editors" kind="team" /></TeamRoute>} />
      <Route path="/equipment" element={<TeamRoute><SimpleResourcePage title="Equipment" subtitle="Manage cameras, lenses, lighting and production equipment" kind="equipment" /></TeamRoute>} />
      <Route path="/sd-cards" element={<TeamRoute><SimpleResourcePage title="SD Cards" subtitle="Manage memory cards and assignment history" kind="sd" /></TeamRoute>} />
      <Route path="/hard-drives" element={<TeamRoute><SimpleResourcePage title="Hard Drives" subtitle="Manage storage drives and stored shoot data" kind="hard" /></TeamRoute>} />
      <Route path="/hard-drives/:id" element={<TeamRoute><HardDriveDetailsPage /></TeamRoute>} />
      <Route path="/tasks" element={<TeamRoute><TasksPage /></TeamRoute>} />
      <Route path="/notifications" element={<TeamRoute><NotificationsPage /></TeamRoute>} />
      <Route path="/activity" element={<TeamRoute><ActivityPage /></TeamRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
