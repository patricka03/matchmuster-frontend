import '../styles/RemainingPages.mobile.css'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  CalendarDays,
  Check,
  Clock,
  X,
} from 'lucide-react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

import './TrainingPage.css'
import './TrainingPage.mobile.css'

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

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

  const [
    savingAvailability,
    setSavingAvailability,
  ] = useState(false)

  const [
    deletingTraining,
    setDeletingTraining,
  ] = useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  // ========================================
  // MAP
  // ========================================

  const [showMap, setShowMap] =
    useState(false)

  const mapContainerRef =
    useRef(null)

  const mapRef =
    useRef(null)

  // ========================================
  // USER TYPES
  // ========================================

  const isPlayer =
    currentUser?.account_type ===
    'player'

  const isApprovedManager =
    currentUser?.account_type ===
      'manager' &&
    currentUser
      ?.manager_verification_status ===
      'approved'

  // ========================================
  // SESSION
  // ========================================

  async function clearTrainingSession() {
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
  // LOAD TRAINING
  // ========================================

  useEffect(() => {
    async function loadTraining() {
      const token =
        getAuthToken()

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
          trainingResponse.status ===
            401 ||
          userResponse.status ===
            401
        ) {
          await clearTrainingSession()

          return
        }

        if (
          trainingResponse.status ===
            403 ||
          userResponse.status ===
            403
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

        // ========================================
        // PLAYER AVAILABILITY
        // ========================================

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

          if (
            response.status === 401
          ) {
            await clearTrainingSession()

            return
          }

          if (
            response.status === 403
          ) {
            navigate(
              '/dashboard',
              {
                replace: true,
              },
            )

            return
          }

          if (response.ok) {
            const data =
              await response.json()

            setMyAvailability(
              data.availability ??
                data,
            )
          }
        }

        // ========================================
        // MANAGER ATTENDANCE
        // ========================================

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

          if (
            response.status === 401
          ) {
            await clearTrainingSession()

            return
          }

          if (
            response.status === 403
          ) {
            navigate(
              '/dashboard',
              {
                replace: true,
              },
            )

            return
          }

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

  // ========================================
  // LOCATION COORDINATES
  // ========================================

  const latitude =
    training?.latitude !== null &&
    training?.latitude !== undefined
      ? Number(training.latitude)
      : null

  const longitude =
    training?.longitude !== null &&
    training?.longitude !== undefined
      ? Number(training.longitude)
      : null

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)

  // ========================================
  // MAPBOX MAP
  // ========================================

  useEffect(() => {
    if (
      !showMap ||
      !hasCoordinates ||
      !MAPBOX_TOKEN ||
      !mapContainerRef.current
    ) {
      return
    }

    if (mapRef.current) {
      return
    }

    const map =
      new mapboxgl.Map({
        accessToken:
          MAPBOX_TOKEN,

        container:
          mapContainerRef.current,

        style:
          'mapbox://styles/mapbox/streets-v12',

        center: [
          longitude,
          latitude,
        ],

        zoom: 15,
      })

    map.addControl(
      new mapboxgl.NavigationControl(),
      'top-right',
    )

    new mapboxgl.Marker()
      .setLngLat([
        longitude,
        latitude,
      ])
      .addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [
    showMap,
    hasCoordinates,
    latitude,
    longitude,
  ])

  // ========================================
  // DIRECTIONS
  // ========================================

  const directionCoordinates =
    hasCoordinates
      ? `${latitude},${longitude}`
      : ''

  const encodedDirectionCoordinates =
    encodeURIComponent(
      directionCoordinates,
    )

  const appleMapsUrl =
    hasCoordinates
      ? `https://maps.apple.com/directions?destination=${encodedDirectionCoordinates}&mode=driving`
      : null

  const googleMapsUrl =
    hasCoordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodedDirectionCoordinates}&travelmode=driving`
      : null

  const wazeUrl =
    hasCoordinates
      ? `https://waze.com/ul?ll=${encodedDirectionCoordinates}&navigate=yes&utm_source=matchmuster`
      : null

  // ========================================
  // PLAYER AVAILABILITY
  // ========================================

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
      getAuthToken()

    if (!token) {
      await clearTrainingSession()

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

      if (
        response.status === 401
      ) {
        await clearTrainingSession()

        return
      }

      if (
        response.status === 403
      ) {
        navigate(
          '/dashboard',
          {
            replace: true,
          },
        )

        return
      }

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

  // ========================================
  // DELETE TRAINING
  // ========================================

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
      getAuthToken()

    if (!token) {
      await clearTrainingSession()

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
        await clearTrainingSession()

        return
      }

      if (
        response.status === 403
      ) {
        navigate(
          '/dashboard',
          {
            replace: true,
          },
        )

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

  // ========================================
  // DATE / TIME
  // ========================================

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

  // ========================================
  // AVAILABILITY LABEL
  // ========================================

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

    return 'Pending'
  }

  // ========================================
  // MANAGER COUNTS
  // ========================================

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

      <main className="dashboard-page training-page mm-minimal-page">
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
              {/* ========================================
                  PAGE HEADING
              ======================================== */}

              <div className="dashboard-welcome">
                <p className="dashboard-label">
                  Training
                </p>

                <h1 className="mm-page-title">
                  {training.title}
                </h1>

                <p>
                  Session details and player availability.
                </p>
              </div>

              {/* ========================================
                  TRAINING DETAILS
              ======================================== */}

              <article className="fixture-details-card">
                <div className="fixture-details-header">
                  <span className="match-type-badge">
                    Training
                  </span>

                  <h2>
                    Session information
                  </h2>
                </div>

                <div className="fixture-information">
                  {/* ========================================
                      DATE
                  ======================================== */}

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

                  {/* ========================================
                      START TIME
                  ======================================== */}

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

                  {/* ========================================
                      MEET TIME
                  ======================================== */}

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

                  {/* ========================================
                      TRAINING INFORMATION
                  ======================================== */}

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

                  {/* ========================================
                      LOCATION
                  ======================================== */}

                  <div className="fixture-information-item fixture-location-item">
                    <span>
                      Location
                    </span>

                    <div className="match-location-content">
                      <div className="match-location-address">
                        <span
                          className="match-location-pin"
                          aria-hidden="true"
                        >
                          📍
                        </span>

                        <strong>
                          {training.location ||
                            'Location TBC'}
                        </strong>
                      </div>

                      {hasCoordinates && (
                        <>
                          <button
                            className="view-map-button"
                            type="button"
                            aria-expanded={
                              showMap
                            }
                            onClick={() =>
                              setShowMap(
                                (
                                  currentValue,
                                ) =>
                                  !currentValue,
                              )
                            }
                          >
                            {showMap
                              ? 'Hide map'
                              : 'View map'}
                          </button>

                          {showMap && (
                            <div
                              className="match-map-container"
                              ref={
                                mapContainerRef
                              }
                              aria-label={`Map showing ${training.location}`}
                            />
                          )}

                          <div className="match-directions">
                            <span className="match-directions-label">
                              Get directions:
                            </span>

                            <div className="match-directions-links">
                              <a
                                className="match-direction-link"
                                href={
                                  appleMapsUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Apple Maps
                              </a>

                              <a
                                className="match-direction-link"
                                href={
                                  googleMapsUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Google Maps
                              </a>

                              <a
                                className="match-direction-link"
                                href={
                                  wazeUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Waze
                              </a>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>

              {/* ========================================
                  MANAGER ACTIONS
              ======================================== */}

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

              {/* ========================================
                  PLAYER AVAILABILITY
              ======================================== */}

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

              {/* ========================================
                  MANAGER AVAILABILITY
              ======================================== */}

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
                        Pending
                      </span>

                      <strong>
                        {pendingCount}
                      </strong>
                    </article>
                  </section>

                  <section className="availability-groups">
                    {[
                      {
                        key: 'available',
                        title: 'Available',
                      },

                      {
                        key: 'unavailable',
                        title: 'Unavailable',
                      },

                      {
                        key: 'pending',
                        title: 'Pending',
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
