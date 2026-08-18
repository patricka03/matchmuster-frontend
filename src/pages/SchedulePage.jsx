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

function SchedulePage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [matches, setMatches] = useState([])
  const [trainings, setTrainings] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const isApprovedManager =
    currentUser?.account_type === 'manager' &&
    currentUser?.manager_verification_status === 'approved'

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
          trainingsResponse.status === 403
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const matchesData =
          await matchesResponse.json()

        const trainingsData =
          await trainingsResponse.json()

        const userData =
          await userResponse.json()

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

        setCurrentUser(
          userData.user || userData,
        )
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

  const schedule = useMemo(() => {
    const fixtureItems =
      matches.map((match) => ({
        id: `match-${match.id}`,
        recordId: match.id,
        type: 'match',
        dateTime: match.kickoff_time,
        title: `vs ${match.opponent}`,
        location: match.location,
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
            Date.now(),
      )
      .sort(
        (firstItem, secondItem) =>
          new Date(firstItem.dateTime).getTime() -
          new Date(secondItem.dateTime).getTime(),
      )
  }, [
    matches,
    trainings,
  ])

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
                Upcoming schedule
              </h1>

              <p>
                Matches and training,
                together in one place.
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
            schedule.length === 0 && (
              <article className="empty-team-card">
                <div className="card-icon">
                  📅
                </div>

                <h2>
                  Nothing scheduled
                </h2>

                <p>
                  {isApprovedManager
                    ? 'Create a fixture or training session for your team.'
                    : 'Your manager has not added anything upcoming yet.'}
                </p>
              </article>
            )}

          {!errorMessage &&
            schedule.length > 0 && (
              <section className="matches-list">
                {schedule.map(
                  (item) => (
                    <article
                      className="match-card"
                      key={item.id}
                    >
                      <div className="match-date">
                        <span>
                          {item.type ===
                          'match'
                            ? 'Fixture'
                            : 'Training'}
                        </span>

                        <strong>
                          {formatDate(
                            item.dateTime,
                          )}
                        </strong>
                      </div>

                      <div className="match-details">
                        <h2>
                          {item.title}
                        </h2>

                        <p>
                          {item.type ===
                          'training' ? (
                            <Dumbbell
                              size={15}
                              aria-hidden="true"
                            />
                          ) : (
                            <CalendarDays
                              size={15}
                              aria-hidden="true"
                            />
                          )}

                          {' '}
                          {formatTime(
                            item.dateTime,
                          )}
                        </p>

                        {item.type ===
                          'training' &&
                          item.meetTime && (
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
                        View

                        <ChevronRight
                          size={16}
                          aria-hidden="true"
                        />
                      </button>
                    </article>
                  ),
                )}
              </section>
            )}
        </section>
      </main>
    </>
  )
}

export default SchedulePage
