import '../styles/RemainingPages.mobile.css'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

function MatchPage() {
  const navigate = useNavigate()
  const { teamId, matchId } = useParams()

  const [match, setMatch] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [playerAvailability, setPlayerAvailability] = useState(null)
  const [ratingStatus, setRatingStatus] = useState(null)

  const [currentTime, setCurrentTime] = useState(() => Date.now())

  const [showMap, setShowMap] = useState(false)

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearMatchSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  // ========================================
  // PAGE CLOCK
  // ========================================

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // ========================================
  // LOAD MATCH + USER
  // ========================================

  useEffect(() => {
    async function fetchMatchPage() {
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

      setLoading(true)
      setErrorMessage('')
      setPlayerAvailability(null)

      try {
        const [
          matchResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}`,
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
          matchResponse.status === 401 ||
          userResponse.status === 401
        ) {
          await clearMatchSession()

          return
        }

        if (
          matchResponse.status === 403 ||
          userResponse.status === 403
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const matchData =
          await matchResponse.json()

        const userData =
          await userResponse.json()

        if (!matchResponse.ok) {
          throw new Error(
            matchData.error ||
              'Unable to load the fixture.',
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

        setMatch(
          matchData.match ||
            matchData,
        )

        setCurrentUser(user)

        // ========================================
        // PLAYER AVAILABILITY
        // ========================================

        if (
          user.account_type ===
          'player'
        ) {
          const availabilityResponse =
            await fetch(
              `${API_URL}/teams/${teamId}/matches/${matchId}/availabilities/mine`,
              {
                headers,
              },
            )

          if (
            availabilityResponse.status ===
            401
          ) {
            await clearMatchSession()

            return
          }

          if (
            availabilityResponse.status ===
            403
          ) {
            navigate('/dashboard', {
              replace: true,
            })

            return
          }

          if (
            availabilityResponse.ok
          ) {
            const availabilityData =
              await availabilityResponse.json()

            setPlayerAvailability(
              availabilityData.availability ||
                availabilityData,
            )
          } else if (
            availabilityResponse.status !==
            404
          ) {
            const availabilityError =
              await availabilityResponse.json()

            throw new Error(
              availabilityError.error ||
                'Unable to load your availability.',
            )
          }
        }
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMatchPage()
  }, [
    navigate,
    teamId,
    matchId,
  ])

  // ========================================
  // LOAD RATING STATUS
  // ========================================

  useEffect(() => {
    if (!currentUser) return

    let cancelled = false

    async function fetchRatingStatus() {
      const token = getAuthToken()

      if (!token) return

      try {
        const response = await fetch(
          `${API_URL}/teams/${teamId}/matches/${matchId}/rating_status`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
            },
          },
        )

        if (
          response.status ===
          401
        ) {
          await clearMatchSession()

          return
        }

        if (!response.ok) {
          return
        }

        const data =
          await response.json()

        if (!cancelled) {
          setRatingStatus(data)
        }
      } catch {
        // Match details can still display if
        // rating status temporarily fails.
      }
    }

    fetchRatingStatus()

    const interval = setInterval(
      fetchRatingStatus,
      30000,
    )

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [
    currentUser,
    navigate,
    teamId,
    matchId,
  ])

  // ========================================
  // LOCATION COORDINATES
  // ========================================

  const latitude =
    match?.latitude !== null &&
    match?.latitude !== undefined
      ? Number(match.latitude)
      : null

  const longitude =
    match?.longitude !== null &&
    match?.longitude !== undefined
      ? Number(match.longitude)
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
  // FORMAT DATE
  // ========================================

  function formatKickoffTime(
    kickoffTime,
  ) {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(kickoffTime),
    )
  }

  // ========================================
  // USER TYPES
  // ========================================

  const isApprovedPlayer =
    currentUser?.account_type ===
    'player'

  const isApprovedManager =
    currentUser?.account_type ===
      'manager' &&
    currentUser
      ?.manager_verification_status ===
      'approved'

  // ========================================
  // MATCH TIMING
  // ========================================

  const kickoffTimestamp =
    match?.kickoff_time
      ? new Date(
          match.kickoff_time,
        ).getTime()
      : null

  const matchStarted =
    Boolean(kickoffTimestamp) &&
    currentTime >=
      kickoffTimestamp

  const ratingsOpenTimestamp =
    ratingStatus?.ratings_open_at
      ? new Date(
          ratingStatus.ratings_open_at,
        ).getTime()
      : null

  const ratingsCloseTimestamp =
    ratingStatus?.ratings_close_at
      ? new Date(
          ratingStatus.ratings_close_at,
        ).getTime()
      : null

  const ratingWindowOpen =
    ratingStatus?.eligible &&
    ratingsOpenTimestamp &&
    ratingsCloseTimestamp &&
    currentTime >=
      ratingsOpenTimestamp &&
    currentTime <
      ratingsCloseTimestamp &&
    !ratingStatus.ratings_finalised

  const ratingWindowClosed =
    ratingsCloseTimestamp &&
    currentTime >=
      ratingsCloseTimestamp

  // ========================================
  // MATCH RESULT
  // ========================================

  const hasResult =
    match?.team_score !== null &&
    match?.team_score !== undefined &&
    match?.opponent_score !== null &&
    match?.opponent_score !== undefined

  const teamName =
    match?.team_name ||
    'Your team'

  function resultLabel() {
    if (!hasResult) return ''

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
  // RATING BUTTON
  // ========================================

  function renderRatingAction() {
    if (!matchStarted) return null

    if (!ratingStatus?.eligible) {
      return null
    }

    if (
      ratingsOpenTimestamp &&
      currentTime <
        ratingsOpenTimestamp
    ) {
      return null
    }

    if (
      ratingWindowOpen &&
      !ratingStatus.submitted
    ) {
      return (
        <Link
          className="rate-players-button"
          to={`/teams/${teamId}/matches/${matchId}/ratings`}
        >
          ⭐ Rate players
        </Link>
      )
    }

    if (
      ratingWindowOpen &&
      ratingStatus.submitted
    ) {
      return (
        <span className="ratings-submitted-button">
          ✓ Ratings submitted
        </span>
      )
    }

    if (
      ratingWindowClosed &&
      !ratingStatus.ratings_finalised
    ) {
      return (
        <span className="ratings-submitted-button">
          Voting closed — calculating MOTM...
        </span>
      )
    }

    if (
      ratingStatus.ratings_finalised
    ) {
      return (
        <Link
          className="rate-players-button"
          to={`/teams/${teamId}/matches/${matchId}/ratings`}
        >
          🏆 View ratings &amp; MOTM
        </Link>
      )
    }

    return null
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading fixture...
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
          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {!errorMessage &&
            match && (
              <>
                <BackButton
                  to={`/teams/${teamId}/schedule`}
                  label="Back to schedule"
                />

                <div className="dashboard-welcome">
                  <p className="dashboard-label">
                    Fixture details
                  </p>

                  <h1>
                    Match vs{' '}
                    {match.opponent}
                  </h1>

                  <p>
                    View the full details
                    for this fixture.
                  </p>
                </div>

                <article className="fixture-details-card">
                  <div className="fixture-details-header">
                    <span className="match-type-badge">
                      {match.match_type}
                    </span>

                    <h2>
                      vs {match.opponent}
                    </h2>

                    {/* ========================================
                        MATCH RESULT
                    ======================================== */}

                    {hasResult && (
                      <div className="match-result-display">
                        <p className="dashboard-label">
                          Final result
                        </p>

                        <div className="match-result-display-score">
                          <div className="match-result-side">
                            <span className="match-result-team-name">
                              {teamName}
                            </span>

                            <strong className="match-result-score">
                              {
                                match.team_score
                              }
                            </strong>
                          </div>

                          <span className="match-result-display-divider">
                            -
                          </span>

                          <div className="match-result-side">
                            <span className="match-result-team-name">
                              {
                                match.opponent
                              }
                            </span>

                            <strong className="match-result-score">
                              {
                                match.opponent_score
                              }
                            </strong>
                          </div>
                        </div>

                        <span
                          className={`match-result-outcome match-result-outcome-${resultLabel().toLowerCase()}`}
                        >
                          {resultLabel()}
                        </span>
                      </div>
                    )}

                    {/* ========================================
                        PLAYER ACTIONS
                    ======================================== */}

                    {isApprovedPlayer && (
                      <div
                        className="fixture-management-actions"
                        role="group"
                        aria-label="Player fixture actions"
                      >
                        {!matchStarted && (
                          <Link
                            className="send-availability-button"
                            to={`/teams/${teamId}/matches/${matchId}/availabilities/confirm`}
                          >
                            {playerAvailability
                              ? 'Edit availability'
                              : 'Send availability'}
                          </Link>
                        )}

                        <Link
                          className="manage-payments-button"
                          to={`/teams/${teamId}/matches/${matchId}/payments`}
                        >
                          Payment status
                        </Link>

                        <Link
                          className="select-squad-button"
                          to={`/teams/${teamId}/matches/${matchId}/squad`}
                        >
                          Matchday Squad
                        </Link>

                        {renderRatingAction()}
                      </div>
                    )}

                    {/* ========================================
                        MANAGER ACTIONS
                    ======================================== */}

                    {isApprovedManager && (
                      <div
                        className="fixture-management-actions"
                        role="group"
                        aria-label="Manager fixture actions"
                      >
                        {!matchStarted && (
                          <>
                            <Link
                              className="send-availability-button"
                              to={`/teams/${teamId}/matches/${matchId}/availabilities/new`}
                            >
                              Send availability reminders
                            </Link>

                            <Link
                              className="view-availability-button"
                              to={`/teams/${teamId}/matches/${matchId}/availabilities`}
                            >
                              View availability
                            </Link>

                            <Link
                              className="select-squad-button"
                              to={`/teams/${teamId}/matches/${matchId}/squad`}
                            >
                              Select squad
                            </Link>

                            <Link
                              className="edit-match-button"
                              to={`/teams/${teamId}/matches/${matchId}/edit`}
                            >
                              Edit fixture
                            </Link>

                            <Link
                              className="cancel-fixture-button"
                              to={`/teams/${teamId}/matches/${matchId}/cancel`}
                            >
                              Cancel fixture
                            </Link>
                          </>
                        )}

                        {matchStarted && (
                          <Link
                            className="match-stats-button"
                            to={`/teams/${teamId}/matches/${matchId}/stats`}
                          >
                            📊 Add match stats
                          </Link>
                        )}

                        <Link
                          className="manage-payments-button"
                          to={`/teams/${teamId}/matches/${matchId}/payments`}
                        >
                          Request and track payments
                        </Link>

                        {renderRatingAction()}
                      </div>
                    )}
                  </div>

                  {/* ========================================
                      FIXTURE INFORMATION
                  ======================================== */}

                  <div className="fixture-information">
                    <div className="fixture-information-item">
                      <span>
                        Kick-off
                      </span>

                      <strong>
                        {formatKickoffTime(
                          match.kickoff_time,
                        )}
                      </strong>
                    </div>

                    <div className="fixture-information-item">
                      <span>
                        Match type
                      </span>

                      <strong className="capitalize-text">
                        {
                          match.match_type
                        }
                      </strong>
                    </div>

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
                            {match.location}
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
                                aria-label={`Map showing ${match.location}`}
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

                    {/* ========================================
                        RESULT
                    ======================================== */}

                    {hasResult && (
                      <div className="fixture-information-item">
                        <span>
                          Result
                        </span>

                        <strong>
                          {teamName}
                          {' '}
                          {
                            match.team_score
                          }
                          {' - '}
                          {
                            match.opponent_score
                          }
                          {' '}
                          {match.opponent}
                          {' · '}
                          {resultLabel()}
                        </strong>
                      </div>
                    )}

                    {/* ========================================
                        MATCH INFO
                    ======================================== */}

                    {match.description && (
                      <div className="fixture-information-item fixture-description">
                        <span>
                          Match information
                        </span>

                        <strong>
                          {
                            match.description
                          }
                        </strong>
                      </div>
                    )}
                  </div>
                </article>
              </>
            )}
        </section>
      </main>
    </>
  )
}

export default MatchPage
