import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bell, Settings } from 'lucide-react'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import API_URL from '../config/api'
import BottomNav from './BottomNav'
import './navbar.css'
import './navbar.mobile.css'
import './fixedNavigation.css'
import './fixedNavigation.mobile.css'


function readStoredTeamId() {
  return localStorage.getItem('activeTeamId') || null
}

function readStoredTeamName() {
  return localStorage.getItem('activeTeamName') || ''
}

function readStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem('currentUser') || 'null',
    )
  } catch {
    return null
  }
}

function Navbar({
  teamId: suppliedTeamId,
  teamName: suppliedTeamName,
  currentUser: suppliedCurrentUser,
}) {
  const navigate = useNavigate()
  const params = useParams()

  const routeTeamId = params.teamId

  const [currentUser, setCurrentUser] = useState(
    suppliedCurrentUser || readStoredUser(),
  )

  const [resolvedTeamId, setResolvedTeamId] = useState(
    suppliedTeamId || routeTeamId || readStoredTeamId(),
  )

  const [resolvedTeamName, setResolvedTeamName] = useState(
    suppliedTeamName || readStoredTeamName(),
  )

  const [teams, setTeams] = useState([])

  const [latestPlayedMatchId, setLatestPlayedMatchId] = useState(null)
  const [playerPaymentMatchId, setPlayerPaymentMatchId] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const [openingStripe, setOpeningStripe] = useState(false)
  const [navbarError, setNavbarError] = useState('')

  const isManager =
    currentUser?.account_type === 'manager'

  const isApprovedManager =
    isManager &&
    currentUser?.manager_verification_status === 'approved'

  const isPendingManager =
    isManager &&
    currentUser?.manager_verification_status === 'pending'

  const isApprovedPlayer =
    currentUser?.account_type === 'player' &&
    Boolean(resolvedTeamId)

  const canUseTeamNavigation =
    Boolean(resolvedTeamId) &&
    (isApprovedPlayer || isApprovedManager)

  useEffect(() => {
    if (suppliedCurrentUser) {
      setCurrentUser(suppliedCurrentUser)

      localStorage.setItem(
        'currentUser',
        JSON.stringify(suppliedCurrentUser),
      )

      const suppliedUserIsPendingManager =
        suppliedCurrentUser.account_type === 'manager' &&
        suppliedCurrentUser.manager_verification_status === 'pending'

      if (suppliedUserIsPendingManager) {
        setResolvedTeamId(null)
        setResolvedTeamName('')
        setTeams([])
        setLatestPlayedMatchId(null)
        setPlayerPaymentMatchId(null)

        localStorage.removeItem('activeTeamId')
        localStorage.removeItem('activeTeamName')
      }
    }
  }, [suppliedCurrentUser])

  useEffect(() => {
    if (isPendingManager) {
      setResolvedTeamId(null)
      return
    }

    if (suppliedTeamId) {
      setResolvedTeamId(suppliedTeamId)
    } else if (routeTeamId) {
      setResolvedTeamId(routeTeamId)
    }
  }, [
    isPendingManager,
    routeTeamId,
    suppliedTeamId,
  ])

  useEffect(() => {
    if (isPendingManager) {
      setResolvedTeamName('')
      return
    }

    if (suppliedTeamName) {
      setResolvedTeamName(suppliedTeamName)
    }
  }, [
    isPendingManager,
    suppliedTeamName,
  ])

  useEffect(() => {
    let cancelled = false

    async function loadNavbarData() {
      const token = localStorage.getItem('token')
      if (!token) return

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const requests = [
          fetch(`${API_URL}/notifications`, { headers }),
          fetch(`${API_URL}/teams`, { headers }),
        ]

        if (!suppliedCurrentUser) {
          requests.push(
            fetch(`${API_URL}/users/me`, { headers }),
          )
        }

        const responses = await Promise.all(requests)

        if (
          responses.some(
            (response) => response.status === 401,
          )
        ) {
          clearSession()
          return
        }

        const notificationsResponse = responses[0]
        const teamsResponse = responses[1]
        const userResponse = responses[2]

        if (notificationsResponse.ok) {
          const notificationData =
            await notificationsResponse.json()

          const notifications =
            Array.isArray(notificationData)
              ? notificationData
              : notificationData.notifications || []

          if (!cancelled) {
            setUnreadCount(
              notifications.filter(
                (notification) => !notification.read,
              ).length,
            )
          }
        }

        let loadedUser = suppliedCurrentUser || currentUser

        if (userResponse?.ok) {
          const userData = await userResponse.json()
          loadedUser = userData.user || userData

          if (!cancelled) {
            setCurrentUser(loadedUser)

            localStorage.setItem(
              'currentUser',
              JSON.stringify(loadedUser),
            )
          }
        }

        const loadedUserIsPendingManager =
          loadedUser?.account_type === 'manager' &&
          loadedUser?.manager_verification_status === 'pending'

        if (loadedUserIsPendingManager) {
          if (!cancelled) {
            setTeams([])
            setResolvedTeamId(null)
            setResolvedTeamName('')
            setLatestPlayedMatchId(null)
            setPlayerPaymentMatchId(null)
          }

          localStorage.removeItem('activeTeamId')
          localStorage.removeItem('activeTeamName')
          return
        }

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()

          const loadedTeams =
            Array.isArray(teamsData)
              ? teamsData
              : teamsData.teams || []

          const storedActiveTeamId =
            readStoredTeamId()

          const preferredTeamId =
            suppliedTeamId ||
            routeTeamId ||
            storedActiveTeamId ||
            resolvedTeamId ||
            loadedTeams[0]?.id

          const currentTeam =
            loadedTeams.find(
              (team) =>
                String(team.id) === String(preferredTeamId),
            ) ||
            loadedTeams[0] ||
            null

          if (!cancelled) {
            setTeams(loadedTeams)
          }

          if (!cancelled && currentTeam) {
            const currentTeamName =
              suppliedTeamName || currentTeam.name || ''

            setResolvedTeamId(currentTeam.id)
            setResolvedTeamName(currentTeamName)

            localStorage.setItem(
              'activeTeamId',
              String(currentTeam.id),
            )

            localStorage.setItem(
              'activeTeamName',
              currentTeamName,
            )
          }
        }
      } catch {
        // Keep navigation usable if optional data cannot load.
      }
    }

    loadNavbarData()

    return () => {
      cancelled = true
    }
  }, [
    navigate,
    resolvedTeamId,
    routeTeamId,
    suppliedCurrentUser,
    suppliedTeamId,
    suppliedTeamName,
  ])

  useEffect(() => {
    if (
      !resolvedTeamId ||
      !canUseTeamNavigation
    ) {
      setLatestPlayedMatchId(null)
      return
    }

    let cancelled = false

    async function loadLatestPlayedMatch() {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const response = await fetch(
          `${API_URL}/teams/${resolvedTeamId}/matches`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
            },
          },
        )

        if (!response.ok) return

        const data = await response.json()

        const matches =
          Array.isArray(data)
            ? data
            : data.matches || []

        const latestPlayedMatch = matches
          .filter(
            (match) =>
              match.kickoff_time &&
              new Date(match.kickoff_time).getTime() <=
                Date.now(),
          )
          .sort(
            (firstMatch, secondMatch) =>
              new Date(secondMatch.kickoff_time).getTime() -
              new Date(firstMatch.kickoff_time).getTime(),
          )[0]

        if (!cancelled) {
          setLatestPlayedMatchId(
            latestPlayedMatch?.id || null,
          )
        }
      } catch {
        // Bottom navigation can fall back to the fixture list.
      }
    }

    loadLatestPlayedMatch()

    return () => {
      cancelled = true
    }
  }, [
    canUseTeamNavigation,
    resolvedTeamId,
  ])

  useEffect(() => {
    if (
      !resolvedTeamId ||
      !canUseTeamNavigation ||
      !isApprovedPlayer
    ) {
      setPlayerPaymentMatchId(null)
      return
    }

    let cancelled = false

    async function loadPlayerPaymentTarget() {
      const token = localStorage.getItem('token')
      if (!token) return

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const notificationsResponse = await fetch(
          `${API_URL}/notifications`,
          { headers },
        )

        if (!notificationsResponse.ok) {
          if (!cancelled) {
            setPlayerPaymentMatchId(null)
          }
          return
        }

        const notificationData =
          await notificationsResponse.json()

        const notifications =
          Array.isArray(notificationData)
            ? notificationData
            : notificationData.notifications || []

        /*
         * A match-payment request notification stores both
         * match_id and match_payment_id. We use those IDs to
         * locate the newest payment request that is still pending.
         */
        const paymentRequests =
          notifications.filter((notification) => {
            const matchId =
              notification.match_id ||
              notification.match?.id

            const matchPaymentId =
              notification.match_payment_id ||
              notification.match_payment?.id

            return (
              notification.notification_type ===
                'match_payment_requested' &&
              Boolean(matchId && matchPaymentId)
            )
          })

        let fallbackMatchId =
          paymentRequests[0]?.match_id ||
          paymentRequests[0]?.match?.id ||
          null

        for (const notification of paymentRequests) {
          const matchId =
            notification.match_id ||
            notification.match?.id

          const matchPaymentId =
            notification.match_payment_id ||
            notification.match_payment?.id

          const response = await fetch(
            `${API_URL}/teams/${resolvedTeamId}/matches/${matchId}/match_payments/${matchPaymentId}`,
            { headers },
          )

          if (!response.ok) {
            continue
          }

          const payment = await response.json()

          if (payment.status === 'pending') {
            if (!cancelled) {
              setPlayerPaymentMatchId(matchId)
            }
            return
          }
        }

        /*
         * If there is no unpaid request, keep the Pay tab tied
         * to the player's most recent payment request so it still
         * opens their MatchPaymentsPage instead of sending them
         * somewhere unrelated.
         */
        if (!cancelled) {
          setPlayerPaymentMatchId(fallbackMatchId)
        }
      } catch {
        if (!cancelled) {
          setPlayerPaymentMatchId(null)
        }
      }
    }

    loadPlayerPaymentTarget()

    return () => {
      cancelled = true
    }
  }, [
    canUseTeamNavigation,
    isApprovedPlayer,
    resolvedTeamId,
  ])

  function clearSession() {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')
    navigate('/login', { replace: true })
  }

  function handleTeamSwitch(nextTeamId) {
    const nextTeam = teams.find(
      (team) => String(team.id) === String(nextTeamId),
    )

    if (!nextTeam) return

    const nextTeamName = nextTeam.name || ''

    localStorage.setItem(
      'activeTeamId',
      String(nextTeam.id),
    )

    localStorage.setItem(
      'activeTeamName',
      nextTeamName,
    )

    setResolvedTeamId(nextTeam.id)
    setResolvedTeamName(nextTeamName)
    setLatestPlayedMatchId(null)
    setPlayerPaymentMatchId(null)

    window.dispatchEvent(
      new CustomEvent('matchmuster:active-team-changed', {
        detail: {
          teamId: nextTeam.id,
        },
      }),
    )

    navigate('/dashboard')
  }

  async function handleSignOut() {
    const token = localStorage.getItem('token')

    setSigningOut(true)

    try {
      await fetch(`${API_URL}/users/sign_out`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: token,
        },
      })
    } catch {
      // Local logout still succeeds if Rails is unavailable.
    } finally {
      clearSession()
    }
  }

  async function handleStripeAction() {
    if (!resolvedTeamId || openingStripe) return

    const token = localStorage.getItem('token')

    setOpeningStripe(true)
    setNavbarError('')

    const headers = {
      Accept: 'application/json',
      Authorization: token,
    }

    try {
      const statusResponse = await fetch(
        `${API_URL}/teams/${resolvedTeamId}/stripe_status`,
        { headers },
      )

      if (statusResponse.status === 401) {
        clearSession()
        return
      }

      const statusData = await statusResponse.json()

      if (!statusResponse.ok) {
        setNavbarError(
          statusData.error ||
            'Unable to check your Stripe account.',
        )
        return
      }

      const endpoint =
        statusData.setup_complete
          ? 'stripe_dashboard'
          : 'stripe_connect'

      const stripeResponse = await fetch(
        `${API_URL}/teams/${resolvedTeamId}/${endpoint}`,
        {
          method: 'POST',
          headers,
        },
      )

      if (stripeResponse.status === 401) {
        clearSession()
        return
      }

      const stripeData = await stripeResponse.json()

      if (!stripeResponse.ok) {
        setNavbarError(
          stripeData.error ||
            'Unable to open your Stripe account.',
        )
        return
      }

      const stripeUrl =
        stripeData.dashboard_url ||
        stripeData.onboarding_url

      if (!stripeUrl) {
        setNavbarError(
          'Stripe did not provide a redirect URL.',
        )
        return
      }

      window.location.assign(stripeUrl)
    } catch {
      setNavbarError('Unable to connect to Stripe.')
    } finally {
      setOpeningStripe(false)
    }
  }

  const headerName = useMemo(() => {
    if (resolvedTeamName) return resolvedTeamName
    return 'MatchMuster'
  }, [resolvedTeamName])

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link
            className="app-topbar-brand"
            to="/dashboard"
            aria-label="Go to MatchMuster dashboard"
          >
            <img
              src={matchMusterLogo}
              alt=""
              aria-hidden="true"
            />

            <strong>{headerName}</strong>
          </Link>

          <div className="app-topbar-actions">
            <Link
              className="app-topbar-action app-topbar-notifications"
              to="/notifications"
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : 'Notifications'
              }
              title="Notifications"
            >
              <Bell
                size={22}
                aria-hidden="true"
              />

              {unreadCount > 0 && (
                <span
                  className="app-topbar-notification-badge"
                  aria-hidden="true"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            <Link
              className="app-topbar-action"
              to="/profile/edit"
              aria-label="Open settings"
              title="Settings"
            >
              <Settings
                size={22}
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        {navbarError && (
          <div className="app-topbar-error" role="alert">
            {navbarError}

            <button
              type="button"
              onClick={() => setNavbarError('')}
            >
              Dismiss
            </button>
          </div>
        )}
      </header>

      <div
        className="app-topbar-fixed-spacer"
        aria-hidden="true"
      />

      <BottomNav
        teamId={resolvedTeamId}
        teams={teams}
        latestPlayedMatchId={latestPlayedMatchId}
        playerPaymentMatchId={playerPaymentMatchId}
        canUseTeamNavigation={canUseTeamNavigation}
        isApprovedManager={isApprovedManager}
        isApprovedPlayer={isApprovedPlayer}
        onTeamSwitch={handleTeamSwitch}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        onStripeAction={handleStripeAction}
        openingStripe={openingStripe}
      />
    </>
  )
}

export default Navbar
