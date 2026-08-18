import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Check,
  Clock,
  MapPin,
  X,
} from 'lucide-react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'
import './TrainingPage.css'

function TrainingPage() {
  const navigate = useNavigate()

  const {
    teamId,
    trainingId,
  } = useParams()

  const [training, setTraining] =
    useState(null)

  const [currentUser, setCurrentUser] =
    useState(null)

  const [myAvailability, setMyAvailability] =
    useState(null)

  const [attendance, setAttendance] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [savingAvailability, setSavingAvailability] =
    useState(false)

  const [deletingTraining, setDeletingTraining] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const isPlayer =
    currentUser?.account_type ===
    'player'

  const isApprovedManager =
    currentUser?.account_type ===
      'manager' &&
    currentUser
      ?.manager_verification_status ===
      'approved'

  useEffect(() => {
    async function loadTraining() {
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
          trainingResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/trainings/${trainingId}`,
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
          trainingResponse.status === 401 ||
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
          trainingResponse.status === 403
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const trainingData =
          await trainingResponse.json()

        const userData =
          await userResponse.json()

        if (!trainingResponse.ok) {
          throw new Error(
            trainingData.error ||
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
          userData.user ||
          userData

        setTraining(trainingData)
        setCurrentUser(user)

        const availabilityUrl =
          `${API_URL}/teams/${teamId}/trainings/${trainingId}/training_availabilities`

        if (
          user.account_type ===
          'player'
        ) {
          const response =
            await fetch(
              `${availabilityUrl}/mine`,
              {
                headers,
              },
            )

          if (response.ok) {
            const data =
              await response.json()

            setMyAvailability(
              data.availability ??
                data,
            )
          }
        }

        if (
          user.account_type ===
            'manager' &&
          user.manager_verification_status ===
            'approved'
        ) {
          const response =
            await fetch(
              availabilityUrl,
              {
                headers,
              },
            )

          if (response.ok) {
            const data =
              await response.json()

            setAttendance(
              data.players || [],
            )
          }
        }
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load training.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadTraining()
  }, [
    navigate,
    teamId,
    trainingId,
  ])

  async function handleAvailability(
    status,
  ) {
    if (
      !isPlayer ||
      savingAvailability
    ) {
      return
    }

    const token =
      localStorage.getItem('token')

    if (!token) {
      navigate('/login')
      return
    }

    const baseUrl =
      `${API_URL}/teams/${teamId}/trainings/${trainingId}/training_availabilities`

    const existingId =
      myAvailability?.id

    setSavingAvailability(true)
    setErrorMessage('')

    try {
      const response =
        await fetch(
          existingId
            ? `${baseUrl}/${existingId}`
            : baseUrl,
          {
            method:
              existingId
                ? 'PATCH'
                : 'POST',

            headers: {
              Accept:
                'application/json',

              'Content-Type':
                'application/json',

              Authorization:
                token,
            },

            body:
              JSON.stringify({
                training_availability: {
                  status,
                },
              }),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.errors?.join(', ') ||
            data.error ||
            'Unable to update your availability.',
        )
      }

      setMyAvailability(data)
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to update availability.',
      )
    } finally {
      setSavingAvailability(false)
    }
  }

  async function handleDeleteTraining() {
    if (
      !isApprovedManager ||
      deletingTraining
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Delete ${training.title}? This training session will be permanently removed.`,
      )

    if (!confirmed) {
      return
    }

    const token =
      localStorage.getItem('token')

    if (!token) {
      navigate('/login', {
        replace: true,
      })

      return
    }

    setDeletingTraining(true)
    setErrorMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/teams/${teamId}/trainings/${trainingId}`,
          {
            method: 'DELETE',

            headers: {
              Accept:
                'application/json',

              Authorization:
                token,
            },
          },
        )

      if (
        response.status === 401
      ) {
        localStorage.removeItem(
          'token',
        )

        localStorage.removeItem(
          'currentUser',
        )

        navigate('/login', {
          replace: true,
        })

        return
      }

      if (
        response.status === 403
      ) {
        navigate('/dashboard', {
          replace: true,
        })

        return
      }

      if (!response.ok) {
        let message =
          'Unable to delete training.'

        try {
          const data =
            await response.json()

          message =
            data.error ||
            data.errors?.join(', ') ||
            message
        } catch {
          // 204 responses have no JSON.
        }

        throw new Error(
          message,
        )
      }

      navigate(
        `/teams/${teamId}/trainings`,
        {
          replace: true,
        },
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to delete training.',
      )
    } finally {
      setDeletingTraining(false)
    }
  }

  function formatDate(dateTime) {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
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

  function availabilityLabel() {
    if (
      myAvailability?.status ===
      'available'
    ) {
      return 'Available'
    }

    if (
      myAvailability?.status ===
      'unavailable'
    ) {
      return 'Unavailable'
    }

    return 'Awaiting response'
  }

  const availableCount =
    attendance.filter(
      (player) =>
        player.status ===
        'available',
    ).length

  const unavailableCount =
    attendance.filter(
      (player) =>
        player.status ===
        'unavailable',
    ).length

  const pendingCount =
    attendance.filter(
      (player) =>
        player.status ===
        'pending',
    ).length

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

      <main className="dashboard-page training-page">
        <section className="dashboard-content">
          <BackButton
            to={`/teams/${teamId}/trainings`}
            label="Back to training"
          />

          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {training && (
            <>
              <div className="dashboard-welcome">
                <p className="dashboard-label">
                  Training
                </p>

                <h1>
                  {training.title}
                </h1>
              </div>

              <article className="fixture-details-card">
                <div className="fixture-details-header">
                  <span className="match-type-badge">
                    Training
                  </span>

                  <h2>
                    {training.title}
                  </h2>
                </div>

                <div className="fixture-information">
                  <div className="fixture-information-item">
                    <span>
                      Date
                    </span>

                    <strong>
                      {formatDate(
                        training.starts_at,
                      )}
                    </strong>
                  </div>

                  <div className="fixture-information-item">
                    <span>
                      Starts
                    </span>

                    <strong className="training-detail-value">
                      <Clock
                        size={16}
                        aria-hidden="true"
                      />

                      {formatTime(
                        training.starts_at,
                      )}
                    </strong>
                  </div>

                  <div className="fixture-information-item">
                    <span>
                      Meet time
                    </span>

                    <strong className="training-detail-value">
                      <CalendarDays
                        size={16}
                        aria-hidden="true"
                      />

                      {formatTime(
                        training.meet_time,
                      )}
                    </strong>
                  </div>

                  <div className="fixture-information-item fixture-location-item">
                    <span>
                      Location
                    </span>

                    <strong className="training-detail-value">
                      <MapPin
                        size={16}
                        aria-hidden="true"
                      />

                      {training.location}
                    </strong>
                  </div>

                  {training.description && (
                    <div className="fixture-information-item fixture-description">
                      <span>
                        Training information
                      </span>

                      <strong>
                        {training.description}
                      </strong>
                    </div>
                  )}
                </div>
              </article>

              {isApprovedManager && (
                <div className="fixture-management-actions">
                  <button
                    type="button"
                    className="edit-match-button"
                    onClick={() =>
                      navigate(
                        `/teams/${teamId}/trainings/${trainingId}/edit`,
                      )
                    }
                  >
                    Edit training
                  </button>

                  <button
                    type="button"
                    className="cancel-fixture-button"
                    onClick={
                      handleDeleteTraining
                    }
                    disabled={
                      deletingTraining
                    }
                  >
                    {deletingTraining
                      ? 'Deleting...'
                      : 'Delete training'}
                  </button>
                </div>
              )}

              {isPlayer && (
                <section className="training-player-availability">
                  <div className="training-player-availability-status">
                    <span>
                      Your availability
                    </span>

                    <strong
                      className={`training-availability-status-text ${
                        myAvailability?.status ||
                        'pending'
                      }`}
                    >
                      {availabilityLabel()}
                    </strong>
                  </div>

                  <div className="training-player-availability-actions">
                    <button
                      type="button"
                      className={`training-availability-button available ${
                        myAvailability?.status ===
                        'available'
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() =>
                        handleAvailability(
                          'available',
                        )
                      }
                      disabled={
                        savingAvailability
                      }
                    >
                      <Check
                        size={18}
                        aria-hidden="true"
                      />

                      {savingAvailability
                        ? 'Saving...'
                        : 'Available'}
                    </button>

                    <button
                      type="button"
                      className={`training-availability-button unavailable ${
                        myAvailability?.status ===
                        'unavailable'
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() =>
                        handleAvailability(
                          'unavailable',
                        )
                      }
                      disabled={
                        savingAvailability
                      }
                    >
                      <X
                        size={18}
                        aria-hidden="true"
                      />

                      {savingAvailability
                        ? 'Saving...'
                        : 'Unavailable'}
                    </button>
                  </div>
                </section>
              )}

              {isApprovedManager && (
                <>
                  <section className="availability-summary">
                    <article className="availability-summary-card available">
                      <span>
                        Available
                      </span>

                      <strong>
                        {availableCount}
                      </strong>
                    </article>

                    <article className="availability-summary-card unavailable">
                      <span>
                        Unavailable
                      </span>

                      <strong>
                        {unavailableCount}
                      </strong>
                    </article>

                    <article className="availability-summary-card pending">
                      <span>
                        Awaiting
                      </span>

                      <strong>
                        {pendingCount}
                      </strong>
                    </article>
                  </section>

                  <section className="availability-groups">
                    {[
                      {
                        key:
                          'available',
                        title:
                          'Available',
                      },
                      {
                        key:
                          'unavailable',
                        title:
                          'Unavailable',
                      },
                      {
                        key:
                          'pending',
                        title:
                          'Awaiting response',
                      },
                    ].map(
                      (group) => {
                        const players =
                          attendance.filter(
                            (player) =>
                              player.status ===
                              group.key,
                          )

                        return (
                          <section
                            className="availability-group"
                            key={
                              group.key
                            }
                          >
                            <div className="availability-group-heading">
                              <h2>
                                {
                                  group.title
                                }
                              </h2>

                              <span>
                                {
                                  players.length
                                }
                              </span>
                            </div>

                            {players.map(
                              (player) => (
                                <article
                                  className="availability-player-card"
                                  key={
                                    player.user_id
                                  }
                                >
                                  <div className="availability-player">
                                    <div className="player-avatar">
                                      {player.first_name
                                        ?.charAt(
                                          0,
                                        )
                                        .toUpperCase()}
                                    </div>

                                    <div>
                                      <h2>
                                        {
                                          player.first_name
                                        }{' '}
                                        {
                                          player.last_name
                                        }
                                      </h2>

                                      <p>
                                        {player.preferred_position ||
                                          'No preferred position'}
                                      </p>
                                    </div>
                                  </div>

                                  <span
                                    className={`availability-status ${group.key}`}
                                  >
                                    {
                                      group.title
                                    }
                                  </span>
                                </article>
                              ),
                            )}
                          </section>
                        )
                      },
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </>
  )
}

export default TrainingPage
