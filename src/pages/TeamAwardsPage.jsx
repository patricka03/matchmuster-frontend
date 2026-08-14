import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'
import '../styles/TeamAwardsPage.css'

function TeamAwardsPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [awards, setAwards] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadAwardsPage() {
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
          awardsResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/awards`,
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
          awardsResponse.status === 401 ||
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
          awardsResponse.status === 403 ||
          userResponse.status === 403
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const awardsData =
          await awardsResponse.json()

        const userData =
          await userResponse.json()

        if (!awardsResponse.ok) {
          throw new Error(
            awardsData.error ||
              'Unable to load team awards.',
          )
        }

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              'Unable to load your account.',
          )
        }

        setAwards(
          awardsData,
        )

        setCurrentUser(
          userData.user ||
            userData,
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

    loadAwardsPage()
  }, [
    navigate,
    teamId,
  ])

  function playerName(player) {
    return [
      player?.first_name,
      player?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
  }

  function playerInitials(player) {
    return [
      player?.first_name,
      player?.last_name,
    ]
      .filter(Boolean)
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function formatMatchDate(date) {
    if (!date) return ''

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
      },
    ).format(
      new Date(date),
    )
  }

  function renderAvatar(
    player,
    className = 'team-award-avatar',
  ) {
    if (player?.avatar_url) {
      return (
        <img
          className={className}
          src={player.avatar_url}
          alt={playerName(player)}
        />
      )
    }

    return (
      <div
        className={`${className} team-award-avatar-placeholder`}
        aria-hidden="true"
      >
        {playerInitials(player)}
      </div>
    )
  }

  function renderAwardLeaders(
    leaders,
    emptyMessage,
  ) {
    if (!leaders?.length) {
      return (
        <div className="team-award-empty">
          <span>
            🏆
          </span>

          <p>
            {emptyMessage}
          </p>
        </div>
      )
    }

    return (
      <div className="team-award-leaders">
        {leaders.map(
          (leader) => (
            <article
              className="team-award-leader"
              key={leader.player.id}
            >
              {renderAvatar(
                leader.player,
                'team-award-hero-avatar',
              )}

              <div>
                <strong>
                  {playerName(
                    leader.player,
                  )}
                </strong>

                <span>
                  {leader.motm_count}{' '}
                  {leader.motm_count === 1
                    ? 'MOTM award'
                    : 'MOTM awards'}
                </span>
              </div>
            </article>
          ),
        )}
      </div>
    )
  }

  function renderMotmLeaderboard(
    leaderboard,
  ) {
    if (!leaderboard?.length) {
      return (
        <div className="team-awards-no-results">
          No MOTM awards yet.
        </div>
      )
    }

    return (
      <div className="team-awards-leaderboard">
        {leaderboard.map(
          (entry, index) => (
            <article
              className="team-awards-leaderboard-row"
              key={entry.player.id}
            >
              <span className="team-awards-position">
                {index + 1}
              </span>

              {renderAvatar(
                entry.player,
              )}

              <div className="team-awards-player-info">
                <strong>
                  {playerName(
                    entry.player,
                  )}
                </strong>

                <span>
                  Man of the Match
                </span>
              </div>

              <div className="team-awards-count">
                <span>
                  🏆
                </span>

                <strong>
                  {entry.motm_count}
                </strong>
              </div>
            </article>
          ),
        )}
      </div>
    )
  }

  function renderStatLeaderboard(
    leaderboard,
    icon,
    emptyMessage,
  ) {
    if (!leaderboard?.length) {
      return (
        <div className="team-awards-stat-empty">
          <span>
            {icon}
          </span>

          <p>
            {emptyMessage}
          </p>
        </div>
      )
    }

    return (
      <div className="team-stat-leaderboard">
        {leaderboard.map(
          (entry, index) => (
            <article
              className="team-stat-row"
              key={entry.player.id}
            >
              <span className="team-awards-position">
                {index + 1}
              </span>

              {renderAvatar(
                entry.player,
              )}

              <div className="team-awards-player-info">
                <strong>
                  {playerName(
                    entry.player,
                  )}
                </strong>

                <span>
                  Season {awards.statistics.label}
                </span>
              </div>

              <div className="team-stat-total">
                <span>
                  {icon}
                </span>

                <strong>
                  {entry.total}
                </strong>
              </div>
            </article>
          ),
        )}
      </div>
    )
  }

  function goalDifferenceLabel(value) {
    if (value > 0) {
      return `+${value}`
    }

    return value
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading team awards...
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
            to={`/teams/${teamId}`}
            label="Back to team"
          />

          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {!errorMessage && awards && (
            <>
              <div className="dashboard-welcome">
                <p className="dashboard-label">
                  Team achievements
                </p>

                <h1>
                  Team Awards &amp; Stats
                </h1>

                <p>
                  Follow the season's standout
                  performers, awards and team
                  statistics.
                </p>
              </div>

              {/* ========================================
                  PLAYER AWARDS
              ======================================== */}

              <section className="team-awards-hero-grid">
                <article className="team-award-hero-card">
                  <div className="team-award-icon">
                    🏆
                  </div>

                  <p className="team-award-eyebrow">
                    {awards.month.label}
                  </p>

                  <h2>
                    Player of the Month
                  </h2>

                  {renderAwardLeaders(
                    awards.month
                      .player_of_the_month,
                    'No Player of the Month yet.',
                  )}
                </article>

                <article className="team-award-hero-card team-award-season-card">
                  <div className="team-award-icon">
                    ⭐
                  </div>

                  <p className="team-award-eyebrow">
                    Season{' '}
                    {awards.season.label}
                  </p>

                  <h2>
                    Season Player
                  </h2>

                  {renderAwardLeaders(
                    awards.season
                      .player_of_the_season,
                    'The season race has not started yet.',
                  )}
                </article>
              </section>

              {/* ========================================
                  TEAM RECORD
              ======================================== */}

              <section className="team-awards-section">
                <div className="team-awards-section-heading">
                  <div>
                    <p className="dashboard-label">
                      Season{' '}
                      {awards.statistics.label}
                    </p>

                    <h2>
                      Team record
                    </h2>

                    <p>
                      Results from completed
                      matches this season.
                    </p>
                  </div>
                </div>

                <div className="team-record-grid">
                  <article>
                    <span>
                      P
                    </span>

                    <strong>
                      {
                        awards.statistics
                          .team.played
                      }
                    </strong>

                    <small>
                      Played
                    </small>
                  </article>

                  <article>
                    <span>
                      W
                    </span>

                    <strong>
                      {
                        awards.statistics
                          .team.wins
                      }
                    </strong>

                    <small>
                      Wins
                    </small>
                  </article>

                  <article>
                    <span>
                      D
                    </span>

                    <strong>
                      {
                        awards.statistics
                          .team.draws
                      }
                    </strong>

                    <small>
                      Draws
                    </small>
                  </article>

                  <article>
                    <span>
                      L
                    </span>

                    <strong>
                      {
                        awards.statistics
                          .team.losses
                      }
                    </strong>

                    <small>
                      Losses
                    </small>
                  </article>

                  <article>
                    <span>
                      GF
                    </span>

                    <strong>
                      {
                        awards.statistics
                          .team.goals_for
                      }
                    </strong>

                    <small>
                      Goals for
                    </small>
                  </article>

                  <article>
                    <span>
                      GA
                    </span>

                    <strong>
                      {
                        awards.statistics
                          .team.goals_against
                      }
                    </strong>

                    <small>
                      Goals against
                    </small>
                  </article>

                  <article>
                    <span>
                      GD
                    </span>

                    <strong>
                      {goalDifferenceLabel(
                        awards.statistics
                          .team.goal_difference,
                      )}
                    </strong>

                    <small>
                      Goal difference
                    </small>
                  </article>
                </div>
              </section>

              {/* ========================================
                  GOALS + ASSISTS
              ======================================== */}

              <section className="team-stat-grid">
                <article className="team-awards-section">
                  <div className="team-awards-section-heading">
                    <div>
                      <p className="dashboard-label">
                        Attack
                      </p>

                      <h2>
                        ⚽ Top Scorers
                      </h2>

                      <p>
                        Most goals this season.
                      </p>
                    </div>
                  </div>

                  {renderStatLeaderboard(
                    awards.statistics
                      .top_scorers,
                    '⚽',
                    'No goals recorded yet.',
                  )}
                </article>

                <article className="team-awards-section">
                  <div className="team-awards-section-heading">
                    <div>
                      <p className="dashboard-label">
                        Creativity
                      </p>

                      <h2>
                        🎯 Top Assists
                      </h2>

                      <p>
                        Most assists this season.
                      </p>
                    </div>
                  </div>

                  {renderStatLeaderboard(
                    awards.statistics
                      .top_assists,
                    '🎯',
                    'No assists recorded yet.',
                  )}
                </article>
              </section>

              {/* ========================================
                  CLEAN SHEETS
              ======================================== */}

              <section className="team-awards-section">
                <div className="team-awards-section-heading">
                  <div>
                    <p className="dashboard-label">
                      Defence
                    </p>

                    <h2>
                      🧤 Clean Sheets
                    </h2>

                    <p>
                      Players with the most
                      clean sheets this season.
                    </p>
                  </div>
                </div>

                {renderStatLeaderboard(
                  awards.statistics
                    .clean_sheets,
                  '🧤',
                  'No clean sheets recorded yet.',
                )}
              </section>

              {/* ========================================
                  DISCIPLINE
              ======================================== */}

              <section className="team-stat-grid">
                <article className="team-awards-section">
                  <div className="team-awards-section-heading">
                    <div>
                      <p className="dashboard-label">
                        Discipline
                      </p>

                      <h2>
                        🟨 Yellow Cards
                      </h2>

                      <p>
                        Yellow cards recorded
                        this season.
                      </p>
                    </div>
                  </div>

                  {renderStatLeaderboard(
                    awards.statistics
                      .yellow_cards,
                    '🟨',
                    'No yellow cards recorded.',
                  )}
                </article>

                <article className="team-awards-section">
                  <div className="team-awards-section-heading">
                    <div>
                      <p className="dashboard-label">
                        Discipline
                      </p>

                      <h2>
                        🟥 Red Cards
                      </h2>

                      <p>
                        Red cards recorded
                        this season.
                      </p>
                    </div>
                  </div>

                  {renderStatLeaderboard(
                    awards.statistics
                      .red_cards,
                    '🟥',
                    'No red cards recorded.',
                  )}
                </article>
              </section>

              {/* ========================================
                  MONTHLY MOTM
              ======================================== */}

              <section className="team-awards-section">
                <div className="team-awards-section-heading">
                  <div>
                    <p className="dashboard-label">
                      {awards.month.label}
                    </p>

                    <h2>
                      Player of the Month race
                    </h2>

                    <p>
                      Ranked by Man of the
                      Match awards this month.
                    </p>
                  </div>
                </div>

                {renderMotmLeaderboard(
                  awards.month.leaderboard,
                )}
              </section>

              {/* ========================================
                  SEASON MOTM
              ======================================== */}

              <section className="team-awards-section">
                <div className="team-awards-section-heading">
                  <div>
                    <p className="dashboard-label">
                      {awards.season.label}
                    </p>

                    <h2>
                      MOTM Season Leaderboard
                    </h2>

                    <p>
                      Most Man of the Match
                      performances this season.
                    </p>
                  </div>
                </div>

                {renderMotmLeaderboard(
                  awards.season.leaderboard,
                )}
              </section>

              {/* ========================================
                  RECENT MOTM
              ======================================== */}

              <section className="team-awards-section">
                <div className="team-awards-section-heading">
                  <div>
                    <p className="dashboard-label">
                      Recent matches
                    </p>

                    <h2>
                      Recent Man of the Match
                    </h2>
                  </div>
                </div>

                {awards
                  .recent_man_of_the_match
                  ?.length > 0 ? (
                  <div className="recent-motm-list">
                    {awards
                      .recent_man_of_the_match
                      .map(
                        (award) => (
                          <article
                            className="recent-motm-card"
                            key={`${award.match.id}-${award.player.id}`}
                          >
                            {renderAvatar(
                              award.player,
                              'recent-motm-avatar',
                            )}

                            <div className="recent-motm-player">
                              <span>
                                🏆 MOTM
                              </span>

                              <strong>
                                {playerName(
                                  award.player,
                                )}
                              </strong>

                              <p>
                                vs{' '}
                                {
                                  award.match
                                    .opponent
                                }
                              </p>
                            </div>

                            <div className="recent-motm-result">
                              <strong>
                                {Number(
                                  award.average_rating,
                                ).toFixed(1)}
                              </strong>

                              <span>
                                {formatMatchDate(
                                  award.match
                                    .kickoff_time,
                                )}
                              </span>
                            </div>
                          </article>
                        ),
                      )}
                  </div>
                ) : (
                  <div className="team-awards-empty-state">
                    <span>
                      🏆
                    </span>

                    <h3>
                      No awards yet
                    </h3>

                    <p>
                      Man of the Match winners
                      will appear here once
                      match ratings are
                      completed.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </>
  )
}

export default TeamAwardsPage
