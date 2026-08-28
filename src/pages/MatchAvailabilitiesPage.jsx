import ManagerPlusPrompt from '../components/ManagerPlusPrompt'
import '../styles/RemainingPages.mobile.css'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

function MatchAvailabilityPage() {
  const navigate = useNavigate()
  const { teamId, matchId } = useParams()

  const [match, setMatch] = useState(null)
  const [players, setPlayers] = useState([])
  const [squadSelections, setSquadSelections] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [savingPlayerId, setSavingPlayerId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearAvailabilitySession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  // ========================================
  // LOAD AVAILABILITY
  // ========================================

  useEffect(() => {
    async function fetchAvailability() {
      const token =
        getAuthToken()

      if (!token) {
        await clearAvailabilitySession()
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const [
          availabilityResponse,
          selectionResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}/availabilities`,
            {
              headers,
            },
          ),

          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}/squad_selections`,
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
          availabilityResponse.status === 401 ||
          selectionResponse.status === 401 ||
          userResponse.status === 401
        ) {
          await clearAvailabilitySession()
          return
        }

        if (
          availabilityResponse.status === 403 ||
          selectionResponse.status === 403 ||
          userResponse.status === 403
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const availabilityData =
          await availabilityResponse.json()

        const selectionData =
          await selectionResponse.json()

        const userData =
          await userResponse.json()

        if (!availabilityResponse.ok) {
          throw new Error(
            availabilityData.error ||
              'Unable to load player availability.',
          )
        }

        if (!selectionResponse.ok) {
          throw new Error(
            selectionData.error ||
              'Unable to load the squad selection.',
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

        const isApprovedManager =
          user.account_type === 'manager' &&
          user.manager_verification_status ===
            'approved'

        if (!isApprovedManager) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        const selections =
          Array.isArray(selectionData)
            ? selectionData
            : selectionData.squad_selections ||
              []

        setCurrentUser(user)

        setMatch(
          availabilityData.match ||
            null,
        )

        setPlayers(
          availabilityData.players ||
            [],
        )

        setSquadSelections(
          selections,
        )

        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [
    navigate,
    teamId,
    matchId,
  ])

  // ========================================
  // GROUP PLAYERS
  // ========================================

  const playersByStatus =
    useMemo(
      () => ({
        available:
          players.filter(
            (player) =>
              player.status ===
              'available',
          ),

        unavailable:
          players.filter(
            (player) =>
              player.status ===
              'unavailable',
          ),

        pending:
          players.filter(
            (player) =>
              ![
                'available',
                'unavailable',
              ].includes(
                player.status,
              ),
          ),
      }),
      [players],
    )

  const summary =
    useMemo(
      () => ({
        available:
          playersByStatus.available.length,

        unavailable:
          playersByStatus.unavailable.length,

        awaiting_response:
          playersByStatus.pending.length,
      }),
      [playersByStatus],
    )

  const starterCount =
    squadSelections.filter(
      (selection) =>
        selection.selection_type ===
        'starter',
    ).length

  // ========================================
  // SQUAD HELPERS
  // ========================================

  function selectionUserId(
    selection,
  ) {
    return (
      selection.user_id ||
      selection.user?.id
    )
  }

  function findSelection(
    playerId,
  ) {
    return squadSelections.find(
      (selection) =>
        Number(
          selectionUserId(
            selection,
          ),
        ) ===
        Number(playerId),
    )
  }

  function playerName(player) {
    if (player.name?.trim()) {
      return player.name.trim()
    }

    const fullName = [
      player.first_name,
      player.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()

    return (
      fullName ||
      player.email ||
      'Unnamed player'
    )
  }

  function playerInitials(
    player,
  ) {
    const names =
      player.name
        ? player.name
            .trim()
            .split(/\s+/)
        : [
            player.first_name,
            player.last_name,
          ].filter(Boolean)

    const initials =
      names
        .filter(Boolean)
        .slice(0, 2)
        .map(
          (name) =>
            name[0],
        )
        .join('')
        .toUpperCase()

    return (
      initials ||
      player.email?.[0]?.toUpperCase() ||
      '?'
    )
  }

  // ========================================
  // ASSIGN PLAYER
  // ========================================

  async function assignPlayer(
    player,
    destination,
  ) {
    const token =
      getAuthToken()

    const existingSelection =
      findSelection(player.id)

    if (!token) {
      await clearAvailabilitySession()
      return
    }

    if (
      destination === 'starter' &&
      existingSelection?.selection_type !==
        'starter' &&
      starterCount >= 11
    ) {
      setSuccessMessage('')

      setErrorMessage(
        'The Starting XI already contains 11 players.',
      )

      return
    }

    if (
      destination === 'available' &&
      !existingSelection
    ) {
      return
    }

    if (
      existingSelection?.selection_type ===
      destination
    ) {
      return
    }

    const baseUrl =
      `${API_URL}/teams/${teamId}/matches/${matchId}/squad_selections`

    const returningToPool =
      destination ===
      'available'

    const method =
      returningToPool
        ? 'DELETE'
        : existingSelection
          ? 'PATCH'
          : 'POST'

    const url =
      existingSelection
        ? `${baseUrl}/${existingSelection.id}`
        : baseUrl

    const position =
      existingSelection?.position ||
      player.preferred_position

    if (
      !returningToPool &&
      !position
    ) {
      setSuccessMessage('')

      setErrorMessage(
        `${playerName(player)} needs a preferred position before being selected.`,
      )

      return
    }

    setSavingPlayerId(player.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          url,
          {
            method,

            headers: {
              Accept:
                'application/json',

              'Content-Type':
                'application/json',

              Authorization:
                token,
            },

            body:
              returningToPool
                ? undefined
                : JSON.stringify({
                    squad_selection: {
                      user_id:
                        player.id,

                      selection_type:
                        destination,

                      position,
                    },
                  }),
          },
        )

      if (
        response.status === 401
      ) {
        await clearAvailabilitySession()
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

      let data = null

      if (
        response.status !== 204
      ) {
        data =
          await response.json()
      }

      if (!response.ok) {
        throw new Error(
          data?.errors?.join(', ') ||
            data?.error ||
            'Unable to update this player.',
        )
      }

      if (returningToPool) {
        setSquadSelections(
          (currentSelections) =>
            currentSelections.filter(
              (selection) =>
                selection.id !==
                existingSelection.id,
            ),
        )
      } else {
        const savedSelection =
          data.squad_selection ||
          data

        setSquadSelections(
          (currentSelections) => {
            if (
              existingSelection
            ) {
              return currentSelections.map(
                (selection) =>
                  selection.id ===
                  existingSelection.id
                    ? savedSelection
                    : selection,
              )
            }

            return [
              ...currentSelections,
              savedSelection,
            ]
          },
        )
      }

      const destinationLabel =
        destination ===
        'starter'
          ? 'Starting XI'
          : destination ===
              'substitute'
            ? 'Substitutes'
            : 'Available'

      setSuccessMessage(
        `${playerName(player)} moved to ${destinationLabel}.`,
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to connect to the server.',
      )
    } finally {
      setSavingPlayerId(null)
    }
  }

  // ========================================
  // SQUAD BUTTONS
  // ========================================

  function renderSquadButtons(
    player,
  ) {
    const currentSelection =
      findSelection(player.id)

    const currentDestination =
      currentSelection?.selection_type ||
      'available'

    const saving =
      savingPlayerId ===
      player.id

    return (
      <div
        className="availability-squad-buttons"
        aria-label={`Squad selection for ${playerName(player)}`}
      >
        <button
          className={
            currentDestination ===
            'starter'
              ? 'active'
              : ''
          }
          type="button"
          onClick={() =>
            assignPlayer(
              player,
              'starter',
            )
          }
          disabled={
            saving ||
            currentDestination ===
              'starter'
          }
        >
          {saving
            ? 'Saving...'
            : 'Starting XI'}
        </button>

        <button
          className={
            currentDestination ===
            'substitute'
              ? 'active'
              : ''
          }
          type="button"
          onClick={() =>
            assignPlayer(
              player,
              'substitute',
            )
          }
          disabled={
            saving ||
            currentDestination ===
              'substitute'
          }
        >
          Substitutes
        </button>

        <button
          className={
            currentDestination ===
            'available'
              ? 'active'
              : ''
          }
          type="button"
          onClick={() =>
            assignPlayer(
              player,
              'available',
            )
          }
          disabled={
            saving ||
            currentDestination ===
              'available'
          }
        >
          Not selected
        </button>
      </div>
    )
  }

  // ========================================
  // PLAYER GROUP
  // ========================================

  function renderPlayerGroup(
    title,
    status,
    groupPlayers,
  ) {
    const statusLabel =
      status === 'pending'
        ? 'Pending'
        : status[0].toUpperCase() +
          status.slice(1)

    return (
      <section className="availability-group">
        <div className="availability-group-heading">
          <h2>
            {title}
          </h2>

          <span>
            {groupPlayers.length}
          </span>
        </div>

        {groupPlayers.length === 0 ? (
          <article className="empty-team-card">
            <p>
              No players are currently{' '}
              {statusLabel.toLowerCase()}.
            </p>
          </article>
        ) : (
          <div className="availability-list">
            {groupPlayers.map(
              (player) => (
                <article
                  className="availability-player-card"
                  key={player.id}
                >
                  <div className="availability-player">
                    <div
                      className="player-avatar"
                      aria-hidden="true"
                    >
                      {playerInitials(
                        player,
                      )}
                    </div>

                    <div>
                      <h2>
                        {playerName(
                          player,
                        )}
                      </h2>

                      <p>
                        {player.preferred_position
                          ? `Preferred position: ${player.preferred_position}`
                          : 'No preferred position set'}
                      </p>
                    </div>
                  </div>

                  <div className="availability-player-actions">
                    <span
                      className={`availability-status ${status}`}
                    >
                      {statusLabel}
                    </span>

                    {status ===
                      'available' &&
                      renderSquadButtons(
                        player,
                      )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    )
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading availability...
      </p>
    )
  }

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

          {successMessage && (
            <p
              className="team-success"
              role="status"
            >
              {successMessage}
            </p>
          )}

          <BackButton
            to={`/teams/${teamId}/matches/${matchId}`}
            label="Back to fixture"
          />

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Match availability
            </p>

            <h1>
              {match?.opponent
                ? `Availability vs ${match.opponent}`
                : 'Availability'}
            </h1>

            <p>
              Review every response and
              assign available players to the
              Starting XI, substitutes or the
              available-player pool.
            </p>
          </div>

          {summary.awaiting_response > 0 && (
            <ManagerPlusPrompt
              teamId={teamId}
              currentUser={currentUser}
              compact
              title="Auto-remind the waiting players"
              description={`${summary.awaiting_response} still to reply. Plus can chase missing responses for you.`}
            />
          )}

          <section
            className="availability-summary"
            aria-label="Availability summary"
          >
            <article className="availability-summary-card available">
              <span>
                Available
              </span>

              <strong>
                {summary.available}
              </strong>
            </article>

            <article className="availability-summary-card unavailable">
              <span>
                Unavailable
              </span>

              <strong>
                {summary.unavailable}
              </strong>
            </article>

            <article className="availability-summary-card pending">
              <span>
                Pending
              </span>

              <strong>
                {
                  summary.awaiting_response
                }
              </strong>
            </article>
          </section>

          <div className="availability-groups">
            {renderPlayerGroup(
              'Available',
              'available',
              playersByStatus.available,
            )}

            {renderPlayerGroup(
              'Unavailable',
              'unavailable',
              playersByStatus.unavailable,
            )}

            {renderPlayerGroup(
              'Pending',
              'pending',
              playersByStatus.pending,
            )}
          </div>
        </section>
      </main>
    </>
  )
}

export default MatchAvailabilityPage
