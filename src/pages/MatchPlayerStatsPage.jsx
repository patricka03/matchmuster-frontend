import '../styles/RemainingPages.mobile.css'
import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

import '../styles/MatchPlayerStatsPage.css'
import '../styles/MatchPlayerStats.mobile.css'

function MatchPlayerStatsPage() {
  const navigate =
    useNavigate()

  const {
    teamId,
    matchId,
  } = useParams()

  const [match, setMatch] =
    useState(null)

  const [players, setPlayers] =
    useState([])

  const [
    teamScore,
    setTeamScore,
  ] = useState('')

  const [
    opponentScore,
    setOpponentScore,
  ] = useState('')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearStatsSession() {
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
  // LOAD STATS
  // ========================================

  useEffect(() => {
    async function loadStats() {
      const token =
        getAuthToken()

      if (!token) {
        await clearStatsSession()

        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response =
          await fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}/match_player_stats`,
            {
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
          await clearStatsSession()

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
            data.error ||
              'Unable to load match stats.',
          )
        }

        setMatch(
          data.match,
        )

        setTeamScore(
          data.match.team_score ??
            '',
        )

        setOpponentScore(
          data.match.opponent_score ??
            '',
        )

        setPlayers(
          data.players.map(
            (player) => ({
              ...player,

              goals:
                Number(
                  player.goals ||
                    0,
                ),

              assists:
                Number(
                  player.assists ||
                    0,
                ),

              clean_sheet:
                Boolean(
                  player.clean_sheet,
                ),

              yellow_cards:
                Number(
                  player.yellow_cards ||
                    0,
                ),

              red_cards:
                Number(
                  player.red_cards ||
                    0,
                ),
            }),
          ),
        )
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [
    navigate,
    teamId,
    matchId,
  ])

  function updatePlayerStat(
    playerId,
    field,
    value,
  ) {
    setPlayers(
      (currentPlayers) =>
        currentPlayers.map(
          (player) =>
            player.id ===
            playerId
              ? {
                  ...player,
                  [field]:
                    value,
                }
              : player,
        ),
    )

    setSuccessMessage('')
  }

  function handleNumberChange(
    playerId,
    field,
    event,
  ) {
    const value =
      Number(
        event.target.value,
      )

    updatePlayerStat(
      playerId,
      field,
      Number.isNaN(value)
        ? 0
        : value,
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

  function playerInitials(
    player,
  ) {
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

  // ========================================
  // SAVE STATS
  // ========================================

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

    const token =
      getAuthToken()

    if (!token) {
      await clearStatsSession()

      return
    }

    if (
      teamScore === '' ||
      opponentScore === ''
    ) {
      setErrorMessage(
        'Please enter the final score before saving.',
      )

      return
    }

    const stats =
      players.map(
        (player) => ({
          player_id:
            player.id,

          goals:
            player.goals,

          assists:
            player.assists,

          clean_sheet:
            player.clean_sheet,

          yellow_cards:
            player.yellow_cards,

          red_cards:
            player.red_cards,
        }),
      )

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/teams/${teamId}/matches/${matchId}/match_player_stats`,
          {
            method:
              'POST',

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
                match: {
                  team_score:
                    Number(
                      teamScore,
                    ),

                  opponent_score:
                    Number(
                      opponentScore,
                    ),
                },

                stats,
              }),
          },
        )

      if (
        response.status === 401
      ) {
        await clearStatsSession()

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
          data.error ||
            data.errors?.join(
              ', ',
            ) ||
            'Unable to save match stats.',
        )
      }

      setSuccessMessage(
        'Match result and player stats saved successfully.',
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to save match stats.',
      )
    } finally {
      setSaving(false)
    }
  }

  const totalGoals =
    players.reduce(
      (total, player) =>
        total +
        player.goals,
      0,
    )

  const totalAssists =
    players.reduce(
      (total, player) =>
        total +
        player.assists,
      0,
    )

  const totalYellowCards =
    players.reduce(
      (total, player) =>
        total +
        player.yellow_cards,
      0,
    )

  const totalRedCards =
    players.reduce(
      (total, player) =>
        total +
        player.red_cards,
      0,
    )

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading match stats...
      </p>
    )
  }

  return (
    <>
      <Navbar
        teamId={teamId}
      />

      <main className="dashboard-page mm-minimal-page">
        <section className="dashboard-content">
          <BackButton
            to={`/teams/${teamId}/matches/${matchId}`}
            label="Back to match"
          />

          {match && (
            <div className="dashboard-welcome">
              <p className="dashboard-label">
                Match statistics
              </p>

              <h1 className="mm-page-title">
                Stats vs{' '}
                {match.opponent}
              </h1>

              <p>
                Enter the final
                result, then record
                the individual
                matchday statistics.
              </p>
            </div>
          )}

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

          <form
            className="match-player-stats-form"
            onSubmit={
              handleSubmit
            }
          >
            <section className="match-result-card">
              <p className="dashboard-label">
                Final result
              </p>

              <h2>
                Match result
              </h2>

              <div className="match-result-scoreboard">
                <div className="match-result-team">
                  <strong>
                    MatchMuster
                  </strong>

                  <input
                    type="number"
                    min="0"
                    value={
                      teamScore
                    }
                    onChange={(
                      event,
                    ) => {
                      setTeamScore(
                        event.target
                          .value,
                      )

                      setSuccessMessage(
                        '',
                      )
                    }}
                    aria-label="MatchMuster score"
                    required
                  />
                </div>

                <span className="match-result-divider">
                  -
                </span>

                <div className="match-result-team">
                  <strong>
                    {
                      match?.opponent
                    }
                  </strong>

                  <input
                    type="number"
                    min="0"
                    value={
                      opponentScore
                    }
                    onChange={(
                      event,
                    ) => {
                      setOpponentScore(
                        event.target
                          .value,
                      )

                      setSuccessMessage(
                        '',
                      )
                    }}
                    aria-label={`${match?.opponent} score`}
                    required
                  />
                </div>
              </div>
            </section>

            <div className="match-player-stats-list">
              {players.map(
                (player) => (
                  <article
                    className="match-player-stat-card"
                    key={
                      player.id
                    }
                  >
                    <div className="match-stat-player-header">
                      {player.avatar_url ? (
                        <img
                          className="match-stat-avatar"
                          src={
                            player.avatar_url
                          }
                          alt={
                            playerName(
                              player,
                            )
                          }
                        />
                      ) : (
                        <div
                          className="match-stat-avatar match-stat-avatar-placeholder"
                          aria-hidden="true"
                        >
                          {playerInitials(
                            player,
                          )}
                        </div>
                      )}

                      <div>
                        <h2>
                          {playerName(
                            player,
                          )}
                        </h2>

                        <p>
                          {
                            player.position
                          }

                          {' · '}

                          {player.selection_type ===
                          'starter'
                            ? 'Starter'
                            : 'Substitute'}
                        </p>
                      </div>
                    </div>

                    <div className="match-stat-fields">
                      <div className="match-stat-field">
                        <label
                          htmlFor={`goals-${player.id}`}
                        >
                          ⚽ Goals
                        </label>

                        <input
                          id={`goals-${player.id}`}
                          type="number"
                          min="0"
                          value={
                            player.goals
                          }
                          onChange={(
                            event,
                          ) =>
                            handleNumberChange(
                              player.id,
                              'goals',
                              event,
                            )
                          }
                        />
                      </div>

                      <div className="match-stat-field">
                        <label
                          htmlFor={`assists-${player.id}`}
                        >
                          🎯 Assists
                        </label>

                        <input
                          id={`assists-${player.id}`}
                          type="number"
                          min="0"
                          value={
                            player.assists
                          }
                          onChange={(
                            event,
                          ) =>
                            handleNumberChange(
                              player.id,
                              'assists',
                              event,
                            )
                          }
                        />
                      </div>

                      <div className="match-stat-field">
                        <label
                          htmlFor={`yellow-${player.id}`}
                        >
                          🟨 Yellow
                        </label>

                        <select
                          id={`yellow-${player.id}`}
                          value={
                            player.yellow_cards
                          }
                          onChange={(
                            event,
                          ) =>
                            handleNumberChange(
                              player.id,
                              'yellow_cards',
                              event,
                            )
                          }
                        >
                          <option value={0}>
                            0
                          </option>

                          <option value={1}>
                            1
                          </option>

                          <option value={2}>
                            2
                          </option>
                        </select>
                      </div>

                      <div className="match-stat-field">
                        <label
                          htmlFor={`red-${player.id}`}
                        >
                          🟥 Red
                        </label>

                        <select
                          id={`red-${player.id}`}
                          value={
                            player.red_cards
                          }
                          onChange={(
                            event,
                          ) =>
                            handleNumberChange(
                              player.id,
                              'red_cards',
                              event,
                            )
                          }
                        >
                          <option value={0}>
                            0
                          </option>

                          <option value={1}>
                            1
                          </option>
                        </select>
                      </div>
                    </div>

                    <label className="clean-sheet-toggle">
                      <input
                        type="checkbox"
                        checked={
                          player.clean_sheet
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePlayerStat(
                            player.id,
                            'clean_sheet',
                            event.target
                              .checked,
                          )
                        }
                      />

                      <span>
                        🧤 Clean sheet
                      </span>
                    </label>
                  </article>
                ),
              )}
            </div>

            <div className="match-stats-save-bar">
              <div>
                <strong>
                  {
                    players.length
                  }{' '}
                  players
                </strong>

                <p>
                  The match result
                  and individual
                  stats are saved
                  together.
                </p>
              </div>

              <button
                className="save-match-stats-button"
                type="submit"
                disabled={
                  saving
                }
              >
                {saving
                  ? 'Saving stats...'
                  : 'Save match stats'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

export default MatchPlayerStatsPage
