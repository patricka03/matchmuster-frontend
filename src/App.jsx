import { Route, Routes } from 'react-router-dom'
import './App.css'

import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import EditProfilePage from './pages/EditProfilePage'
import TeamPage from './pages/TeamPage'
import SquadPage from './pages/SquadPage'
import MatchesPage from './pages/MatchesPage'
import CreateMatchPage from './pages/CreateMatchPage'
import MatchPage from './pages/MatchPage'
import EditMatchPage from './pages/EditMatchPage'
import CancelMatchPage from './pages/CancelMatchPage'
import MatchAvailabilitiesPage from './pages/MatchAvailabilitiesPage'
import SquadSelectionPage from './pages/SquadSelectionPage'
import MatchPaymentsPage from './pages/MatchPaymentsPage'
import NotificationsPage from './pages/NotificationsPage'
import PostsPage from './pages/PostsPage'
import PostPage from './pages/PostPage'
import CreatePostPage from './pages/CreatePostPage'
import EditPostPage from './pages/EditPostPage'
import DeletePostPage from './pages/DeletePostPage'
import SendAvailabilityPage from './pages/SendAvailabilityPage'
import EditAvailabilityPage from './pages/EditAvailabilityPage'
import ConfirmAvailabilityPage from './pages/ConfirmAvailabilityPage'
import JoinPage from './pages/JoinPage'
import CreateTeam from './pages/CreateTeam'
import EditTeamPage from './pages/EditTeamPage'
import HelpPage from './pages/HelpPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DeveloperLoginPage from './pages/DeveloperLoginPage'
import DeveloperDashboardPage from './pages/DeveloperDashboardPage'
import DeveloperProtectedRoute from './components/DeveloperProtectedRoute'


function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/developer/login" element={<DeveloperLoginPage />} />
      <Route path="/developer/dashboard" element={<DeveloperProtectedRoute> <DeveloperDashboardPage /> </DeveloperProtectedRoute>} />

      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/profile/edit" element={<EditProfilePage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/help" element={<HelpPage />} />

      <Route path="/team" element={<TeamPage />} />
      <Route path="/teams/join" element={<JoinPage />} />
      <Route path="/teams/new" element={<CreateTeam />} />
      <Route
        path="/teams/:teamId/edit"
        element={<EditTeamPage />}
      />
      <Route
        path="/teams/:teamId/squad"
        element={<SquadPage />}
      />

      <Route
        path="/teams/:teamId/matches"
        element={<MatchesPage />}
      />
      <Route
        path="/teams/:teamId/matches/new"
        element={<CreateMatchPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId"
        element={<MatchPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId/edit"
        element={<EditMatchPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId/cancel"
        element={<CancelMatchPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId/squad"
        element={<SquadSelectionPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId/payments"
        element={<MatchPaymentsPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId/availabilities"
        element={<MatchAvailabilitiesPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId/availabilities/new"
        element={<SendAvailabilityPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId/availabilities/edit"
        element={<EditAvailabilityPage />}
      />
      <Route
        path="/teams/:teamId/matches/:matchId/availabilities/confirm"
        element={<ConfirmAvailabilityPage />}
      />

      <Route
        path="/teams/:teamId/posts"
        element={<PostsPage />}
      />
      <Route
        path="/teams/:teamId/posts/new"
        element={<CreatePostPage />}
      />
      <Route
        path="/teams/:teamId/posts/:postId"
        element={<PostPage />}
      />
      <Route
        path="/teams/:teamId/posts/:postId/edit"
        element={<EditPostPage />}
      />
      <Route
        path="/teams/:teamId/posts/:postId/delete"
        element={<DeletePostPage />}
      />

      <Route
        path="/users/password/edit"
        element={<ResetPasswordPage />}
      />
      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />
    </Routes>
  )
}

export default App
