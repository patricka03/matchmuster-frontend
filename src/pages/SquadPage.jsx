import { useCallback, useEffect, useState, } from 'react'

import { useNavigate, useParams, } from 'react-router-dom'

import Navbar from '../components/Navbar'
import './SquadPage.css'
import './SquadPage.mobile.css'
import API_URL from '../config/api'


async function readJson(response) {
  const responseText = await response.text()

  if (!responseText) return {}

  try {
    return JSON.parse(responseText)
  } catch {
    return {}
  }
}

function getApiError(data, fallbackMessage) {
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error
  }

  if (Array.isArray(data?.errors)) {
    return data.errors.join(', ')
  }

  if (
    data?.errors &&
    typeof data.errors === 'object'
  ) {
    const errorMessages = Object.values(
      data.errors
    )
      .flat()
      .filter(Boolean)

    if (errorMessages.length > 0) {
      return errorMessages.join(', ')
    }
  }

  if (
    typeof data?.message === 'string' &&
    data.message.trim()
  ) {
    return data.message
  }

  return fallbackMessage
}

function getMemberships(data) {
  if (Array.isArray(data)) return data

  if (Array.isArray(data?.memberships)) {
    return data.memberships
  }

  if (Array.isArray(data?.team_memberships)) {
    return data.team_memberships
  }

  return []
}

function sameId(firstId, secondId) {
  if (firstId == null || secondId == null) {
    return false
  }

  return String(firstId) === String(secondId)
}

function getMembershipUserId(membership) {
  return membership?.user?.id ?? membership?.user_id
}

function getMemberDetails(membership) {
  const user = membership?.user || {}

  const firstName =
    typeof user.first_name === 'string'
      ? user.first_name.trim()
      : ''

  const lastName =
    typeof user.last_name === 'string'
      ? user.last_name.trim()
      : ''

  const savedName =
    typeof user.name === 'string'
      ? user.name.trim()
      : ''

  const email =
    typeof user.email === 'string'
      ? user.email.trim()
      : ''

  const fullName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    savedName ||
    email.split('@')[0] ||
    'Team member'

  const initials =
    fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((namePart) => namePart[0])
      .join('')
      .toUpperCase() || '?'

  return {
    fullName,
    initials,
    email: email || 'Email unavailable',
  }
}

function MemberDetails({
  membership,
  managerBadge = false,
  pendingBadge = false,
}) {
  const member = getMemberDetails(membership)

  return (
    <>
      <div className="member-avatar">
        {member.initials}
      </div>

      <div className="member-details">
        <h3>{member.fullName}</h3>

        <p>{member.email}</p>

        <div className="membership-badges">
          {managerBadge ? (
            <span className="manager-badge">
              Manager
            </span>
          ) : (
            <span className="position-badge">
              {membership.preferred_position ||
                'Position not set'}
            </span>
          )}

          {pendingBadge && (
            <span className="pending-badge">
              Pending
            </span>
          )}
        </div>
      </div>
    </>
  )
}

function SquadPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [memberships, setMemberships] = useState([])
  const [currentUser, setCurrentUser] =
    useState(null)

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] =
    useState('')

  const [membershipAction, setMembershipAction] =
    useState(null)

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')

    navigate('/login', { replace: true })
  }, [navigate])

  const fetchMemberships = useCallback(async () => {
    const token = localStorage.getItem('token')

    if (!token) {
      redirectToLogin()
      return false
    }

    if (!teamId) {
      setErrorMessage(
        'The team could not be identified.'
      )
      setLoading(false)
      return false
    }

    const headers = {
      Accept: 'application/json',
      Authorization: token,
    }

    try {
      const [membershipsResponse, userResponse] =
        await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/team_memberships`,
            { headers }
          ),
          fetch(`${API_URL}/users/me`, { headers }),
        ])

      const [membershipsData, userData] =
        await Promise.all([
          readJson(membershipsResponse),
          readJson(userResponse),
        ])

      if (
        membershipsResponse.status === 401 ||
        userResponse.status === 401
      ) {
        redirectToLogin()
        return false
      }

      if (
        membershipsResponse.status === 403 ||
        userResponse.status === 403
      ) {
        navigate('/dashboard', { replace: true })
        return false
      }

      if (!membershipsResponse.ok) {
        throw new Error(
          getApiError(
            membershipsData,
            'Unable to load the squad.'
          )
        )
      }

      if (!userResponse.ok) {
        throw new Error(
          getApiError(
            userData,
            'Unable to load your account.'
          )
        )
      }

      const loadedMemberships =
        getMemberships(membershipsData)

      const loadedUser = userData.user || userData

      if (!loadedUser?.id) {
        throw new Error(
          'Your account information could not be found.'
        )
      }

      const currentMembership =
        loadedMemberships.find((membership) =>
          sameId(
            getMembershipUserId(membership),
            loadedUser.id
          )
        )

      const approvedManagerOfTeam =
        loadedUser.account_type === 'manager' &&
        loadedUser.manager_verification_status ===
          'approved' &&
        currentMembership?.role === 'manager' &&
        currentMembership?.status === 'approved'

      const approvedPlayerOfTeam =
        loadedUser.account_type === 'player' &&
        currentMembership?.role === 'player' &&
        currentMembership?.status === 'approved'

      /*
       * Pending managers, pending players and users who
       * do not belong to this team cannot view the squad.
       */
      if (
        !approvedManagerOfTeam &&
        !approvedPlayerOfTeam
      ) {
        navigate('/dashboard', { replace: true })
        return false
      }

      setMemberships(loadedMemberships)
      setCurrentUser(loadedUser)
      setErrorMessage('')

      return true
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to connect to the server.'
      )

      return false
    } finally {
      setLoading(false)
    }
  }, [
    navigate,
    redirectToLogin,
    teamId,
  ])

  useEffect(() => {
    fetchMemberships()
  }, [fetchMemberships])

  async function updateMembership(
    membershipId,
    action
  ) {
    if (!['approve', 'reject'].includes(action)) {
      return
    }

    if (membershipAction) return

    const token = localStorage.getItem('token')

    if (!token) {
      redirectToLogin()
      return
    }

    setMembershipAction({
      id: membershipId,
      type: action,
    })

    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/team_memberships/${membershipId}/${action}`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        }
      )

      const data = await readJson(response)

      if (response.status === 401) {
        redirectToLogin()
        return
      }

      if (response.status === 403) {
        navigate('/dashboard', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          getApiError(
            data,
            `Unable to ${action} this request.`
          )
        )
      }

      await fetchMemberships()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to connect to the server.'
      )
    } finally {
      setMembershipAction(null)
    }
  }

  async function removeMembership(membershipId) {
    if (membershipAction) return

    const confirmed = window.confirm(
      'Are you sure you want to remove this player from the team?'
    )

    if (!confirmed) return

    const token = localStorage.getItem('token')

    if (!token) {
      redirectToLogin()
      return
    }

    setMembershipAction({
      id: membershipId,
      type: 'remove',
    })

    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/team_memberships/${membershipId}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        }
      )

      /*
       * This safely works whether Rails returns JSON
       * or an empty 204 response.
       */
      const data = await readJson(response)

      if (response.status === 401) {
        redirectToLogin()
        return
      }

      if (response.status === 403) {
        navigate('/dashboard', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          getApiError(
            data,
            'Unable to remove this membership.'
          )
        )
      }

      setMemberships((currentMemberships) =>
        currentMemberships.filter(
          (membership) =>
            !sameId(
              membership.id,
              membershipId
            )
        )
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to connect to the server.'
      )
    } finally {
      setMembershipAction(null)
    }
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading squad...
      </p>
    )
  }

  const currentMembership =
    memberships.find((membership) =>
      sameId(
        getMembershipUserId(membership),
        currentUser?.id
      )
    )

  const isApprovedManager =
    currentUser?.account_type === 'manager' &&
    currentUser?.manager_verification_status ===
      'approved' &&
    currentMembership?.role === 'manager' &&
    currentMembership?.status === 'approved'

  const isApprovedPlayer =
    currentUser?.account_type === 'player' &&
    currentMembership?.role === 'player' &&
    currentMembership?.status === 'approved'

  const pendingMemberships = memberships.filter(
    (membership) =>
      membership?.status === 'pending'
  )

  const approvedPlayers = memberships.filter(
    (membership) =>
      membership?.role === 'player' &&
      membership?.status === 'approved'
  )

  const approvedManagers = memberships.filter(
    (membership) =>
      membership?.role === 'manager' &&
      membership?.status === 'approved'
  )

  const actionInProgress =
    membershipAction !== null

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <div className="dashboard-welcome">
            <p className="dashboard-label">
              {isApprovedManager
                ? 'Team management'
                : 'Team squad'}
            </p>

            <h1>Squad</h1>

            <p>
              {isApprovedManager
                ? 'View players and managers, and manage pending join requests.'
                : 'View the players and managers in your team.'}
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

          {currentUser && (
            <>
              {isApprovedManager && (
                <section className="squad-section">
                  <div className="squad-section-heading">
                    <div>
                      <h2>Pending requests</h2>

                      <p>
                        Players and managers waiting to join
                        your team.
                      </p>
                    </div>

                    <span className="squad-count">
                      {pendingMemberships.length}
                    </span>
                  </div>

                  {pendingMemberships.length === 0 ? (
                    <div className="squad-empty">
                      There are no pending join requests.
                    </div>
                  ) : (
                    <div className="membership-list">
                      {pendingMemberships.map(
                        (membership) => {
                          const rowBusy = sameId(
                            membershipAction?.id,
                            membership.id
                          )

                          return (
                            <article
                              className="membership-card"
                              key={membership.id}
                            >
                              <MemberDetails
                                membership={membership}
                                managerBadge={
                                  membership.role ===
                                  'manager'
                                }
                                pendingBadge
                              />

                              <div className="membership-actions">
                                <button
                                  className="approve-button"
                                  type="button"
                                  disabled={
                                    actionInProgress
                                  }
                                  onClick={() =>
                                    updateMembership(
                                      membership.id,
                                      'approve'
                                    )
                                  }
                                >
                                  {rowBusy &&
                                  membershipAction?.type ===
                                    'approve'
                                    ? 'Approving...'
                                    : 'Approve'}
                                </button>

                                <button
                                  className="reject-button"
                                  type="button"
                                  disabled={
                                    actionInProgress
                                  }
                                  onClick={() =>
                                    updateMembership(
                                      membership.id,
                                      'reject'
                                    )
                                  }
                                >
                                  {rowBusy &&
                                  membershipAction?.type ===
                                    'reject'
                                    ? 'Rejecting...'
                                    : 'Reject'}
                                </button>
                              </div>
                            </article>
                          )
                        }
                      )}
                    </div>
                  )}
                </section>
              )}

              <section className="squad-section">
                <div className="squad-section-heading">
                  <div>
                    <h2>Players</h2>

                    <p>
                      Approved members of the squad.
                    </p>
                  </div>

                  <span className="squad-count">
                    {approvedPlayers.length}
                  </span>
                </div>

                {approvedPlayers.length === 0 ? (
                  <div className="squad-empty">
                    There are no approved players yet.
                  </div>
                ) : (
                  <div className="membership-list">
                    {approvedPlayers.map(
                      (membership) => {
                        const rowBusy = sameId(
                          membershipAction?.id,
                          membership.id
                        )

                        return (
                          <article
                            className="membership-card"
                            key={membership.id}
                          >
                            <MemberDetails
                              membership={membership}
                            />

                            {isApprovedManager && (
                              <button
                                className="remove-button"
                                type="button"
                                disabled={
                                  actionInProgress
                                }
                                onClick={() =>
                                  removeMembership(
                                    membership.id
                                  )
                                }
                              >
                                {rowBusy &&
                                membershipAction?.type ===
                                  'remove'
                                  ? 'Removing...'
                                  : 'Remove'}
                              </button>
                            )}
                          </article>
                        )
                      }
                    )}
                  </div>
                )}
              </section>

              <section className="squad-section">
                <div className="squad-section-heading">
                  <div>
                    <h2>Managers</h2>

                    <p>
                      Approved managers of this team.
                    </p>
                  </div>

                  <span className="squad-count">
                    {approvedManagers.length}
                  </span>
                </div>

                {approvedManagers.length === 0 ? (
                  <div className="squad-empty">
                    There are no approved managers yet.
                  </div>
                ) : (
                  <div className="membership-list">
                    {approvedManagers.map(
                      (membership) => (
                        <article
                          className="membership-card"
                          key={membership.id}
                        >
                          <MemberDetails
                            membership={membership}
                            managerBadge
                          />
                        </article>
                      )
                    )}
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

export default SquadPage
