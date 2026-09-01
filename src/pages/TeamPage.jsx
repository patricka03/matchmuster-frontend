import { useEffect, useState } from 'react'
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import {
  Lock,
  X,
} from 'lucide-react'

import Navbar from '../components/Navbar'
import TeamPlanBadge from '../components/TeamPlanBadge'
import API_URL from '../config/api'
import './TeamPage.css'
import './TeamPage.mobile.css'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

function TeamPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] =
    useSearchParams()

  const [teams, setTeams] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [deletingTeamId, setDeletingTeamId] = useState(null)
  const [leavingTeamId, setLeavingTeamId] = useState(null)
  const [plusPromptOpen, setPlusPromptOpen] = useState(false)
  const [plusPromptTeamId, setPlusPromptTeamId] = useState(null)

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

  const managerAccess =
    teams
      .map(
        (team) =>
          team.multi_team_access,
      )
      .find(
        (access) =>
          access
            ?.owned_by_current_manager ===
          true,
      ) ||
    teams
      .map(
        (team) =>
          team.multi_team_access,
      )
      .find(Boolean)

  const primaryTeam =
    teams.find(
      (team) =>
        team.multi_team_access
          ?.primary_team &&
        team.multi_team_access
          ?.owned_by_current_manager !==
          false,
    ) || teams[0]

  const accessibleTeam =
    teams.find(
      (team) =>
        team.multi_team_access
          ?.locked !== true,
    )

  const ownershipMetadataAvailable =
    teams.some(
      (team) =>
        typeof team.multi_team_access
          ?.owned_by_current_manager ===
        'boolean',
    )

  const ownsTeam =
    teams.some(
      (team) =>
        team.multi_team_access
          ?.owned_by_current_manager ===
        true,
    ) ||
    (!ownershipMetadataAvailable &&
      teams.length > 0)

  const canCreateAdditionalTeam =
    !ownsTeam ||
    managerAccess
      ?.can_create_additional_team ===
      true

  const subscriptionTeam =
    managerAccess
      ?.subscription_team

  const subscriptionTeamName =
    subscriptionTeam?.name ||
    primaryTeam?.name ||
    'your first team'

  const plusPromptTeam =
    teams.find(
      (team) =>
        team.id ===
        plusPromptTeamId,
    ) || null

  const plusPromptAccess =
    plusPromptTeam
      ?.multi_team_access

  const plusPromptForCoManagedTeam =
    plusPromptAccess?.locked ===
      true &&
    plusPromptAccess
      ?.owned_by_current_manager ===
      false

  const plusPromptOwnerName =
    plusPromptAccess?.owner?.name ||
    'The team owner'

  const plusPromptSubscriptionTeamName =
    plusPromptAccess
      ?.subscription_team?.name ||
    subscriptionTeamName

  const plusRequired =
    searchParams.get('plus') ===
    'required'

  useEffect(() => {
    if (
      !loading &&
      isApprovedManager &&
      plusRequired
    ) {
      setPlusPromptOpen(true)
    }
  }, [
    isApprovedManager,
    loading,
    plusRequired,
  ])

  function openPlusPrompt(team = null) {
    setPlusPromptTeamId(
      team?.id || null,
    )
    setPlusPromptOpen(true)
  }

  function closePlusPrompt() {
    setPlusPromptOpen(false)
    setPlusPromptTeamId(null)

    if (plusRequired) {
      setSearchParams(
        {},
        {
          replace: true,
        },
      )
    }
  }

  function openSubscriptionPage() {
    const subscriptionTeamId =
      subscriptionTeam?.id ||
      primaryTeam?.id

    if (!subscriptionTeamId) {
      setErrorMessage(
        'Subscription team could not be found.',
      )
      return
    }

    closePlusPrompt()

    navigate(
      `/teams/${subscriptionTeamId}/subscription`,
    )
  }

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
        teamId={accessibleTeam?.id}
        currentUser={currentUser}
      />

      <main className="dashboard-page team-management-page">
        <section className="dashboard-content">
          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Team details
            </p>

            <h1 className="mm-page-title">
              {isApprovedManager
                ? 'My Teams'
                : 'My Team'}
            </h1>

            {!isApprovedManager && (
              <p>See your team details and membership.</p>
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

          {!errorMessage && (
            <section className="team-page-grid matchmuster-team-list">
              {teams.map(
                (team) => {
                  const teamLocked =
                    team.multi_team_access
                      ?.locked === true

                  const primaryManagerTeam =
                    team.multi_team_access
                      ?.primary_team === true &&
                    team.multi_team_access
                      ?.owned_by_current_manager !==
                      false

                  const ownedByCurrentManager =
                    team.multi_team_access
                      ?.owned_by_current_manager !==
                    false

                  const ownerName =
                    team.multi_team_access
                      ?.owner?.name ||
                    'The team owner'

                  return (
                    <article
                      className={`team-details-card matchmuster-team-card${
                        teamLocked
                          ? ' matchmuster-team-card--locked'
                          : ''
                      }`}
                      key={team.id}
                    >
                    <div className="team-card-content">
                      <div className="matchmuster-team-heading">
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

                        <div className="matchmuster-team-copy">
                          <div className="matchmuster-team-kicker">
                            <p className="dashboard-label">
                              {primaryManagerTeam
                                ? 'Primary team'
                                : 'Your club'}
                            </p>

                            {teamLocked && (
                              <span className="matchmuster-team-lock-pill">
                                <Lock
                                  size={14}
                                  aria-hidden="true"
                                />
                                Plus
                              </span>
                            )}
                          </div>

                          <div className="matchmuster-team-name-row">
                            <h2>
                              {team.name}
                            </h2>

                            {isApprovedManager && (
                              <TeamPlanBadge
                                team={team}
                                compact
                              />
                            )}
                          </div>

                          <p className="team-description">
                            {team.description ||
                              'No description added.'}
                          </p>
                        </div>
                      </div>

                      {teamLocked ? (
                        <div className="matchmuster-team-lock-message">
                          <Lock
                            size={20}
                            aria-hidden="true"
                          />

                          <div>
                            <strong>
                              {ownedByCurrentManager
                                ? 'Locked until Plus resumes'
                                : `${ownerName} needs to resume Plus`}
                            </strong>

                            <span>
                              {ownedByCurrentManager
                                ? 'Your team and its data are safely saved.'
                                : 'Only the team owner can unlock this team. Its data remains saved.'}
                            </span>
                          </div>
                        </div>
                      ) : isApprovedManager &&
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
                      {teamLocked ? (
                        <button
                          className="matchmuster-plus-button"
                          type="button"
                          onClick={() =>
                            openPlusPrompt(
                              team,
                            )
                          }
                        >
                          {ownedByCurrentManager
                            ? 'View Plus'
                            : 'View status'}
                        </button>
                      ) : (
                        <>
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

                              {ownedByCurrentManager &&
                                primaryManagerTeam && (
                                  <button
                                    className="matchmuster-plan-button"
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/teams/${team.id}/subscription`,
                                      )
                                    }
                                  >
                                    Plan
                                  </button>
                                )}

                              {ownedByCurrentManager && (
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
                              )}
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
                        </>
                      )}
                    </div>
                    </article>
                  )
                },
              )}

              {isApprovedManager && (
                <article className={`team-details-card add-team-card matchmuster-add-team-card${
                  canCreateAdditionalTeam
                    ? ''
                    : ' matchmuster-add-team-card--locked'
                }`}>
                  <div className="matchmuster-add-team-icon">
                    {canCreateAdditionalTeam ? (
                      
                    ) : (
                      <Lock
                        size={22}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <h2>
                    Add another team
                  </h2>

                  <p>
                    {canCreateAdditionalTeam
                      ? 'Create and manage another football team.'
                      : 'Additional teams are included with MatchMuster Plus.'}
                  </p>

                  <button
                    type="button"
                    onClick={
                      canCreateAdditionalTeam
                        ? () =>
                            navigate(
                              '/teams/new',
                            )
                        : openPlusPrompt
                    }
                  >
                    {canCreateAdditionalTeam
                      ? 'Add team'
                      : 'Unlock with Plus'}
                  </button>
                </article>
              )}
            </section>
          )}
        </section>
      </main>

      {plusPromptOpen &&
        isApprovedManager && (
          <div
            className="matchmuster-plus-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closePlusPrompt()
              }
            }}
          >
            <section
              className="matchmuster-plus-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="matchmuster-plus-title"
            >
              <button
                className="matchmuster-plus-close"
                type="button"
                aria-label="Close MatchMuster Plus information"
                onClick={closePlusPrompt}
              >
                <X
                  size={20}
                  aria-hidden="true"
                />
              </button>

              <div className="matchmuster-plus-mark">
                <Lock
                  size={24}
                  aria-hidden="true"
                />
              </div>

              <p className="dashboard-label">
                MatchMuster Plus
              </p>

              <h2 id="matchmuster-plus-title">
                {plusPromptForCoManagedTeam
                  ? `${plusPromptTeam.name} is locked`
                  : plusPromptTeam
                    ? `${plusPromptTeam.name} needs Plus`
                    : 'Manage more than one team'}
              </h2>

              <p>
                {plusPromptForCoManagedTeam
                  ? `${plusPromptOwnerName} owns this team and needs to resume MatchMuster Plus before any manager can open it.`
                  : plusPromptTeam
                    ? 'Resume Plus to reopen this additional team. Its members and data remain safely saved while it is locked.'
                    : 'Your first team stays Free. Plus unlocks every additional team you own.'}
              </p>

              {!plusPromptForCoManagedTeam && (
                <ul>
                  <li>
                    Additional owned teams
                  </li>

                  <li>
                    Automatic manager reminders
                  </li>

                  <li>
                    Advanced team insights
                  </li>
                </ul>
              )}

              <div className="matchmuster-plus-note">
                {plusPromptForCoManagedTeam ? (
                  <>
                    Plus is managed through <strong>{plusPromptSubscriptionTeamName}</strong>. Only the team owner can change this subscription.
                  </>
                ) : (
                  <>
                    Plus is managed through <strong>{plusPromptSubscriptionTeamName}</strong>. Locked teams reopen automatically when Plus is active.
                  </>
                )}
              </div>

              <div className="matchmuster-plus-actions">
                {!plusPromptForCoManagedTeam && (
                  <button
                    className="matchmuster-plus-manage"
                    type="button"
                    onClick={
                      openSubscriptionPage
                    }
                  >
                    View Plus
                  </button>
                )}

                <button
                  className="matchmuster-plus-dismiss"
                  type="button"
                  onClick={closePlusPrompt}
                >
                  {plusPromptForCoManagedTeam
                    ? 'Got it'
                    : 'Not now'}
                </button>
              </div>
            </section>
          </div>
        )}
    </>
  )
}

export default TeamPage
