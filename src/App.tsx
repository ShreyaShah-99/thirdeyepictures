import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { ActivityPage } from './pages/ActivityPage'
import { CalendarPage } from './pages/CalendarPage'
import { Dashboard } from './pages/DashboardPage'
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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/shoots" element={<ProtectedRoute><ShootsPage /></ProtectedRoute>} />
      <Route path="/shoots/:id" element={<ProtectedRoute><ShootDetails /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><SimpleResourcePage title="Team" subtitle="Manage photographers, videographers and editors" kind="team" /></ProtectedRoute>} />
      <Route path="/equipment" element={<ProtectedRoute><SimpleResourcePage title="Equipment" subtitle="Manage cameras, lenses, lighting and production equipment" kind="equipment" /></ProtectedRoute>} />
      <Route path="/sd-cards" element={<ProtectedRoute><SimpleResourcePage title="SD Cards" subtitle="Manage memory cards and assignment history" kind="sd" /></ProtectedRoute>} />
      <Route path="/hard-drives" element={<ProtectedRoute><SimpleResourcePage title="Hard Drives" subtitle="Manage storage drives and stored shoot data" kind="hard" /></ProtectedRoute>} />
      <Route path="/hard-drives/:id" element={<ProtectedRoute><HardDriveDetailsPage /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
