import SupportPage from './pages/SupportPage'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import './App.css'
import './App.mobile.css'

import AppUrlListener from './components/AppUrlListener'
import PushNotificationManager from './components/PushNotificationManager'
import NetworkStatusBanner from './components/NetworkStatusBanner'
import NotificationPermissionPrompt from './components/NotificationPermissionPrompt'

import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import EditProfilePage from './pages/EditProfilePage'
import TeamPage from './pages/TeamPage'
import SquadPage from './pages/SquadPage'
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
import LegalHubPage from './pages/legal/LegalHubPage'
import LegalPage from './pages/legal/LegalPage'
import MatchRatingsPage from './pages/MatchRatingsPage'
import TeamAwardsPage from './pages/TeamAwardsPage'
import MatchPlayerStatsPage from './pages/MatchPlayerStatsPage'
import TrainingsPage from './pages/TrainingsPage'
import TrainingPage from './pages/TrainingPage'
import CreateTrainingPage from './pages/CreateTrainingPage'
import EditTrainingPage from './pages/EditTrainingPage'
import SchedulePage from './pages/SchedulePage'
import SubscriptionPage from './pages/SubscriptionPage'
import DeveloperLaunchClubsPage from './pages/DeveloperLaunchClubsPage'

function App() {
  return (
    <>
      <AppUrlListener />
      <PushNotificationManager />
      <NetworkStatusBanner />
      <NotificationPermissionPrompt />
      <Routes>
        <Route
          path="/"
          element={<WelcomePage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/signup"
          element={<SignupPage />}
        />

        <Route
          path="/developer/login"
          element={<DeveloperLoginPage />}
        />

        <Route
          path="/developer/dashboard"
          element={
            <DeveloperProtectedRoute>
              <DeveloperDashboardPage />
            </DeveloperProtectedRoute>
          }
        />

        <Route
          path="/developer/launch-clubs"
          element={
            <DeveloperProtectedRoute>
              <DeveloperLaunchClubsPage />
            </DeveloperProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/profile/edit"
          element={<EditProfilePage />}
        />

        <Route
          path="/notifications"
          element={<NotificationsPage />}
        />

        <Route
          path="/help"
          element={<HelpPage />}
        />

        <Route path="/support" element={<SupportPage />} />

        <Route
          path="/legal"
          element={<LegalHubPage />}
        />

        <Route
          path="/legal/:document"
          element={<LegalPage />}
        />

        <Route
          path="/team"
          element={<TeamPage />}
        />

        <Route
          path="/teams/join"
          element={<JoinPage />}
        />

        <Route
          path="/teams/new"
          element={<CreateTeam />}
        />

        <Route
          path="/teams/:teamId/edit"
          element={<EditTeamPage />}
        />

        <Route
          path="/teams/:teamId/subscription"
          element={<SubscriptionPage />}
        />

        <Route
          path="/teams/:teamId/squad"
          element={<SquadPage />}
        />

        <Route
          path="/teams/:teamId/matches"
          element={
            <Navigate
              to="../schedule"
              relative="path"
              replace
            />
          }
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
          path="/teams/:teamId/matches/:matchId/stats"
          element={<MatchPlayerStatsPage />}
        />

        <Route
          path="/teams/:teamId/matches/:matchId/ratings"
          element={<MatchRatingsPage />}
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

        <Route
          path="/teams/:teamId/awards"
          element={<TeamAwardsPage />}
        />

        <Route
          path="/teams/:teamId/trainings"
          element={<TrainingsPage />}
        />

        <Route
          path="/teams/:teamId/trainings/:trainingId"
          element={<TrainingPage />}
        />

        <Route
          path="/teams/:teamId/trainings/new"
          element={<CreateTrainingPage />}
        />

        <Route
          path="/teams/:teamId/trainings/:trainingId/edit"
          element={<EditTrainingPage />}
        />

        <Route
          path="/teams/:teamId/schedule"
          element={<SchedulePage />}
        />
      </Routes>
    </>
  )
}

export default App
