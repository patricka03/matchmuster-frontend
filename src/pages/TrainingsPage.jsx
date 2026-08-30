import '../styles/RemainingPages.mobile.css'
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
} from 'lucide-react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

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

  // ========================================
  // SESSION
  // ========================================

  async function clearTrainingsSession() {
    await clearAuthToken()

    localStorage.removeItem(
      'currentUser',
    )

    localStorage.removeItem(
      'activeTeamId',
    )

    localStorage.removeItem(
      'activeTeamName',
    )

    navigate('/login', {
      replace: true,
    })
  }

  // ========================================
  // LOAD TRAININGS
  // ========================================

  useEffect(() => {
    async function loadTrainings() {
      const token =
        getAuthToken()

      if (!token) {
        await clearTrainingsSession()

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
          await clearTrainingsSession()

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
  }, [
    navigate,
    teamId,
  ])

  // ========================================
  // DATE / TIME
  // ========================================

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

  // ========================================
  // UPCOMING TRAININGS
  // ========================================

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

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading training...
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

      <main className="dashboard-page mm-minimal-page">
        <section className="dashboard-content">
          <div className="matches-heading">
            <div>
              <p className="dashboard-label">
                Team sessions
              </p>

              <h1 className="mm-page-title">
                Training
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
                New training
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
                        Open

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
