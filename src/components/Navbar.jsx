import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Settings } from 'lucide-react'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import API_URL from '../config/api'
import BottomNav from './BottomNav'
import './navbar.css'

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

  const [nextMatchId, setNextMatchId] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const [openingStripe, setOpeningStripe] = useState(false)
  const [navbarError, setNavbarError] = useState('')

  const isManager =
    currentUser?.account_type === 'manager'

  const isApprovedManager =
    isManager &&
    currentUser?.manager_verification_status === 'approved'

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
    }
  }, [suppliedCurrentUser])

  useEffect(() => {
    if (suppliedTeamId) {
      setResolvedTeamId(suppliedTeamId)
    } else if (routeTeamId) {
      setResolvedTeamId(routeTeamId)
    }
  }, [routeTeamId, suppliedTeamId])

  useEffect(() => {
    if (suppliedTeamName) {
      setResolvedTeamName(suppliedTeamName)
    }
  }, [suppliedTeamName])

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

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()

          const teams =
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
            teams[0]?.id

          const currentTeam =
            teams.find(
              (team) =>
                String(team.id) === String(preferredTeamId),
            ) ||
            teams[0] ||
            null

          if (!cancelled) {
            setTeams(teams)
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

        if (userResponse?.ok) {
          const userData = await userResponse.json()
          const user = userData.user || userData

          if (!cancelled) {
            setCurrentUser(user)

            localStorage.setItem(
              'currentUser',
              JSON.stringify(user),
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
    if (!resolvedTeamId) {
      setNextMatchId(null)
      return
    }

    let cancelled = false

    async function loadNextMatch() {
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

        const nextMatch = matches
          .filter(
            (match) =>
              match.kickoff_time &&
              new Date(match.kickoff_time).getTime() >
                Date.now(),
          )
          .sort(
            (firstMatch, secondMatch) =>
              new Date(firstMatch.kickoff_time).getTime() -
              new Date(secondMatch.kickoff_time).getTime(),
          )[0]

        if (!cancelled) {
          setNextMatchId(nextMatch?.id || null)
        }
      } catch {
        // Bottom navigation can fall back to the fixture list.
      }
    }

    loadNextMatch()

    return () => {
      cancelled = true
    }
  }, [resolvedTeamId])

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
    setNextMatchId(null)

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

          <Link
            className="app-topbar-settings"
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

      <BottomNav
        teamId={resolvedTeamId}
        teams={teams}
        nextMatchId={nextMatchId}
        canUseTeamNavigation={canUseTeamNavigation}
        isApprovedManager={isApprovedManager}
        unreadCount={unreadCount}
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
