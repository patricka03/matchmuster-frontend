import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Megaphone,
  Star,
  Users,
} from 'lucide-react'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

import '../styles/DashboardHome.css'
import '../styles/DashboardHome.mobile.css'

function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [user, setUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [nextMatch, setNextMatch] = useState(null)
  const [nextTraining, setNextTraining] = useState(null)
  const [activeTeamVersion, setActiveTeamVersion] = useState(0)

  const [teamJoinPending, setTeamJoinPending] = useState(
    localStorage.getItem('teamJoinPending') === 'true',
  )

  const [errorMessage, setErrorMessage] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const [squadSelections, setSquadSelections] = useState([])
  const [squadLoaded, setSquadLoaded] = useState(false)

  const [availabilitySummary, setAvailabilitySummary] = useState({
    available: 0,
    unavailable: 0,
    pending: 0,
  })

  const [
    trainingAvailabilitySummary,
    setTrainingAvailabilitySummary,
  ] = useState({
    available: 0,
    unavailable: 0,
    pending: 0,
  })

  const [playerPayment, setPlayerPayment] = useState(null)

  const [
    fixtureDetailsLoading,
    setFixtureDetailsLoading,
  ] = useState(false)

  const teamId = team?.id

  const isPlayer =
    user?.account_type === 'player'

  const isManager =
    user?.account_type === 'manager'

  const isApprovedPlayer =
    isPlayer && Boolean(teamId)

  const isApprovedManager =
    isManager &&
    user?.manager_verification_status === 'approved'

  const isPendingManager =
    isManager &&
    user?.manager_verification_status === 'pending'

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

  async function clearDashboardSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  useEffect(() => {
    function handleActiveTeamChanged() {
      setActiveTeamVersion(
        (currentVersion) =>
          currentVersion + 1,
      )
    }

    window.addEventListener(
      'matchmuster:active-team-changed',
      handleActiveTeamChanged,
    )

    return () => {
      window.removeEventListener(
        'matchmuster:active-team-changed',
        handleActiveTeamChanged,
      )
    }
  }, [])

  useEffect(() => {
    const searchParams =
      new URLSearchParams(location.search)

    if (
      searchParams.get('payment') !==
      'success'
    ) {
      return
    }

    setPaymentSuccess(true)
    searchParams.delete('payment')

    const cleanSearch =
      searchParams.toString()

    navigate(
      {
        pathname: location.pathname,

        search: cleanSearch
          ? `?${cleanSearch}`
          : '',
      },

      {
        replace: true,
      },
    )
  }, [
    location.pathname,
    location.search,
    navigate,
  ])

  // ========================================
  // LOAD DASHBOARD
  // ========================================

  useEffect(() => {
    async function loadDashboard() {
      const token = getAuthToken()

      if (!token) {
        navigate('/login', {
          replace: true,
        })

        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const [
          userResponse,
          teamsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/users/me`,
            {
              headers,
            },
          ),

          fetch(
            `${API_URL}/teams`,
            {
              headers,
            },
          ),
        ])

        if (
          userResponse.status === 401 ||
          teamsResponse.status === 401
        ) {
          await clearDashboardSession()

          return
        }

        const userData =
          await userResponse.json()

        const teamsData =
          await teamsResponse.json()

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              'Unable to load your account.',
          )
        }

        if (!teamsResponse.ok) {
          throw new Error(
            teamsData.error ||
              'Unable to load your team.',
          )
        }

        const currentUser =
          userData.user ||
          userData

        const teams =
          Array.isArray(teamsData)
            ? teamsData
            : teamsData.teams || []

        const storedActiveTeamId =
          localStorage.getItem(
            'activeTeamId',
          )

        const storedActiveTeam =
          storedActiveTeamId
            ? teams.find(
                (teamRecord) =>
                  String(teamRecord.id) ===
                  String(
                    storedActiveTeamId,
                  ),
              )
            : null

        const currentTeam =
          storedActiveTeam ||
          teams[0] ||
          null

        setUser(currentUser)
        setTeam(currentTeam)

        setNextMatch(null)
        setNextTraining(null)

        setSquadSelections([])
        setSquadLoaded(false)

        setPlayerPayment(null)

        setAvailabilitySummary({
          available: 0,
          unavailable: 0,
          pending: 0,
        })

        setTrainingAvailabilitySummary({
          available: 0,
          unavailable: 0,
          pending: 0,
        })

        localStorage.setItem(
          'currentUser',
          JSON.stringify(
            currentUser,
          ),
        )

        if (currentTeam) {
          localStorage.setItem(
            'activeTeamId',
            String(currentTeam.id),
          )

          localStorage.setItem(
            'activeTeamName',
            currentTeam.name || '',
          )

          localStorage.removeItem(
            'teamJoinPending',
          )

          setTeamJoinPending(false)

          const [
            matchesResponse,
            trainingsResponse,
          ] = await Promise.all([
            fetch(
              `${API_URL}/teams/${currentTeam.id}/matches`,
              {
                headers,
              },
            ),

            fetch(
              `${API_URL}/teams/${currentTeam.id}/trainings`,
              {
                headers,
              },
            ),
          ])

          if (
            matchesResponse.status === 401 ||
            trainingsResponse.status === 401
          ) {
            await clearDashboardSession()

            return
          }

          const [
            matchesData,
            trainingsData,
          ] = await Promise.all([
            matchesResponse.json(),
            trainingsResponse.json(),
          ])

          if (!matchesResponse.ok) {
            throw new Error(
              matchesData.error ||
                'Unable to load fixtures.',
            )
          }

          if (!trainingsResponse.ok) {
            throw new Error(
              trainingsData.error ||
                'Unable to load training sessions.',
            )
          }

          const matches =
            Array.isArray(matchesData)
              ? matchesData
              : matchesData.matches || []

          const trainings =
            Array.isArray(trainingsData)
              ? trainingsData
              : trainingsData.trainings || []

          const upcomingMatches =
            matches
              .filter((match) => {
                if (
                  !match.kickoff_time
                ) {
                  return false
                }

                return (
                  new Date(
                    match.kickoff_time,
                  ).getTime() >
                  Date.now()
                )
              })
              .sort(
                (
                  firstMatch,
                  secondMatch,
                ) =>
                  new Date(
                    firstMatch.kickoff_time,
                  ).getTime() -
                  new Date(
                    secondMatch.kickoff_time,
                  ).getTime(),
              )

          const upcomingTrainings =
            trainings
              .filter((training) => {
                if (
                  !training.starts_at
                ) {
                  return false
                }

                return (
                  new Date(
                    training.starts_at,
                  ).getTime() >
                  Date.now()
                )
              })
              .sort(
                (
                  firstTraining,
                  secondTraining,
                ) =>
                  new Date(
                    firstTraining.starts_at,
                  ).getTime() -
                  new Date(
                    secondTraining.starts_at,
                  ).getTime(),
              )

          setNextMatch(
            upcomingMatches[0] ||
              null,
          )

          setNextTraining(
            upcomingTrainings[0] ||
              null,
          )
        } else {
          localStorage.removeItem(
            'activeTeamId',
          )

          localStorage.removeItem(
            'activeTeamName',
          )
        }
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load your dashboard.',
        )
      }
    }

    loadDashboard()
  }, [
    navigate,
    activeTeamVersion,
  ])

  // ========================================
  // NEXT FIXTURE DETAILS
  // ========================================

  useEffect(() => {
    if (
      !user ||
      !teamId ||
      !nextMatch
    ) {
      setSquadSelections([])

      setSquadLoaded(
        Boolean(
          user &&
          teamId,
        ),
      )

      setPlayerPayment(null)

      setAvailabilitySummary({
        available: 0,
        unavailable: 0,
        pending: 0,
      })

      return
    }

    let cancelled = false

    async function loadNextFixtureDetails() {
      const token = getAuthToken()

      if (!token) {
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      setFixtureDetailsLoading(
        true,
      )

      try {
        // ========================================
        // PLAYER FIXTURE DETAILS
        // ========================================

        if (isApprovedPlayer) {
          const [
            squadResponse,
            paymentsResponse,
          ] = await Promise.all([
            fetch(
              `${API_URL}/teams/${teamId}/matches/${nextMatch.id}/squad_selections`,
              {
                headers,
              },
            ),

            fetch(
              `${API_URL}/teams/${teamId}/matches/${nextMatch.id}/match_payments`,
              {
                headers,
              },
            ),
          ])

          if (
            squadResponse.status === 401 ||
            paymentsResponse.status === 401
          ) {
            await clearDashboardSession()

            return
          }

          if (squadResponse.ok) {
            const squadData =
              await squadResponse.json()

            const selections =
              Array.isArray(
                squadData,
              )
                ? squadData
                : squadData.squad_selections ||
                  []

            if (!cancelled) {
              setSquadSelections(
                selections,
              )

              setSquadLoaded(true)
            }
          } else if (!cancelled) {
            setSquadLoaded(true)
          }

          if (
            paymentsResponse.ok
          ) {
            const paymentsData =
              await paymentsResponse.json()

            const payments =
              Array.isArray(
                paymentsData,
              )
                ? paymentsData
                : paymentsData.match_payments ||
                  []

            const ownPayment =
              payments.find(
                (payment) => {
                  const paymentUserId =
                    payment.user_id ||
                    payment.user?.id

                  return (
                    paymentUserId !==
                      undefined &&
                    String(
                      paymentUserId,
                    ) ===
                      String(user.id)
                  )
                },
              ) ||
              (payments.length === 1
                ? payments[0]
                : null)

            if (!cancelled) {
              setPlayerPayment(
                ownPayment,
              )
            }
          }
        }

        // ========================================
        // MANAGER FIXTURE AVAILABILITY
        // ========================================

        if (isApprovedManager) {
          const availabilityResponse =
            await fetch(
              `${API_URL}/teams/${teamId}/matches/${nextMatch.id}/availabilities`,
              {
                headers,
              },
            )

          if (
            availabilityResponse.status ===
            401
          ) {
            await clearDashboardSession()

            return
          }

          if (
            availabilityResponse.ok
          ) {
            const availabilityData =
              await availabilityResponse.json()

            const players =
              Array.isArray(
                availabilityData,
              )
                ? availabilityData
                : availabilityData.players ||
                  availabilityData.availabilities ||
                  []

            const summary =
              players.reduce(
                (
                  counts,
                  player,
                ) => {
                  if (
                    player.status ===
                    'available'
                  ) {
                    counts.available += 1
                  } else if (
                    player.status ===
                    'unavailable'
                  ) {
                    counts.unavailable +=
                      1
                  } else {
                    counts.pending += 1
                  }

                  return counts
                },

                {
                  available: 0,
                  unavailable: 0,
                  pending: 0,
                },
              )

            if (!cancelled) {
              setAvailabilitySummary(
                summary,
              )
            }
          }
        }
      } catch {
        /*
         * The dashboard remains usable
         * if a secondary card cannot load.
         */
      } finally {
        if (!cancelled) {
          setFixtureDetailsLoading(
            false,
          )
        }
      }
    }

    loadNextFixtureDetails()

    return () => {
      cancelled = true
    }
  }, [
    isApprovedManager,
    isApprovedPlayer,
    nextMatch,
    teamId,
    user,
  ])

  // ========================================
  // NEXT TRAINING AVAILABILITY
  // ========================================

  useEffect(() => {
    if (
      !isApprovedManager ||
      !teamId ||
      !nextTraining
    ) {
      setTrainingAvailabilitySummary({
        available: 0,
        unavailable: 0,
        pending: 0,
      })

      return
    }

    let cancelled = false

    async function loadTrainingAvailability() {
      const token = getAuthToken()

      if (!token) {
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const response =
          await fetch(
            `${API_URL}/teams/${teamId}/trainings/${nextTraining.id}/training_availabilities`,
            {
              headers,
            },
          )

        if (
          response.status === 401
        ) {
          await clearDashboardSession()

          return
        }

        if (!response.ok) {
          return
        }

        const data =
          await response.json()

        const players =
          Array.isArray(data)
            ? data
            : data.players ||
              data.training_availabilities ||
              []

        const summary =
          players.reduce(
            (
              counts,
              player,
            ) => {
              if (
                player.status ===
                'available'
              ) {
                counts.available += 1
              } else if (
                player.status ===
                'unavailable'
              ) {
                counts.unavailable += 1
              } else {
                counts.pending += 1
              }

              return counts
            },

            {
              available: 0,
              unavailable: 0,
              pending: 0,
            },
          )

        if (!cancelled) {
          setTrainingAvailabilitySummary(
            summary,
          )
        }
      } catch {
        /*
         * Keep the dashboard usable
         * if training availability
         * cannot be loaded.
         */
      }
    }

    loadTrainingAvailability()

    return () => {
      cancelled = true
    }
  }, [
    isApprovedManager,
    nextTraining,
    teamId,
  ])

  // ========================================
  // PLAYER SQUAD SELECTION
  // ========================================

  const playerSelection =
    useMemo(() => {
      if (!user) {
        return null
      }

      return squadSelections.find(
        (selection) => {
          const selectionUserId =
            selection.user_id ||
            selection.user?.id

          return (
            selectionUserId !==
              undefined &&
            String(
              selectionUserId,
            ) ===
              String(user.id)
          )
        },
      )
    }, [
      squadSelections,
      user,
    ])

  // ========================================
  // DATE / TIME HELPERS
  // ========================================

  function fixtureDate(match) {
    if (!match?.kickoff_time) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      },
    ).format(
      new Date(
        match.kickoff_time,
      ),
    )
  }

  function fixtureTime(match) {
    if (!match?.kickoff_time) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(
        match.kickoff_time,
      ),
    )
  }

  function trainingDate(training) {
    if (!training?.starts_at) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      },
    ).format(
      new Date(
        training.starts_at,
      ),
    )
  }

  function trainingTime(training) {
    if (!training?.starts_at) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(
        training.starts_at,
      ),
    )
  }

  // ========================================
  // SQUAD STATUS
  // ========================================

  function squadStatus() {
    if (!nextMatch) {
      return {
        tone: 'muted',
        text:
          'No upcoming fixture',
      }
    }

    if (
      fixtureDetailsLoading &&
      !squadLoaded
    ) {
      return {
        tone: 'muted',
        text:
          'Checking squad...',
      }
    }

    if (
      squadSelections.length ===
      0
    ) {
      return {
        tone: 'pending',
        text:
          'Squad not announced yet',
      }
    }

    if (!playerSelection) {
      return {
        tone: 'muted',
        text:
          'Not selected',
      }
    }

    if (
      playerSelection.selection_type ===
      'starter'
    ) {
      const parts = [
        'Starting XI',
        playerSelection.position,
        playerSelection.captain
          ? 'Captain'
          : null,
      ].filter(Boolean)

      return {
        tone: 'selected',
        text: parts.join(' • '),
      }
    }

    const parts = [
      'Substitute',
      playerSelection.position,
    ].filter(Boolean)

    return {
      tone: 'substitute',
      text: parts.join(' • '),
    }
  }

  // ========================================
  // PAYMENT CARD
  // ========================================

  function paymentCardText() {
    if (!nextMatch) {
      return 'No upcoming match fee'
    }

    if (!playerPayment) {
      return 'No payment due'
    }

    if (
      playerPayment.status ===
      'paid'
    ) {
      return 'Match fee paid'
    }

    if (
      playerPayment.status ===
      'waived'
    ) {
      return 'Match fee waived'
    }

    if (
      playerPayment.status ===
      'refunded'
    ) {
      return 'Payment refunded'
    }

    const formattedAmount =
      new Intl.NumberFormat(
        'en-GB',
        {
          style: 'currency',
          currency: 'GBP',
        },
      ).format(
        (
          playerPayment.amount_pence ||
          0
        ) / 100,
      )

    return `${formattedAmount} due`
  }

  // ========================================
  // NAVIGATION
  // ========================================

  function openNextFixture() {
    if (
      !teamId ||
      !nextMatch
    ) {
      return
    }

    navigate(
      `/teams/${teamId}/matches/${nextMatch.id}`,
    )
  }

  function openNextTraining() {
    if (
      !teamId ||
      !nextTraining
    ) {
      return
    }

    navigate(
      `/teams/${teamId}/trainings/${nextTraining.id}`,
    )
  }

  function openPayments() {
    if (!teamId) {
      navigate('/team')

      return
    }

    if (nextMatch) {
      navigate(
        `/teams/${teamId}/matches/${nextMatch.id}/payments`,
      )

      return
    }

    navigate(
      `/teams/${teamId}/matches`,
    )
  }

  function openRatings() {
    if (!teamId) {
      navigate('/team')

      return
    }

    navigate(
      `/teams/${teamId}/awards`,
    )
  }

  // ========================================
  // PAGE STATES
  // ========================================

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

  const selectionStatus =
    squadStatus()

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <Navbar
        teamId={teamId}
        teamName={team?.name}
        currentUser={user}
      />

      <main className="home-dashboard-page">
        <section className="home-dashboard-content">
          {paymentSuccess && (
            <div
              className="home-dashboard-success"
              role="status"
            >
              Payment successful — your match
              subs have been paid.
            </div>
          )}

          {/* ========================================
              PENDING MANAGER
          ======================================== */}

          {isPendingManager && (
            <article className="home-dashboard-state-card">
              <span className="home-dashboard-state-icon">
                ⚽
              </span>

              <h1>
                Manager approval pending
              </h1>

              <p>
                Your manager account is being
                reviewed by MatchMuster. Team
                tools will unlock once your
                account is approved.
              </p>
            </article>
          )}

          {/* ========================================
              APPROVED MANAGER WITHOUT TEAM
          ======================================== */}

          {hasNoTeamMembership &&
            isApprovedManager && (
              <article className="home-dashboard-state-card">
                <span className="home-dashboard-state-icon">
                  ⚽
                </span>

                <h1>
                  Create or join a team
                </h1>

                <p>
                  Create a new football team or
                  join an existing team using an
                  invite code.
                </p>

                <div className="home-dashboard-state-actions">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        '/teams/new',
                      )
                    }
                  >
                    Create a team
                  </button>

                  <button
                    className="secondary"
                    type="button"
                    onClick={() =>
                      navigate(
                        '/teams/join',
                      )
                    }
                  >
                    Join a team
                  </button>
                </div>
              </article>
            )}

          {/* ========================================
              PLAYER WITHOUT TEAM
          ======================================== */}

          {hasNoTeamMembership &&
            isPlayer && (
              <article className="home-dashboard-state-card">
                <span className="home-dashboard-state-icon">
                  👥
                </span>

                <h1>
                  Join your team
                </h1>

                <p>
                  Enter the invite code from
                  your manager to join your
                  football team.
                </p>

                <div className="home-dashboard-state-actions">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        '/teams/join',
                      )
                    }
                  >
                    Join a team
                  </button>
                </div>
              </article>
            )}

          {/* ========================================
              TEAM APPROVAL PENDING
          ======================================== */}

          {isPendingTeamApproval && (
            <article className="home-dashboard-state-card">
              <span className="home-dashboard-state-icon">
                ⏳
              </span>

              <h1>
                Team approval pending
              </h1>

              <p>
                Your request has been sent to
                the team manager. Full team
                access will appear here once
                you are approved.
              </p>
            </article>
          )}

          {teamId && (
            <>
              {/* ========================================
                  NEXT FIXTURE
              ======================================== */}

              <button
                className="home-dashboard-fixture-card"
                type="button"
                onClick={
                  openNextFixture
                }
                disabled={
                  !nextMatch
                }
              >
                <span className="home-dashboard-fixture-label">
                  Next fixture
                </span>

                {nextMatch ? (
                  <>
                    <span className="home-dashboard-fixture-opponent">
                      <span>
                        vs{' '}
                        {
                          nextMatch.opponent
                        }
                      </span>

                      <ArrowRight
                        size={21}
                        aria-hidden="true"
                      />
                    </span>

                    <span className="home-dashboard-fixture-meta">
                      <span>
                        <CalendarDays
                          size={17}
                          aria-hidden="true"
                        />

                        {fixtureDate(
                          nextMatch,
                        )}
                        {' • '}
                        {fixtureTime(
                          nextMatch,
                        )}
                      </span>

                      <span>
                        <MapPin
                          size={17}
                          aria-hidden="true"
                        />

                        {nextMatch.location ||
                          'Location TBC'}
                      </span>
                    </span>

                    {isApprovedPlayer && (
                      <span
                        className={`home-dashboard-squad-status ${selectionStatus.tone}`}
                      >
                        <span
                          aria-hidden="true"
                        >
                          {selectionStatus.tone ===
                            'selected' ||
                          selectionStatus.tone ===
                            'substitute'
                            ? '●'
                            : '○'}
                        </span>

                        {
                          selectionStatus.text
                        }
                      </span>
                    )}
                  </>
                ) : (
                  <span className="home-dashboard-no-fixture">
                    No upcoming fixture has
                    been added yet.
                  </span>
                )}
              </button>

              {/* ========================================
                  FIXTURE AVAILABILITY — MANAGER
              ======================================== */}

              {isApprovedManager &&
                nextMatch && (
                  <section className="home-dashboard-availability">
                    <div className="home-dashboard-section-heading">
                      <h2>
                        Availability overview
                      </h2>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/teams/${teamId}/matches/${nextMatch.id}/availabilities`,
                          )
                        }
                      >
                        View all
                      </button>
                    </div>

                    <div className="home-dashboard-availability-grid">
                      <article>
                        <strong>
                          {
                            availabilitySummary.available
                          }
                        </strong>

                        <span>
                          Available
                        </span>
                      </article>

                      <article>
                        <strong>
                          {
                            availabilitySummary.unavailable
                          }
                        </strong>

                        <span>
                          Unavailable
                        </span>
                      </article>

                      <article>
                        <strong>
                          {
                            availabilitySummary.pending
                          }
                        </strong>

                        <span>
                          Awaiting
                        </span>
                      </article>
                    </div>
                  </section>
                )}

              {/* ========================================
                  DASHBOARD ACTION CARDS
              ======================================== */}

              <section className="home-dashboard-action-grid">
                <button
                  className="home-dashboard-action-card"
                  type="button"
                  onClick={() =>
                    navigate(
                      `/teams/${teamId}/squad`,
                    )
                  }
                >
                  <span className="home-dashboard-card-icon">
                    <Users
                      size={26}
                      aria-hidden="true"
                    />
                  </span>

                  <strong>
                    Squad
                  </strong>

                  <small>
                    {isApprovedManager
                      ? 'Manage your team'
                      : 'View your team'}
                  </small>
                </button>

                <button
                  className="home-dashboard-action-card"
                  type="button"
                  onClick={
                    openPayments
                  }
                >
                  <span className="home-dashboard-card-icon">
                    <CircleDollarSign
                      size={26}
                      aria-hidden="true"
                    />
                  </span>

                  <strong>
                    Payments
                  </strong>

                  <small>
                    {isApprovedPlayer
                      ? paymentCardText()
                      : 'Match subs & payments'}
                  </small>
                </button>

                <button
                  className="home-dashboard-action-card"
                  type="button"
                  onClick={() =>
                    navigate(
                      `/teams/${teamId}/posts`,
                    )
                  }
                >
                  <span className="home-dashboard-card-icon">
                    <Megaphone
                      size={26}
                      aria-hidden="true"
                    />
                  </span>

                  <strong>
                    Updates
                  </strong>

                  <small>
                    {isApprovedManager
                      ? 'Team posts & tactics'
                      : 'Team news & tactics'}
                  </small>
                </button>

                <button
                  className="home-dashboard-action-card"
                  type="button"
                  onClick={
                    openRatings
                  }
                >
                  <span className="home-dashboard-card-icon">
                    <Star
                      size={26}
                      aria-hidden="true"
                    />
                  </span>

                  <strong>
                    Ratings
                  </strong>

                  <small>
                    Ratings & MOTM
                  </small>
                </button>
              </section>

              {/* ========================================
                  NEXT TRAINING — PLAYER + MANAGER
              ======================================== */}

              {(isApprovedPlayer ||
                isApprovedManager) && (
                <button
                  className="home-dashboard-training-card"
                  type="button"
                  onClick={
                    openNextTraining
                  }
                  disabled={
                    !nextTraining
                  }
                >
                  <span className="home-dashboard-training-label">
                    Next training
                  </span>

                  {nextTraining ? (
                    <>
                      <span className="home-dashboard-training-title">
                        <span>
                          {
                            nextTraining.title
                          }
                        </span>

                        <ArrowRight
                          size={21}
                          aria-hidden="true"
                        />
                      </span>

                      <span className="home-dashboard-training-meta">
                        <span>
                          <CalendarDays
                            size={17}
                            aria-hidden="true"
                          />

                          {trainingDate(
                            nextTraining,
                          )}

                          {' • '}

                          {trainingTime(
                            nextTraining,
                          )}
                        </span>

                        <span>
                          <MapPin
                            size={17}
                            aria-hidden="true"
                          />

                          {nextTraining.location ||
                            'Location TBC'}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="home-dashboard-no-training">
                      No upcoming training has
                      been added yet.
                    </span>
                  )}
                </button>
              )}

              {/* ========================================
                  TRAINING AVAILABILITY — MANAGER
              ======================================== */}

              {isApprovedManager &&
                nextTraining && (
                  <section className="home-dashboard-availability">
                    <div className="home-dashboard-section-heading">
                      <h2>
                        Training availability
                      </h2>

                      <button
                        type="button"
                        onClick={
                          openNextTraining
                        }
                      >
                        View all
                      </button>
                    </div>

                    <div className="home-dashboard-availability-grid">
                      <article>
                        <strong>
                          {
                            trainingAvailabilitySummary.available
                          }
                        </strong>

                        <span>
                          Available
                        </span>
                      </article>

                      <article>
                        <strong>
                          {
                            trainingAvailabilitySummary.unavailable
                          }
                        </strong>

                        <span>
                          Unavailable
                        </span>
                      </article>

                      <article>
                        <strong>
                          {
                            trainingAvailabilitySummary.pending
                          }
                        </strong>

                        <span>
                          Awaiting
                        </span>
                      </article>
                    </div>
                  </section>
                )}
            </>
          )}
        </section>
      </main>
    </>
  )
}

export default DashboardPage
