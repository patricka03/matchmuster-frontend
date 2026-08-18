import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Dumbbell,
  MapPin,
} from 'lucide-react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

const COMPLETED_MATCH_DISPLAY_HOURS = 24

function SchedulePage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [matches, setMatches] = useState([])
  const [trainings, setTrainings] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentTime, setCurrentTime] = useState(Date.now())

  const isApprovedManager =
    currentUser?.account_type === 'manager' &&
    currentUser?.manager_verification_status === 'approved'

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadSchedule() {
      const token = localStorage.getItem('token')

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

      setLoading(true)
      setErrorMessage('')

      try {
        const [
          matchesResponse,
          trainingsResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/matches`,
            { headers },
          ),

          fetch(
            `${API_URL}/teams/${teamId}/trainings`,
            { headers },
          ),

          fetch(
            `${API_URL}/users/me`,
            { headers },
          ),
        ])

        if (
          matchesResponse.status === 401 ||
          trainingsResponse.status === 401 ||
          userResponse.status === 401
        ) {
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')

          navigate('/login', {
            replace: true,
          })

          return
        }

        if (
          matchesResponse.status === 403 ||
          trainingsResponse.status === 403 ||
          userResponse.status === 403
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const [
          matchesData,
          trainingsData,
          userData,
        ] = await Promise.all([
          matchesResponse.json().catch(() => ({})),
          trainingsResponse.json().catch(() => ({})),
          userResponse.json().catch(() => ({})),
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
              'Unable to load training.',
          )
        }

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              'Unable to load your account.',
          )
        }

        const user =
          userData.user || userData

        const isPlayer =
          user.account_type === 'player'

        const isManager =
          user.account_type === 'manager' &&
          user.manager_verification_status === 'approved'

        if (!isPlayer && !isManager) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        setMatches(
          Array.isArray(matchesData)
            ? matchesData
            : matchesData.matches || [],
        )

        setTrainings(
          Array.isArray(trainingsData)
            ? trainingsData
            : trainingsData.trainings || [],
        )

        setCurrentUser(user)
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load schedule.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
  }, [
    navigate,
    teamId,
  ])

  const upcomingSchedule = useMemo(() => {
    const fixtureItems =
      matches.map((match) => ({
        id: `match-${match.id}`,
        recordId: match.id,
        type: 'match',
        dateTime: match.kickoff_time,
        title: `vs ${match.opponent}`,
        location: match.location,
        matchType: match.match_type,
      }))

    const trainingItems =
      trainings.map((training) => ({
        id: `training-${training.id}`,
        recordId: training.id,
        type: 'training',
        dateTime: training.starts_at,
        meetTime: training.meet_time,
        title: training.title,
        location: training.location,
      }))

    return [
      ...fixtureItems,
      ...trainingItems,
    ]
      .filter(
        (item) =>
          item.dateTime &&
          new Date(item.dateTime).getTime() >
            currentTime,
      )
      .sort(
        (firstItem, secondItem) =>
          new Date(firstItem.dateTime).getTime() -
          new Date(secondItem.dateTime).getTime(),
      )
  }, [
    currentTime,
    matches,
    trainings,
  ])

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

  function shouldDisplayRecentMatch(match) {
    if (!hasMatchStarted(match)) {
      return false
    }

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

    const removeFromScheduleAt =
      finalisedAt +
      COMPLETED_MATCH_DISPLAY_HOURS *
        60 *
        60 *
        1000

    return currentTime < removeFromScheduleAt
  }

  const recentMatches =
    matches
      .filter(
        shouldDisplayRecentMatch,
      )
      .sort(
        (firstMatch, secondMatch) =>
          new Date(
            secondMatch.kickoff_time,
          ).getTime() -
          new Date(
            firstMatch.kickoff_time,
          ).getTime(),
      )

  function formatDate(dateTime) {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      },
    ).format(
      new Date(dateTime),
    )
  }

  function formatTime(dateTime) {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(dateTime),
    )
  }

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

  function openItem(item) {
    if (item.type === 'match') {
      navigate(
        `/teams/${teamId}/matches/${item.recordId}`,
      )

      return
    }

    navigate(
      `/teams/${teamId}/trainings/${item.recordId}`,
    )
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading schedule...
      </p>
    )
  }

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <BackButton
            to="/dashboard"
            label="Back to dashboard"
          />

          <div className="matches-heading">
            <div>
              <p className="dashboard-label">
                Schedule
              </p>

              <h1>
                Schedule
              </h1>

              <p>
                Upcoming fixtures and training,
                with recent match activity below.
              </p>
            </div>

            {isApprovedManager && (
              <div className="match-form-actions">
                <button
                  type="button"
                  className="create-match-button"
                  onClick={() =>
                    navigate(
                      `/teams/${teamId}/matches/new`,
                    )
                  }
                >
                  Fixture
                </button>

                <button
                  type="button"
                  className="create-match-button"
                  onClick={() =>
                    navigate(
                      `/teams/${teamId}/trainings/new`,
                    )
                  }
                >
                  Training
                </button>
              </div>
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
            upcomingSchedule.length > 0 && (
              <section className="matches-section">
                <div className="matches-section-heading">
                  <p className="dashboard-label">
                    Upcoming
                  </p>

                  <h2>
                    Upcoming schedule
                  </h2>

                  <p>
                    Your next fixtures and training sessions,
                    in date order.
                  </p>
                </div>

                <div className="matches-list">
                  {upcomingSchedule.map(
                    (item) => (
                      <article
                        className="match-card"
                        key={item.id}
                      >
                        <div className="match-date">
                          <span>
                            {item.type ===
                            'match'
                              ? 'Kick-off'
                              : 'Training'}
                          </span>

                          <strong>
                            {formatDate(
                              item.dateTime,
                            )}
                            {' · '}
                            {formatTime(
                              item.dateTime,
                            )}
                          </strong>
                        </div>

                        <div className="match-details">
                          {item.type === 'match' &&
                            item.matchType && (
                              <span className="match-type-badge">
                                {item.matchType}
                              </span>
                            )}

                          {item.type === 'training' && (
                            <span className="match-type-badge">
                              Training
                            </span>
                          )}

                          <h2>
                            {item.title}
                          </h2>

                          {item.type ===
                          'training' ? (
                            <>
                              <p>
                                <Dumbbell
                                  size={15}
                                  aria-hidden="true"
                                />

                                {' '}
                                Starts{' '}
                                {formatTime(
                                  item.dateTime,
                                )}
                              </p>

                              {item.meetTime && (
                                <p>
                                  <Clock
                                    size={15}
                                    aria-hidden="true"
                                  />

                                  {' '}
                                  Meet{' '}
                                  {formatTime(
                                    item.meetTime,
                                  )}
                                </p>
                              )}
                            </>
                          ) : (
                            <p>
                              <CalendarDays
                                size={15}
                                aria-hidden="true"
                              />

                              {' '}
                              {formatKickoffTime(
                                item.dateTime,
                              )}
                            </p>
                          )}

                          <p>
                            <MapPin
                              size={15}
                              aria-hidden="true"
                            />

                            {' '}
                            {item.location ||
                              'Location TBC'}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="view-match-button"
                          onClick={() =>
                            openItem(item)
                          }
                        >
                          {item.type === 'match'
                            ? 'View fixture'
                            : 'View training'}

                          <ChevronRight
                            size={16}
                            aria-hidden="true"
                          />
                        </button>
                      </article>
                    ),
                  )}
                </div>
              </section>
            )}

          {!errorMessage &&
            upcomingSchedule.length === 0 && (
              <article className="empty-team-card">
                <div className="card-icon">
                  📅
                </div>

                <h2>
                  Nothing upcoming
                </h2>

                <p>
                  {isApprovedManager
                    ? 'Create a fixture or training session for your team.'
                    : 'Your manager has not added anything upcoming yet.'}
                </p>
              </article>
            )}

          {!errorMessage &&
            recentMatches.length > 0 && (
              <section className="matches-section recent-matches-section">
                <div className="matches-section-heading">
                  <p className="dashboard-label">
                    Previous
                  </p>

                  <h2>
                    Recent fixtures
                  </h2>

                  <p>
                    Recent match results, ratings and payment
                    activity remain available here.
                  </p>
                </div>

                <div className="matches-list">
                  {recentMatches.map(
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
                              {match.match_type && (
                                <span className="match-type-badge">
                                  {match.match_type}
                                </span>
                              )}

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
                              <MapPin
                                size={15}
                                aria-hidden="true"
                              />

                              {' '}
                              {match.location ||
                                'Location TBC'}
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

                            <ChevronRight
                              size={16}
                              aria-hidden="true"
                            />
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

export default SchedulePage
