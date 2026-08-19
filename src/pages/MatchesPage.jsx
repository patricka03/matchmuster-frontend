import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const COMPLETED_MATCH_DISPLAY_HOURS = 24

function MatchesPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [matches, setMatches] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [currentTime, setCurrentTime] = useState(Date.now())

  // ========================================
  // SESSION
  // ========================================

  async function clearMatchesSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  // Keeps the page updated if kickoff happens
  // while the manager/player is still on this page.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // ========================================
  // LOAD MATCHES
  // ========================================

  useEffect(() => {
    async function fetchMatchesPage() {
      const token = getAuthToken()

      if (!token) {
        await clearMatchesSession()
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const [
          matchesResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/matches`,
            {
              headers,
            },
          ),

          fetch(
            `${API_URL}/users/me`,
            {
              headers,
            },
          ),
        ])

        if (
          matchesResponse.status === 401 ||
          userResponse.status === 401
        ) {
          await clearMatchesSession()
          return
        }

        if (
          matchesResponse.status === 403 ||
          userResponse.status === 403
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const matchesData =
          await matchesResponse
            .json()
            .catch(() => ({}))

        const userData =
          await userResponse
            .json()
            .catch(() => ({}))

        if (!matchesResponse.ok) {
          setErrorMessage(
            matchesData.error ||
              'Unable to load matches.',
          )

          return
        }

        if (!userResponse.ok) {
          setErrorMessage(
            userData.error ||
              'Unable to load your account.',
          )

          return
        }

        const user =
          userData.user ||
          userData

        const isPlayer =
          user.account_type === 'player'

        const isApprovedManager =
          user.account_type === 'manager' &&
          user.manager_verification_status ===
            'approved'

        if (
          !isPlayer &&
          !isApprovedManager
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const receivedMatches =
          Array.isArray(matchesData)
            ? matchesData
            : matchesData.matches || []

        setCurrentUser(user)
        setMatches(receivedMatches)
      } catch {
        setErrorMessage(
          'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMatchesPage()
  }, [
    navigate,
    teamId,
  ])

  // ========================================
  // DATE / TIME
  // ========================================

  function formatKickoffTime(kickoffTime) {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(kickoffTime),
    )
  }

  // ========================================
  // MATCH STATUS
  // ========================================

  function hasMatchStarted(match) {
    if (!match.kickoff_time) {
      return false
    }

    const kickoff =
      new Date(
        match.kickoff_time,
      ).getTime()

    return (
      !Number.isNaN(kickoff) &&
      currentTime >= kickoff
    )
  }

  function hasResult(match) {
    return (
      match.team_score !== null &&
      match.team_score !== undefined &&
      match.opponent_score !== null &&
      match.opponent_score !== undefined
    )
  }

  function resultLabel(match) {
    if (!hasResult(match)) {
      return ''
    }

    if (
      match.team_score >
      match.opponent_score
    ) {
      return 'Win'
    }

    if (
      match.team_score <
      match.opponent_score
    ) {
      return 'Loss'
    }

    return 'Draw'
  }

  function shouldDisplayMatch(match) {
    const kickoff =
      new Date(
        match.kickoff_time,
      ).getTime()

    if (Number.isNaN(kickoff)) {
      return false
    }

    // Future fixture:
    // always show.
    if (kickoff > currentTime) {
      return true
    }

    // Match has kicked off but ratings/MOTM
    // have not been finalised yet:
    // keep it visible.
    if (!match.ratings_finalised_at) {
      return true
    }

    const finalisedAt =
      new Date(
        match.ratings_finalised_at,
      ).getTime()

    if (Number.isNaN(finalisedAt)) {
      return true
    }

    const removeFromFixturesAt =
      finalisedAt +
      COMPLETED_MATCH_DISPLAY_HOURS *
        60 *
        60 *
        1000

    // Keep the completed match visible
    // for 24 hours after MOTM finalisation.
    return (
      currentTime <
      removeFromFixturesAt
    )
  }

  function sortMatches(
    firstMatch,
    secondMatch,
  ) {
    const firstStarted =
      hasMatchStarted(firstMatch)

    const secondStarted =
      hasMatchStarted(secondMatch)

    // Upcoming matches always sit above
    // locked/completed matches.
    if (
      firstStarted !==
      secondStarted
    ) {
      return firstStarted
        ? 1
        : -1
    }

    const firstKickoff =
      new Date(
        firstMatch.kickoff_time,
      ).getTime()

    const secondKickoff =
      new Date(
        secondMatch.kickoff_time,
      ).getTime()

    // Upcoming:
    // nearest fixture first.
    if (!firstStarted) {
      return (
        firstKickoff -
        secondKickoff
      )
    }

    // Locked/recent:
    // most recent match first.
    return (
      secondKickoff -
      firstKickoff
    )
  }

  const visibleMatches =
    matches
      .filter(
        shouldDisplayMatch,
      )
      .sort(sortMatches)

  const upcomingMatches =
    visibleMatches.filter(
      (match) =>
        !hasMatchStarted(match),
    )

  const lockedMatches =
    visibleMatches.filter(
      hasMatchStarted,
    )

  const isManager =
    currentUser?.account_type ===
      'manager' &&
    currentUser?.manager_verification_status ===
      'approved'

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading matches...
      </p>
    )
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <div className="matches-heading">
            <div className="dashboard-welcome">
              <p className="dashboard-label">
                Fixtures
              </p>

              <h1>
                Matches
              </h1>

              <p>
                {isManager
                  ? 'View upcoming fixtures and recent match activity.'
                  : 'View upcoming fixtures and recent matches.'}
              </p>
            </div>

            {isManager && (
              <button
                className="create-match-button"
                type="button"
                onClick={() =>
                  navigate(
                    `/teams/${teamId}/matches/new`,
                  )
                }
              >
                Create fixture
              </button>
            )}
          </div>

          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {!errorMessage &&
            visibleMatches.length === 0 && (
              <article className="empty-team-card">
                <div className="card-icon">
                  📅
                </div>

                <h2>
                  No fixtures
                </h2>

                <p>
                  {isManager
                    ? 'Create your first fixture to notify your squad.'
                    : 'Your manager has not scheduled a fixture yet.'}
                </p>

                {isManager && (
                  <button
                    className="create-match-button"
                    type="button"
                    onClick={() =>
                      navigate(
                        `/teams/${teamId}/matches/new`,
                      )
                    }
                  >
                    Create fixture
                  </button>
                )}
              </article>
            )}

          {/* ========================================
              UPCOMING MATCHES
          ======================================== */}

          {!errorMessage &&
            upcomingMatches.length > 0 && (
              <section className="matches-section">
                <div className="matches-section-heading">
                  <p className="dashboard-label">
                    Upcoming
                  </p>

                  <h2>
                    Upcoming fixtures
                  </h2>
                </div>

                <div className="matches-list">
                  {upcomingMatches.map(
                    (match) => (
                      <article
                        className="match-card"
                        key={match.id}
                      >
                        <div className="match-date">
                          <span>
                            Kick-off
                          </span>

                          <strong>
                            {formatKickoffTime(
                              match.kickoff_time,
                            )}
                          </strong>
                        </div>

                        <div className="match-details">
                          <span className="match-type-badge">
                            {match.match_type}
                          </span>

                          <h2>
                            vs {match.opponent}
                          </h2>

                          <p>
                            📍 {match.location}
                          </p>
                        </div>

                        <button
                          className="view-match-button"
                          type="button"
                          onClick={() =>
                            navigate(
                              `/teams/${teamId}/matches/${match.id}`,
                            )
                          }
                        >
                          View fixture
                        </button>
                      </article>
                    ),
                  )}
                </div>
              </section>
            )}

          {/* ========================================
              LOCKED / RECENT MATCHES
          ======================================== */}

          {!errorMessage &&
            lockedMatches.length > 0 && (
              <section className="matches-section recent-matches-section">
                <div className="matches-section-heading">
                  <p className="dashboard-label">
                    Recent
                  </p>

                  <h2>
                    Recent matches
                  </h2>

                  <p>
                    Matchday actions are
                    locked after kick-off.
                    Payments, ratings and
                    results remain available.
                  </p>
                </div>

                <div className="matches-list">
                  {lockedMatches.map(
                    (match) => {
                      const finalised =
                        Boolean(
                          match.ratings_finalised_at,
                        )

                      const resultAvailable =
                        hasResult(match)

                      const outcome =
                        resultLabel(match)

                      return (
                        <article
                          className="match-card match-card-locked"
                          key={match.id}
                        >
                          <div className="match-date">
                            <span>
                              {resultAvailable
                                ? 'Final score'
                                : finalised
                                  ? 'Completed'
                                  : 'Kick-off'}
                            </span>

                            {resultAvailable ? (
                              <strong className="recent-match-score">
                                {match.team_score}
                                {' - '}
                                {match.opponent_score}
                              </strong>
                            ) : (
                              <strong>
                                {formatKickoffTime(
                                  match.kickoff_time,
                                )}
                              </strong>
                            )}
                          </div>

                          <div className="match-details">
                            <div className="match-card-badges">
                              <span className="match-type-badge">
                                {match.match_type}
                              </span>

                              <span className="match-locked-badge">
                                {finalised
                                  ? '🏆 Completed'
                                  : '🔒 Locked'}
                              </span>

                              {resultAvailable && (
                                <span
                                  className={`match-result-badge match-result-badge-${outcome.toLowerCase()}`}
                                >
                                  {outcome}
                                </span>
                              )}
                            </div>

                            <h2>
                              vs {match.opponent}
                            </h2>

                            {resultAvailable && (
                              <p className="recent-match-result">
                                <strong>
                                  {match.team_score}
                                  {' - '}
                                  {match.opponent_score}
                                </strong>

                                <span>
                                  {' '}
                                  · {outcome}
                                </span>
                              </p>
                            )}

                            <p>
                              📍 {match.location}
                            </p>
                          </div>

                          <button
                            className="view-match-button"
                            type="button"
                            onClick={() =>
                              navigate(
                                `/teams/${teamId}/matches/${match.id}`,
                              )
                            }
                          >
                            {resultAvailable ||
                            finalised
                              ? 'View match & results'
                              : 'View match'}
                          </button>
                        </article>
                      )
                    },
                  )}
                </div>
              </section>
            )}
        </section>
      </main>
    </>
  )
}

export default MatchesPage
