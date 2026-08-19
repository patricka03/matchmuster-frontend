import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

function TeamPage() {
  const navigate = useNavigate()

  const [teams, setTeams] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [deletingTeamId, setDeletingTeamId] = useState(null)
  const [leavingTeamId, setLeavingTeamId] = useState(null)

  // ========================================
  // SESSION
  // ========================================

  async function clearTeamSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  // ========================================
  // LOAD TEAM PAGE
  // ========================================

  useEffect(() => {
    async function fetchTeamPage() {
      const token = getAuthToken()

      if (!token) {
        await clearTeamSession()

        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const [
          teamsResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams`,
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
          teamsResponse.status === 401 ||
          userResponse.status === 401
        ) {
          await clearTeamSession()

          return
        }

        const teamsData =
          await teamsResponse.json()

        const userData =
          await userResponse.json()

        if (!teamsResponse.ok) {
          throw new Error(
            teamsData.error ||
              'Unable to load your teams.',
          )
        }

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              'Unable to load your account.',
          )
        }

        const loadedTeams =
          Array.isArray(teamsData)
            ? teamsData
            : teamsData.teams || []

        const loadedUser =
          userData.user ||
          userData

        const pendingManager =
          loadedUser.account_type ===
            'manager' &&
          loadedUser.manager_verification_status !==
            'approved'

        const playerWithoutApprovedTeam =
          loadedUser.account_type ===
            'player' &&
          loadedTeams.length === 0

        if (
          pendingManager ||
          playerWithoutApprovedTeam
        ) {
          navigate('/dashboard', {
            replace: true,
          })

          return
        }

        setTeams(loadedTeams)
        setCurrentUser(loadedUser)
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchTeamPage()
  }, [navigate])

  // ========================================
  // USER TYPES
  // ========================================

  const isApprovedManager =
    currentUser?.account_type ===
      'manager' &&
    currentUser
      ?.manager_verification_status ===
      'approved'

  const isPlayer =
    currentUser?.account_type ===
    'player'

  // ========================================
  // DELETE TEAM
  // ========================================

  async function handleDeleteTeam(team) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${team.name}? This will permanently delete the team.`,
      )

    if (!confirmed) {
      return
    }

    const token = getAuthToken()

    if (!token) {
      await clearTeamSession()

      return
    }

    setDeletingTeamId(team.id)
    setErrorMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/teams/${team.id}`,
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
        await clearTeamSession()

        return
      }

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.errors?.join(', ') ||
            'Unable to delete the team.',
        )
      }

      setTeams(
        (currentTeams) =>
          currentTeams.filter(
            (currentTeam) =>
              currentTeam.id !==
              team.id,
          ),
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to delete the team.',
      )
    } finally {
      setDeletingTeamId(null)
    }
  }

  // ========================================
  // LEAVE TEAM
  // ========================================

  async function handleLeaveTeam(team) {
    const confirmed =
      window.confirm(
        `Are you sure you want to leave ${team.name}?`,
      )

    if (!confirmed) {
      return
    }

    if (!team.membership_id) {
      setErrorMessage(
        'Your team membership could not be found.',
      )

      return
    }

    const token = getAuthToken()

    if (!token) {
      await clearTeamSession()

      return
    }

    setLeavingTeamId(team.id)
    setErrorMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/team_memberships/${team.membership_id}`,
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
        await clearTeamSession()

        return
      }

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.errors?.join(', ') ||
            'Unable to leave the team.',
        )
      }

      setTeams(
        (currentTeams) =>
          currentTeams.filter(
            (currentTeam) =>
              currentTeam.id !==
              team.id,
          ),
      )

      localStorage.removeItem(
        'activeTeamId',
      )

      localStorage.removeItem(
        'activeTeamName',
      )

      navigate('/dashboard')
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to leave the team.',
      )
    } finally {
      setLeavingTeamId(null)
    }
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading your team...
      </p>
    )
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <Navbar
        teamId={teams[0]?.id}
        currentUser={currentUser}
      />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <button
            className="app-back-button"
            type="button"
            onClick={() =>
              navigate('/dashboard')
            }
          >
            Back to dashboard
          </button>

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Team details
            </p>

            <h1>
              {isApprovedManager
                ? 'My Teams'
                : 'My Team'}
            </h1>

            <p>
              View and manage your football teams.
            </p>
          </div>

          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {!errorMessage && (
            <section className="team-page-grid">
              {teams.map(
                (team) => (
                  <article
                    className="team-details-card"
                    key={team.id}
                  >
                    <div className="team-card-content">
                      <div className="team-card-badge">
                        {team.badge_url ? (
                          <img
                            src={
                              team.badge_url
                            }
                            alt={`${team.name} badge`}
                          />
                        ) : (
                          <span
                            aria-label="Default football badge"
                          >
                            ⚽
                          </span>
                        )}
                      </div>

                      <p className="dashboard-label">
                        Your club
                      </p>

                      <h2>
                        {team.name}
                      </h2>

                      <p className="team-description">
                        {team.description ||
                          'No team description has been added.'}
                      </p>

                      {isApprovedManager &&
                        team.invite_code && (
                          <div className="invite-code">
                            <span>
                              Invite code
                            </span>

                            <strong>
                              {
                                team.invite_code
                              }
                            </strong>
                          </div>
                        )}
                    </div>

                    <div className="team-card-actions">
                      <button
                        className="view-squad-button"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/teams/${team.id}/squad`,
                          )
                        }
                      >
                        View squad
                      </button>

                      {isApprovedManager && (
                        <>
                          <button
                            className="edit-team-button"
                            type="button"
                            onClick={() =>
                              navigate(
                                `/teams/${team.id}/edit`,
                              )
                            }
                          >
                            Edit team
                          </button>

                          <button
                            className="delete-team-button"
                            type="button"
                            disabled={
                              deletingTeamId ===
                              team.id
                            }
                            onClick={() =>
                              handleDeleteTeam(
                                team,
                              )
                            }
                          >
                            {deletingTeamId ===
                            team.id
                              ? 'Deleting...'
                              : 'Delete team'}
                          </button>
                        </>
                      )}

                      {isPlayer && (
                        <button
                          className="leave-team-button"
                          type="button"
                          disabled={
                            leavingTeamId ===
                            team.id
                          }
                          onClick={() =>
                            handleLeaveTeam(
                              team,
                            )
                          }
                        >
                          {leavingTeamId ===
                          team.id
                            ? 'Leaving...'
                            : 'Leave team'}
                        </button>
                      )}
                    </div>
                  </article>
                ),
              )}

              {isApprovedManager && (
                <article className="team-details-card add-team-card">
                  <div
                    className="card-icon"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate(
                        '/teams/new',
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                          'Enter' ||
                        event.key === ' '
                      ) {
                        navigate(
                          '/teams/new',
                        )
                      }
                    }}
                  >
                    ＋
                  </div>

                  <h2>
                    Add another team
                  </h2>

                  <p>
                    Create and manage another football team.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        '/teams/new',
                      )
                    }
                  >
                    Add team
                  </button>
                </article>
              )}
            </section>
          )}
        </section>
      </main>
    </>
  )
}

export default TeamPage
