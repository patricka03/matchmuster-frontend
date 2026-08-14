import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'
import '../styles/MatchRatingsPage.css'

function MatchRatingsPage() {
  const navigate = useNavigate()

  const {
    teamId,
    matchId,
  } = useParams()

  const [match, setMatch] = useState(null)
  const [ratingStatus, setRatingStatus] = useState(null)
  const [results, setResults] = useState(null)

  const [ratings, setRatings] = useState({})

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadPage() {
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
          matchResponse,
          statusResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}`,
            {
              headers,
            },
          ),

          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}/rating_status`,
            {
              headers,
            },
          ),
        ])

        if (
          matchResponse.status === 401 ||
          statusResponse.status === 401
        ) {
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')

          navigate('/login', {
            replace: true,
          })

          return
        }

        const matchData =
          await matchResponse.json()

        const statusData =
          await statusResponse.json()

        if (!matchResponse.ok) {
          throw new Error(
            matchData.error ||
              'Unable to load the match.',
          )
        }

        if (!statusResponse.ok) {
          throw new Error(
            statusData.error ||
              'Unable to load match ratings.',
          )
        }

        setMatch(
          matchData.match ||
            matchData,
        )

        setRatingStatus(
          statusData,
        )

        if (statusData.eligible) {
          const initialRatings = {}

          statusData.players.forEach(
            (player) => {
              initialRatings[player.id] = {
                rating: 7.0,
                comment: '',
              }
            },
          )

          setRatings(
            initialRatings,
          )
        }

        if (statusData.ratings_finalised) {
          await loadResults(
            token,
          )
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

    loadPage()
  }, [
    navigate,
    teamId,
    matchId,
  ])

  async function loadResults(tokenOverride = null) {
    const token =
      tokenOverride ||
      localStorage.getItem('token')

    if (!token) return

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matches/${matchId}/rating_results`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to load rating results.',
        )
      }

      setResults(data)
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to load rating results.',
      )
    }
  }

  function handleRatingChange(
    playerId,
    value,
  ) {
    setRatings(
      (currentRatings) => ({
        ...currentRatings,

        [playerId]: {
          ...currentRatings[playerId],

          rating:
            Number(value),
        },
      }),
    )
  }

  function handleCommentChange(
    playerId,
    value,
  ) {
    setRatings(
      (currentRatings) => ({
        ...currentRatings,

        [playerId]: {
          ...currentRatings[playerId],

          comment:
            value,
        },
      }),
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!ratingStatus?.can_submit) {
      return
    }

    const confirmed =
      window.confirm(
        'Submit all player ratings? You will not be able to change them afterwards.',
      )

    if (!confirmed) return

    const token =
      localStorage.getItem('token')

    if (!token) {
      navigate('/login')
      return
    }

    const submittedRatings =
      ratingStatus.players.map(
        (player) => ({
          player_id:
            player.id,

          rating:
            ratings[player.id]
              ?.rating,

          comment:
            ratings[player.id]
              ?.comment
              ?.trim() || '',
        }),
      )

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matches/${matchId}/match_ratings`,
        {
          method: 'POST',

          headers: {
            Accept: 'application/json',
            'Content-Type':
              'application/json',
            Authorization: token,
          },

          body: JSON.stringify({
            ratings:
              submittedRatings,
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.errors?.join(', ') ||
            'Unable to submit ratings.',
        )
      }

      setSuccessMessage(
        'Ratings submitted successfully. Results will be revealed when voting closes.',
      )

      setRatingStatus(
        (currentStatus) => ({
          ...currentStatus,

          submitted: true,
          can_submit: false,

          submitted_voters:
            data.submitted_voters ??
            currentStatus.submitted_voters,

          total_voters:
            data.total_voters ??
            currentStatus.total_voters,
        }),
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to submit ratings.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function formatDateTime(dateTime) {
    if (!dateTime) return ''

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(dateTime),
    )
  }

  function playerName(player) {
    return [
      player.first_name,
      player.last_name,
    ]
      .filter(Boolean)
      .join(' ')
  }

  function playerInitials(player) {
    return [
      player.first_name,
      player.last_name,
    ]
      .filter(Boolean)
      .map(
        (name) =>
          name[0],
      )
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function isMotm(playerId) {
    return results?.man_of_the_match?.some(
      (winner) =>
        winner.player.id ===
        playerId,
    )
  }

  function renderPlayerAvatar(player) {
    if (player.avatar_url) {
      return (
        <img
          className="rating-player-avatar"
          src={player.avatar_url}
          alt={playerName(player)}
        />
      )
    }

    return (
      <div
        className="rating-player-avatar rating-player-avatar-placeholder"
        aria-hidden="true"
      >
        {playerInitials(player)}
      </div>
    )
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading match ratings...
      </p>
    )
  }

  return (
    <>
      <Navbar teamId={teamId} />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <BackButton
            to={`/teams/${teamId}/matches/${matchId}`}
            label="Back to match"
          />

          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p
              className="team-success"
              role="status"
            >
              {successMessage}
            </p>
          )}

          {match && (
            <div className="dashboard-welcome">
              <p className="dashboard-label">
                Post-match ratings
              </p>

              <h1>
                Player ratings vs{' '}
                {match.opponent}
              </h1>

              <p>
                Rate the players from the
                matchday squad.
              </p>
            </div>
          )}

          {!ratingStatus?.eligible && (
            <section className="ratings-state-card">
              <h2>
                Ratings unavailable
              </h2>

              <p>
                You were not part of the
                eligible rating group for
                this match.
              </p>
            </section>
          )}

          {ratingStatus?.eligible &&
            !ratingStatus.ratings_open &&
            !ratingStatus.ratings_closed &&
            !ratingStatus.ratings_finalised && (
              <section className="ratings-state-card">
                <span className="ratings-state-icon">
                  🔒
                </span>

                <h2>
                  Ratings aren't open yet
                </h2>

                <p>
                  Voting opens two hours
                  after kick-off.
                </p>

                <strong>
                  Opens{' '}
                  {formatDateTime(
                    ratingStatus.ratings_open_at,
                  )}
                </strong>
              </section>
            )}

          {ratingStatus?.ratings_open &&
            ratingStatus.submitted && (
              <section className="ratings-state-card">
                <span className="ratings-state-icon">
                  ✅
                </span>

                <h2>
                  Ratings submitted
                </h2>

                <p>
                  Your ratings are locked
                  in. Results stay hidden
                  until voting closes.
                </p>

                <div className="ratings-progress">
                  <strong>
                    {
                      ratingStatus.submitted_voters
                    }
                    /
                    {
                      ratingStatus.total_voters
                    }
                  </strong>

                  <span>
                    voters submitted
                  </span>
                </div>

                <p>
                  Voting closes{' '}
                  {formatDateTime(
                    ratingStatus.ratings_close_at,
                  )}
                  .
                </p>
              </section>
            )}

          {ratingStatus?.can_submit && (
            <form
              className="match-ratings-form"
              onSubmit={
                handleSubmit
              }
            >
              <section className="ratings-window-card">
                <div>
                  <p className="dashboard-label">
                    Voting open
                  </p>

                  <h2>
                    Rate every player
                  </h2>

                  <p>
                    Scores are private until
                    voting closes.
                  </p>
                </div>

                <div className="ratings-window-time">
                  <span>
                    Voting closes
                  </span>

                  <strong>
                    {formatDateTime(
                      ratingStatus.ratings_close_at,
                    )}
                  </strong>
                </div>
              </section>

              <div className="rating-player-list">
                {ratingStatus.players.map(
                  (player) => {
                    const playerRating =
                      ratings[player.id] ||
                      {
                        rating: 7.0,
                        comment: '',
                      }

                    return (
                      <article
                        className="rating-player-card"
                        key={player.id}
                      >
                        <div className="rating-player-header">
                          {renderPlayerAvatar(
                            player,
                          )}

                          <div className="rating-player-name">
                            <h2>
                              {playerName(
                                player,
                              )}
                            </h2>

                            <p>
                              Matchday squad
                            </p>
                          </div>

                          <strong className="rating-score">
                            {Number(
                              playerRating.rating,
                            ).toFixed(1)}
                          </strong>
                        </div>

                        <div className="rating-control">
                          <div className="rating-range-labels">
                            <span>
                              1.0
                            </span>

                            <span>
                              10.0
                            </span>
                          </div>

                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={
                              playerRating.rating
                            }
                            onChange={(
                              event,
                            ) =>
                              handleRatingChange(
                                player.id,
                                event.target.value,
                              )
                            }
                            aria-label={`Rating for ${playerName(
                              player,
                            )}`}
                          />
                        </div>

                        <div className="form-group">
                          <label
                            htmlFor={`rating-comment-${player.id}`}
                          >
                            Comment{' '}
                            <span>
                              (optional)
                            </span>
                          </label>

                          <textarea
                            id={`rating-comment-${player.id}`}
                            rows={3}
                            maxLength={300}
                            placeholder="Anything you'd like to say about their performance?"
                            value={
                              playerRating.comment
                            }
                            onChange={(
                              event,
                            ) =>
                              handleCommentChange(
                                player.id,
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </article>
                    )
                  },
                )}
              </div>

              <div className="ratings-submit-bar">
                <div>
                  <strong>
                    {
                      ratingStatus.players.length
                    }{' '}
                    players
                  </strong>

                  <p>
                    Once submitted, ratings
                    cannot be changed.
                  </p>
                </div>

                <button
                  className="submit-ratings-button"
                  type="submit"
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? 'Submitting ratings...'
                    : 'Submit all ratings'}
                </button>
              </div>
            </form>
          )}

          {ratingStatus?.ratings_closed &&
            !ratingStatus.ratings_finalised && (
              <section className="ratings-state-card">
                <span className="ratings-state-icon">
                  ⏳
                </span>

                <h2>
                  Voting closed
                </h2>

                <p>
                  MatchMuster is finalising
                  the results and Man of the
                  Match.
                </p>

                <div className="ratings-progress">
                  <strong>
                    {
                      ratingStatus.submitted_voters
                    }
                    /
                    {
                      ratingStatus.total_voters
                    }
                  </strong>

                  <span>
                    votes submitted
                  </span>
                </div>
              </section>
            )}

          {ratingStatus?.ratings_finalised &&
            results && (
              <>
                <section className="motm-card">
                  <p className="dashboard-label">
                    Match award
                  </p>

                  {results.man_of_the_match
                    ?.length > 0 ? (
                    <>
                      <span className="motm-trophy">
                        🏆
                      </span>

                      <h2>
                        {results.man_of_the_match
                          .length > 1
                          ? 'Joint Man of the Match'
                          : 'Man of the Match'}
                      </h2>

                      <div className="motm-winners">
                        {results.man_of_the_match.map(
                          (winner) => (
                            <article
                              key={
                                winner.player.id
                              }
                            >
                              {renderPlayerAvatar(
                                winner.player,
                              )}

                              <strong>
                                {playerName(
                                  winner.player,
                                )}
                              </strong>

                              <span>
                                {Number(
                                  winner.average_rating,
                                ).toFixed(
                                  1,
                                )}
                              </span>
                            </article>
                          ),
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2>
                        No Man of the Match
                      </h2>

                      <p>
                        There weren't enough
                        completed votes to
                        award MOTM.
                      </p>
                    </>
                  )}
                </section>

                {results.results?.length >
                  0 && (
                  <section className="rating-results-section">
                    <div className="rating-results-heading">
                      <div>
                        <p className="dashboard-label">
                          Final results
                        </p>

                        <h2>
                          Player ratings
                        </h2>
                      </div>

                      <span>
                        {
                          results.submitted_voters
                        }
                        /
                        {
                          results.total_voters
                        }{' '}
                        voters
                      </span>
                    </div>

                    <div className="rating-results-list">
                      {results.results.map(
                        (
                          result,
                          index,
                        ) => (
                          <article
                            className={`rating-result-row ${
                              isMotm(
                                result.player.id,
                              )
                                ? 'rating-result-motm'
                                : ''
                            }`}
                            key={
                              result.player.id
                            }
                          >
                            <span className="rating-result-position">
                              {index + 1}
                            </span>

                            {renderPlayerAvatar(
                              result.player,
                            )}

                            <div className="rating-result-player">
                              <strong>
                                {playerName(
                                  result.player,
                                )}
                              </strong>

                              <span>
                                {
                                  result.ratings_received
                                }{' '}
                                ratings
                              </span>
                            </div>

                            {isMotm(
                              result.player.id,
                            ) && (
                              <span className="rating-result-award">
                                🏆 MOTM
                              </span>
                            )}

                            <strong className="rating-result-score">
                              {Number(
                                result.average_rating,
                              ).toFixed(
                                1,
                              )}
                            </strong>
                          </article>
                        ),
                      )}
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

export default MatchRatingsPage
