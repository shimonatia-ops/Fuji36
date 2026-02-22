import { Routes, Route, Navigate } from 'react-router-dom'
import './styles/App.css'
import Layout from './components/layout/Layout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import PatientCareBoardPage from './pages/PatientCareBoardPage'
import TherapistCareBoardPage from './pages/TherapistCareBoardPage'
import ExercisePage from './pages/ExercisePage'
import RoleDashboardPage from './pages/RoleDashboardPage'
import SolutionsPage from './pages/SolutionsPage'
import TaskTemplateDetailPage from './pages/TaskTemplateDetailPage'
import WhoWeServePage from './pages/WhoWeServePage'
import ValuePage from './pages/ValuePage'
import InsightsPage from './pages/InsightsPage'
import AboutPage from './pages/AboutPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<RoleDashboardPage />} />
        <Route path="/patient-care-board" element={<PatientCareBoardPage />} />
        <Route path="/therapist-care-board" element={<TherapistCareBoardPage />} />
        <Route path="/exercise/:taskId" element={<ExercisePage />} />
        <Route path="/solutions" element={<SolutionsPage />} />
        <Route path="/task-template/:templateId" element={<TaskTemplateDetailPage />} />
        <Route path="/who-we-serve" element={<WhoWeServePage />} />
        <Route path="/value" element={<ValuePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
