import { useEffect, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
} from 'lucide-react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

function TrainingsPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [trainings, setTrainings] =
    useState([])

  const [currentUser, setCurrentUser] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  const isApprovedManager =
    currentUser?.account_type ===
      'manager' &&
    currentUser
      ?.manager_verification_status ===
      'approved'

  useEffect(() => {
    async function loadTrainings() {
      const token =
        localStorage.getItem('token')

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
          trainingsResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/trainings`,
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
          trainingsResponse.status === 401 ||
          userResponse.status === 401
        ) {
          localStorage.removeItem('token')
          localStorage.removeItem(
            'currentUser',
          )

          navigate('/login', {
            replace: true,
          })

          return
        }

        if (
          trainingsResponse.status === 403
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const trainingsData =
          await trainingsResponse.json()

        const userData =
          await userResponse.json()

        if (!trainingsResponse.ok) {
          throw new Error(
            trainingsData.error ||
              'Unable to load training sessions.',
          )
        }

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              'Unable to load your account.',
          )
        }

        setTrainings(
          Array.isArray(trainingsData)
            ? trainingsData
            : trainingsData.trainings ||
                [],
        )

        setCurrentUser(
          userData.user || userData,
        )
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load training sessions.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadTrainings()
  }, [navigate, teamId])

  function formatDate(startsAt) {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      },
    ).format(
      new Date(startsAt),
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

  const upcomingTrainings =
    trainings
      .filter(
        (training) =>
          new Date(
            training.starts_at,
          ).getTime() >
          Date.now(),
      )
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

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading training...
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
                Training
              </p>

              <h1>
                Training sessions
              </h1>

              <p>
                View upcoming team
                training sessions.
              </p>
            </div>

            {isApprovedManager && (
              <button
                type="button"
                className="create-match-button"
                onClick={() =>
                  navigate(
                    `/teams/${teamId}/trainings/new`,
                  )
                }
              >
                <Plus
                  size={18}
                  aria-hidden="true"
                />

                Create training
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
            upcomingTrainings.length ===
              0 && (
              <article className="empty-team-card">
                <div className="card-icon">
                  🏃
                </div>

                <h2>
                  No upcoming training
                </h2>

                <p>
                  {isApprovedManager
                    ? 'Create a training session for your team.'
                    : 'Your manager has not added an upcoming training session yet.'}
                </p>
              </article>
            )}

          {!errorMessage &&
            upcomingTrainings.length >
              0 && (
              <section className="matches-list">
                {upcomingTrainings.map(
                  (training) => (
                    <article
                      className="match-card"
                      key={
                        training.id
                      }
                    >
                      <div className="match-date">
                        <span>
                          Training
                        </span>

                        <strong>
                          {formatDate(
                            training.starts_at,
                          )}
                        </strong>
                      </div>

                      <div className="match-details">
                        <h2>
                          {
                            training.title
                          }
                        </h2>

                        <p>
                          <Clock
                            size={15}
                            aria-hidden="true"
                          />{' '}
                          Starts{' '}
                          {formatTime(
                            training.starts_at,
                          )}
                        </p>

                        <p>
                          <CalendarDays
                            size={15}
                            aria-hidden="true"
                          />{' '}
                          Meet{' '}
                          {formatTime(
                            training.meet_time,
                          )}
                        </p>

                        <p>
                          <MapPin
                            size={15}
                            aria-hidden="true"
                          />{' '}
                          {
                            training.location
                          }
                        </p>
                      </div>

                      <button
                        type="button"
                        className="view-match-button"
                        onClick={() =>
                          navigate(
                            `/teams/${teamId}/trainings/${training.id}`,
                          )
                        }
                      >
                        View training

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

export default TrainingsPage
