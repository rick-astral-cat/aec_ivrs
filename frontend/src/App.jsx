import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import AgenciesPage from './pages/AgenciesPage'
import AgencyDetailPage from './pages/AgencyDetailPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública de Login y MFA */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas con AppLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AgenciesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/agencies/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AgencyDetailPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Migración TEAMS */}
          <Route
            path="/teams-migration"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ProjectsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/teams-migration/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ProjectDetailPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
