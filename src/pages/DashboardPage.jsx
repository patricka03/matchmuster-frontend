import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API_URL from '../config/api'

function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [user, setUser] = useState(null)
  const [teamId, setTeamId] = useState(null)

  const [teamJoinPending, setTeamJoinPending] = useState(
    localStorage.getItem('teamJoinPending') === 'true'
  )

  const [errorMessage, setErrorMessage] = useState('')
  const [stripeStatus, setStripeStatus] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeError, setStripeError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const isPlayer = user?.account_type === 'player'
  const isManager = user?.account_type === 'manager'

  const isApprovedPlayer =
    isPlayer && Boolean(teamId)

  const isApprovedManager =
    isManager &&
    user?.manager_verification_status === 'approved'

  const isPendingManager =
    isManager &&
    user?.manager_verification_status === 'pending'

  const canViewPosts =
    Boolean(teamId) &&
    (isApprovedPlayer || isApprovedManager)

  // Players can join immediately.
  // Managers can join once MatchMuster approves their account.
  const canJoinTeam =
    isPlayer || isApprovedManager

  const hasNoTeamMembership =
    !teamId &&
    !teamJoinPending &&
    canJoinTeam

  const isPendingTeamApproval =
    !teamId &&
    teamJoinPending &&
    canJoinTeam

  const teamCardDescription = isApprovedManager
    ? 'Create or manage your football teams.'
    : 'View your football team.'

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)

    if (searchParams.get('payment') !== 'success') return

    setPaymentSuccess(true)
    searchParams.delete('payment')

    const cleanSearch = searchParams.toString()

    navigate(
      {
        pathname: location.pathname,
        search: cleanSearch ? `?${cleanSearch}` : '',
      },
      { replace: true }
    )
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem('token')

      if (!token) {
        navigate('/login')
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const userResponse = await fetch(
          `${API_URL}/users/me`,
          { headers }
        )

        if (!userResponse.ok) {
          localStorage.removeItem('token')
          navigate('/login')
          return
        }

        const userData = await userResponse.json()

        const teamsResponse = await fetch(
          `${API_URL}/teams`,
          { headers }
        )

        if (!teamsResponse.ok) {
          const teamsData = await teamsResponse.json()

          setErrorMessage(
            teamsData.error || 'Unable to load your team.'
          )
          return
        }

        const teamsData = await teamsResponse.json()

        if (teamsData.length > 0) {
          const firstTeamId = teamsData[0].id

          setTeamId(firstTeamId)

          // Once the team appears, the team approval
          // process has completed.
          localStorage.removeItem('teamJoinPending')
          setTeamJoinPending(false)

          if (
            userData.user.account_type === 'manager' &&
            userData.user.manager_verification_status === 'approved'
          ) {
            const stripeResponse = await fetch(
              `${API_URL}/teams/${firstTeamId}/stripe_status`,
              { headers }
            )

            const stripeData = await stripeResponse.json()

            if (stripeResponse.ok) {
              setStripeStatus(stripeData)
            } else {
              setStripeError(
                stripeData.error ||
                  'Unable to load Stripe status.'
              )
            }
          }
        }

        setUser(userData.user)
      } catch {
        setErrorMessage(
          'Unable to load your dashboard.'
        )
      }
    }

    loadDashboard()
  }, [navigate])

  function handleMatchesNavigation() {
    if (teamId) {
      navigate(`/teams/${teamId}/matches`)
      return
    }

    navigate('/team')
  }

  function handleSquadNavigation() {
    if (teamId) {
      navigate(`/teams/${teamId}/squad`)
      return
    }

    navigate('/team')
  }

  function handlePostsNavigation() {
    if (teamId) {
      navigate(`/teams/${teamId}/posts`)
      return
    }

    navigate('/team')
  }

  async function handleStripeAction() {
    if (!teamId || stripeLoading) return

    const token = localStorage.getItem('token')

    setStripeLoading(true)
    setStripeError('')

    const endpoint = stripeStatus?.setup_complete
      ? 'stripe_dashboard'
      : 'stripe_connect'

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setStripeError(
          data.error || 'Unable to open Stripe.'
        )
        return
      }

      const stripeUrl =
        data.dashboard_url || data.onboarding_url

      if (!stripeUrl) {
        setStripeError(
          'Stripe did not provide a redirect URL.'
        )
        return
      }

      window.location.assign(stripeUrl)
    } catch {
      setStripeError(
        'Unable to connect to Stripe.'
      )
    } finally {
      setStripeLoading(false)
    }
  }

  if (errorMessage) {
    return (
      <p className="dashboard-message">
        {errorMessage}
      </p>
    )
  }

  if (!user) {
    return (
      <p className="dashboard-message">
        Loading...
      </p>
    )
  }

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={user}
      />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Your dashboard
            </p>

            <h1>
              Welcome Back, {user.first_name}!
            </h1>

            <p>
              {isPendingManager
                ? 'Your manager account is awaiting approval.'
                : hasNoTeamMembership && isApprovedManager
                  ? 'Create a new team or join an existing team to get started.'
                  : hasNoTeamMembership
                    ? 'Join your football team to get started.'
                    : isPendingTeamApproval
                      ? 'Your team request is awaiting approval.'
                      : 'Manage your team, matches and players from one place.'}
            </p>
          </div>

          {paymentSuccess && (
            <div
              className="dashboard-payment-success"
              role="status"
            >
              Payment successful — your match subs have been paid.
            </div>
          )}

          <section className="dashboard-grid">
            {/* PENDING MANAGER */}
            {isPendingManager && (
              <article className="dashboard-card pending-team-card">
                <div className="card-icon">
                  ⚽
                </div>

                <h2>Manager Approval Pending</h2>

                <p>
                  Your manager account is currently
                  being reviewed by MatchMuster.
                </p>

                <p>
                  Once approved, you'll be able to
                  create a team or join an existing one.
                </p>
              </article>
            )}

            {/* APPROVED MANAGER — NO TEAM */}
            {hasNoTeamMembership && isApprovedManager && (
              <article className="dashboard-card">
                <div className="card-icon">
                  ⚽
                </div>

                <h2>Create or Join a Team</h2>

                <p>
                  Create a new football team or join an existing
                  team using an invite code.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/teams/new')}
                >
                  Create a Team
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/teams/join')}
                >
                  Join a Team
                </button>
              </article>
            )}

            {/* PLAYER — NO TEAM */}
            {hasNoTeamMembership && isPlayer && (
              <article className="dashboard-card">
                <div className="card-icon">
                  👥
                </div>

                <h2>Join a Team</h2>

                <p>
                  You are not part of a team yet.
                  Join your team using an invite code.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/teams/join')}
                >
                  Join a Team
                </button>
              </article>
            )}

            {/* JOIN REQUEST SUBMITTED */}
            {isPendingTeamApproval && (
              <article className="dashboard-card pending-team-card">
                <div className="card-icon">
                  ⚽
                </div>

                <h2>
                  Pending Team Approval
                </h2>

                <p>
                  Your request to join the team is
                  pending approval from the team manager.
                </p>

                <p>
                  You'll get full access once your
                  request has been approved.
                </p>
              </article>
            )}

            {/* EXISTING MY TEAM CARD */}
            {teamId && (
              <article className="dashboard-card">
                <div className="card-icon">
                  ⚽
                </div>

                <h2>
                  {isManager
                    ? 'My Teams'
                    : 'My Team'}
                </h2>

                <p>
                  {teamCardDescription}
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/team')}
                >
                  View{' '}
                  {isManager
                    ? 'Teams'
                    : 'Team'}
                </button>
              </article>
            )}

            {/* APPROVED PLAYERS ONLY */}
            {isApprovedPlayer && (
              <article className="dashboard-card">
                <div className="card-icon">
                  📅
                </div>

                <h2>Matches</h2>

                <p>
                  View upcoming fixtures and availability.
                </p>

                <button
                  type="button"
                  onClick={handleMatchesNavigation}
                >
                  View Matches
                </button>
              </article>
            )}

            {/* APPROVED TEAM MEMBERS ONLY */}
            {canViewPosts && (
              <article className="dashboard-card">
                <div className="card-icon">
                  📣
                </div>

                <h2>
                  {isApprovedManager
                    ? 'My Posts'
                    : 'Posts'}
                </h2>

                <p>
                  {isApprovedManager
                    ? 'Create and manage posts for your teams.'
                    : 'View team announcements, tactics and updates.'}
                </p>

                <button
                  type="button"
                  onClick={handlePostsNavigation}
                >
                  View Posts
                </button>
              </article>
            )}

            {/* APPROVED PLAYERS ONLY */}
            {isApprovedPlayer && (
              <article className="dashboard-card">
                <div className="card-icon">
                  👥
                </div>

                <h2>Squad</h2>

                <p>
                  View players and team memberships.
                </p>

                <button
                  type="button"
                  onClick={handleSquadNavigation}
                >
                  View Squad
                </button>
              </article>
            )}

            {/* APPROVED MANAGERS WITH A TEAM ONLY */}
            {isApprovedManager && teamId && (
              <article className="dashboard-card stripe-dashboard-card">
                <div className="card-icon">
                  💳
                </div>

                <h2>Club Payments</h2>

                {!stripeStatus ? (
                  <p>
                    Checking your Stripe account...
                  </p>
                ) : !stripeStatus.connected ? (
                  <p>
                    Connect Stripe to securely
                    receive match payments.
                  </p>
                ) : stripeStatus.setup_complete ? (
                  <p>
                    Stripe is connected. Manage
                    payouts and bank details.
                  </p>
                ) : (
                  <p>
                    Your Stripe setup is incomplete.
                    Continue setting up your account
                    to receive payments.
                  </p>
                )}

                {stripeStatus?.setup_complete && (
                  <span className="stripe-status stripe-connected">
                    Connected
                  </span>
                )}

                {stripeStatus?.connected &&
                  !stripeStatus.setup_complete && (
                    <span className="stripe-status stripe-incomplete">
                      Setup incomplete
                    </span>
                  )}

                {stripeError && (
                  <p className="stripe-card-error">
                    {stripeError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleStripeAction}
                  disabled={
                    stripeLoading ||
                    !stripeStatus
                  }
                >
                  {stripeLoading
                    ? 'Opening Stripe...'
                    : stripeStatus?.setup_complete
                      ? 'Manage Stripe account'
                      : stripeStatus?.connected
                        ? 'Continue Stripe setup'
                        : 'Connect Stripe'}
                </button>
              </article>
            )}
          </section>
        </section>
      </main>
    </>
  )
}

export default DashboardPage
