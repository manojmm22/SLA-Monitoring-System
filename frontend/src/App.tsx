import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import Layout from './components/layout/Layout'
import LoadingScreen from './components/common/LoadingScreen'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Services = lazy(() => import('./pages/Services'))
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring'))
const Agents = lazy(() => import('./pages/Agents'))
const Alerts = lazy(() => import('./pages/Alerts'))
const Reports = lazy(() => import('./pages/Reports'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Users = lazy(() => import('./pages/Users'))
const Settings = lazy(() => import('./pages/Settings'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Predictions = lazy(() => import('./pages/Predictions'))
const Recovery = lazy(() => import('./pages/Recovery'))
const ProtectedRoute = lazy(() => import('./components/common/ProtectedRoute'))

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/services" element={<Services />} />
              <Route path="/monitoring" element={<LiveMonitoring />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/recovery" element={<Recovery />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Box>
  )
}

export default App
