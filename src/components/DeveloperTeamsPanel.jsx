import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import './DeveloperTeamsPanel.css'

function DeveloperTeamsPanel() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [summary, setSummary] = useState(null)
  const [query, setQuery] = useState('')
  const [plan, setPlan] = useState('all')
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const developerToken = localStorage.getItem('developerToken')

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${developerToken}`,
        ...(options.headers || {}),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      localStorage.removeItem('developerToken')
      navigate('/developer/login', { replace: true })
      throw new Error('Developer session expired.')
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.errors?.join(', ') ||
          'Unable to complete developer action.',
      )
    }

    return data
  }, [developerToken, navigate])

  const loadTeams = useCallback(async () => {
    if (!developerToken) {
      navigate('/developer/login', { replace: true })
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('query', query.trim())
      if (plan !== 'all') params.set('plan', plan)

      const data = await request(
        `${API_URL}/developer/teams${params.toString() ? `?${params.toString()}` : ''}`,
      )

      setTeams(data.teams || [])
      setSummary(data.summary || null)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [developerToken, navigate, plan, query, request])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTeams()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadTeams])

  async function createTeam() {
    const name = window.prompt('New team name:')
    if (name === null || !name.trim()) return

    const ownerUserId = window.prompt(
      'Approved manager user ID who will own this team:',
    )
    if (ownerUserId === null || !ownerUserId.trim()) return

    const description = window.prompt(
      'Team description (optional):',
      '',
    )
    if (description === null) return

    const notes = window.prompt(
      `Why are you creating ${name.trim()}?`,
    )
    if (notes === null || !notes.trim()) return

    setWorking(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = await request(
        `${API_URL}/developer/teams`,
        {
          method: 'POST',
          body: JSON.stringify({
            team: {
              name: name.trim(),
              description: description.trim(),
              owner_user_id: ownerUserId.trim(),
              notes: notes.trim(),
            },
          }),
        },
      )

      setSelectedTeam(data.team)
      setSuccessMessage(data.message || 'Team created.')
      await loadTeams()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setWorking(false)
    }
  }

  async function openTeam(teamId) {
    setDetailsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = await request(
        `${API_URL}/developer/teams/${teamId}`,
      )
      setSelectedTeam(data.team)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setDetailsLoading(false)
    }
  }

  async function action(team, endpoint, method, label, body = {}) {
    const notes = window.prompt(
      `Developer audit note for "${label}" on ${team.name}:`,
    )

    if (notes === null) return
    if (!notes.trim()) {
      setErrorMessage('A reason is required for developer actions.')
      return
    }

    setWorking(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = await request(
        `${API_URL}/developer/teams/${team.id}${endpoint}`,
        {
          method,
          body: JSON.stringify({
            ...body,
            developer_action: {
              ...(body.developer_action || {}),
              notes: notes.trim(),
            },
          }),
        },
      )

      if (data.team) {
        setSelectedTeam(data.team)
        setTeams((current) =>
          current.map((item) =>
            item.id === data.team.id
              ? {
                  ...item,
                  ...data.team,
                }
              : item,
          ),
        )
      }

      setSuccessMessage(data.message || `${label} completed.`)
      await loadTeams()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setWorking(false)
    }
  }

  async function updateTeam(team) {
    const name = window.prompt('Team name:', team.name)
    if (name === null) return

    const description = window.prompt(
      'Team description:',
      team.description || '',
    )
    if (description === null) return

    const notes = window.prompt(
      `Why are you updating ${team.name}?`,
    )
    if (notes === null || !notes.trim()) return

    setWorking(true)
    try {
      const data = await request(
        `${API_URL}/developer/teams/${team.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            team: {
              name: name.trim(),
              description: description.trim(),
            },
            developer_action: {
              notes: notes.trim(),
            },
          }),
        },
      )

      setSelectedTeam(data.team)
      setSuccessMessage(data.message)
      await loadTeams()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setWorking(false)
    }
  }

  async function grantPlus(team) {
    const days = window.prompt(
      'How many days of complimentary Plus?',
      '30',
    )
    if (days === null) return

    await action(
      team,
      '/grant_plus',
      'POST',
      'Grant complimentary Plus',
      {
        developer_action: {
          days,
        },
      },
    )
  }

  async function extendPlus(team) {
    const days = window.prompt(
      'How many additional Plus days?',
      '30',
    )
    if (days === null) return

    await action(
      team,
      '/extend_plus',
      'PATCH',
      'Extend Plus',
      {
        developer_action: {
          days,
        },
      },
    )
  }

  async function transferOwner(team) {
    const approvedManagers =
      team.memberships?.filter(
        (membership) =>
          membership.role === 'manager' &&
          membership.status === 'approved',
      ) || []

    if (approvedManagers.length === 0) {
      setErrorMessage('This team has no approved manager to assign as owner.')
      return
    }

    const choices = approvedManagers
      .map(
        (membership) =>
          `${membership.user.id}: ${displayName(membership.user)} (${membership.user.email})`,
      )
      .join('\n')

    const userId = window.prompt(
      `Enter the user ID of the new owner:\n\n${choices}`,
      approvedManagers[0]?.user?.id || '',
    )

    if (userId === null) return

    await action(
      team,
      '/transfer_owner',
      'PATCH',
      'Transfer team ownership',
      {
        developer_action: {
          user_id: userId,
        },
      },
    )
  }

  async function deleteTeam(team) {
    const confirmation = window.prompt(
      `Permanently delete ${team.name} and its team data? Type DELETE TEAM to confirm.`,
    )

    if (confirmation !== 'DELETE TEAM') return

    const notes = window.prompt(
      `Why are you permanently deleting ${team.name}?`,
    )

    if (notes === null || !notes.trim()) {
      setErrorMessage('A deletion reason is required.')
      return
    }

    setWorking(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = await request(
        `${API_URL}/developer/teams/${team.id}`,
        {
          method: 'DELETE',
          body: JSON.stringify({
            developer_action: {
              notes: notes.trim(),
              confirmation,
            },
          }),
        },
      )

      setSelectedTeam(null)
      setSuccessMessage(data.message || 'Team deleted.')
      await loadTeams()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setWorking(false)
    }
  }

  async function addMembership(team) {
    const userId = window.prompt('User ID to add to this team:')
    if (userId === null || !userId.trim()) return

    const role = window.prompt(
      'Membership role: manager or player',
      'player',
    )
    if (role === null) return

    const status = window.prompt(
      'Membership status: approved, pending or rejected',
      'approved',
    )
    if (status === null) return

    const preferredPosition = window.prompt(
      'Preferred position: GK, CB, LB, RB, CDM, CM, LW, RW or ST',
      'CM',
    )
    if (preferredPosition === null) return

    const notes = window.prompt('Reason for adding this membership:')
    if (notes === null || !notes.trim()) return

    setWorking(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await request(
        `${API_URL}/developer/teams/${team.id}/memberships`,
        {
          method: 'POST',
          body: JSON.stringify({
            membership: {
              user_id: userId.trim(),
              role: role.trim().toLowerCase(),
              status: status.trim().toLowerCase(),
              preferred_position: preferredPosition.trim().toUpperCase(),
            },
            developer_action: {
              notes: notes.trim(),
            },
          }),
        },
      )

      setSuccessMessage('Membership added.')
      await openTeam(team.id)
      await loadTeams()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setWorking(false)
    }
  }

  async function updateMembership(team, membership, changes) {
    const notes = window.prompt(
      `Reason for changing ${displayName(membership.user)}'s membership:`,
    )
    if (notes === null || !notes.trim()) return

    setWorking(true)

    try {
      await request(
        `${API_URL}/developer/teams/${team.id}/memberships/${membership.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            membership: changes,
            developer_action: {
              notes: notes.trim(),
            },
          }),
        },
      )

      setSuccessMessage('Membership updated.')
      await openTeam(team.id)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setWorking(false)
    }
  }

  async function removeMembership(team, membership) {
    if (
      !window.confirm(
        `Remove ${displayName(membership.user)} from ${team.name}?`,
      )
    ) {
      return
    }

    const notes = window.prompt('Reason for removing this membership:')
    if (notes === null || !notes.trim()) return

    setWorking(true)

    try {
      await request(
        `${API_URL}/developer/teams/${team.id}/memberships/${membership.id}`,
        {
          method: 'DELETE',
          body: JSON.stringify({
            developer_action: {
              notes: notes.trim(),
            },
          }),
        },
      )

      setSuccessMessage('Membership removed.')
      await openTeam(team.id)
      await loadTeams()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setWorking(false)
    }
  }

  const selectedSubscription = selectedTeam?.subscription
  const paidStoreSubscription = useMemo(
    () =>
      ['apple', 'google_play'].includes(
        selectedSubscription?.source,
      ),
    [selectedSubscription],
  )

  return (
    <>
      <header className="developer-header">
        <div>
          <p>TEAM COMMAND</p>
          <h1 className="mm-page-title">Teams & access</h1>
          <span>
            Inspect every club, control ownership, memberships, Founder Club
            status and complimentary Plus.
          </span>
        </div>

        <div className="developer-header-command-row">
          <button
            className="developer-refresh-button"
            type="button"
            onClick={createTeam}
            disabled={working}
          >
            Create team
          </button>

          <button
            className="developer-refresh-button"
            type="button"
            onClick={loadTeams}
            disabled={loading || working}
          >
            Refresh
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="developer-dashboard-error">{errorMessage}</div>
      )}

      {successMessage && (
        <div className="developer-dashboard-success">{successMessage}</div>
      )}

      {summary && (
        <section className="developer-control-stat-grid">
          <article><span>Teams</span><strong>{summary.total}</strong></article>
          <article><span>Plus</span><strong>{summary.plus}</strong></article>
          <article><span>Paid Plus</span><strong>{summary.paid}</strong></article>
          <article><span>Founder clubs</span><strong>{summary.founder}</strong></article>
        </section>
      )}

      <form
        className="developer-control-filters"
        onSubmit={(event) => {
          event.preventDefault()
          void loadTeams()
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search team name or invite code"
        />

        <select
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
        >
          <option value="all">All plans</option>
          <option value="plus">Plus</option>
          <option value="paid">Paid Plus</option>
          <option value="complimentary">Complimentary / trial</option>
          <option value="founder">Founder clubs</option>
          <option value="free">Free</option>
        </select>

        <button type="submit">Search</button>
      </form>

      {loading ? (
        <div className="developer-control-empty">Loading teams…</div>
      ) : teams.length === 0 ? (
        <div className="developer-control-empty">No teams match these filters.</div>
      ) : (
        <section className="developer-team-list">
          {teams.map((team) => (
            <article className="developer-team-row" key={team.id}>
              <div>
                <div className="developer-team-title-row">
                  <strong>{team.name}</strong>
                  {team.launch_club && <span className="founder">Founder</span>}
                  <span
                    className={
                      team.subscription?.plus_active ? 'plus' : 'free'
                    }
                  >
                    {team.subscription?.plus_active ? 'Plus' : 'Free'}
                  </span>
                </div>

                <p>
                  {team.owner?.email || 'No owner'} · {team.member_count} members ·
                  {' '}Invite {team.invite_code}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openTeam(team.id)}
                disabled={detailsLoading}
              >
                Manage
              </button>
            </article>
          ))}
        </section>
      )}

      {selectedTeam && (
        <section className="developer-team-detail">
          <div className="developer-team-detail-header">
            <div>
              <p>TEAM #{selectedTeam.id}</p>
              <h2>{selectedTeam.name}</h2>
              <span>
                Owner: {selectedTeam.owner?.email || 'Not assigned'} · Invite:
                {' '}{selectedTeam.invite_code}
              </span>
            </div>

            <button type="button" onClick={() => setSelectedTeam(null)}>
              Close
            </button>
          </div>

          <div className="developer-detail-grid">
            <article><span>Members</span><strong>{selectedTeam.member_count}</strong></article>
            <article><span>Managers</span><strong>{selectedTeam.approved_manager_count}</strong></article>
            <article><span>Players</span><strong>{selectedTeam.approved_player_count}</strong></article>
            <article><span>Fixtures</span><strong>{selectedTeam.fixtures_count}</strong></article>
            <article><span>Trainings</span><strong>{selectedTeam.trainings_count}</strong></article>
            <article><span>Posts</span><strong>{selectedTeam.posts_count}</strong></article>
          </div>

          <div className="developer-team-subscription">
            <div>
              <span>Current access</span>
              <strong>
                {selectedSubscription?.plus_active ? 'MatchMuster Plus' : 'Free'}
              </strong>
              <small>
                {selectedSubscription?.source || 'No entitlement'}
                {selectedSubscription?.ends_at
                  ? ` · ends ${formatDate(selectedSubscription.ends_at)}`
                  : ''}
              </small>
            </div>

            {paidStoreSubscription && (
              <div className="developer-store-lock">
                Store-managed via {formatLabel(selectedSubscription.source)}.
                Developer controls will not overwrite this paid subscription.
              </div>
            )}
          </div>

          <div className="developer-command-grid">
            <button type="button" onClick={() => updateTeam(selectedTeam)} disabled={working}>
              Edit team
            </button>
            <button
              type="button"
              onClick={() =>
                action(
                  selectedTeam,
                  '/regenerate_invite_code',
                  'PATCH',
                  'Regenerate invite code',
                )
              }
              disabled={working}
            >
              New invite code
            </button>
            <button type="button" onClick={() => transferOwner(selectedTeam)} disabled={working}>
              Transfer owner
            </button>
            <button type="button" onClick={() => grantPlus(selectedTeam)} disabled={working || paidStoreSubscription}>
              Grant Plus
            </button>
            <button type="button" onClick={() => extendPlus(selectedTeam)} disabled={working || paidStoreSubscription}>
              Extend Plus
            </button>
            <button
              type="button"
              onClick={() =>
                action(
                  selectedTeam,
                  '/revoke_plus',
                  'DELETE',
                  'Revoke complimentary Plus',
                )
              }
              disabled={working || paidStoreSubscription || !selectedSubscription?.plus_active}
            >
              Revoke Plus
            </button>

            {!selectedTeam.launch_club ? (
              <button
                type="button"
                onClick={() =>
                  action(
                    selectedTeam,
                    '/grant_founder',
                    'POST',
                    'Grant Founder Club',
                  )
                }
                disabled={working}
              >
                Make Founder Club
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  action(
                    selectedTeam,
                    '/revoke_founder',
                    'DELETE',
                    'Remove Founder Club',
                  )
                }
                disabled={working}
              >
                Remove Founder status
              </button>
            )}

            {paidStoreSubscription && (
              <button
                type="button"
                onClick={() =>
                  action(
                    selectedTeam,
                    '/reconcile_subscription',
                    'POST',
                    'Reconcile store subscription',
                  )
                }
                disabled={working}
              >
                Reconcile subscription
              </button>
            )}

            <button
              className="danger"
              type="button"
              onClick={() => deleteTeam(selectedTeam)}
              disabled={working || paidStoreSubscription}
            >
              Delete team
            </button>
          </div>

          <div className="developer-membership-section">
            <div className="developer-membership-heading">
              <h3>Membership control</h3>
              <button
                type="button"
                onClick={() => addMembership(selectedTeam)}
                disabled={working}
              >
                Add member
              </button>
            </div>

            {selectedTeam.memberships?.map((membership) => (
              <MembershipRow
                key={membership.id}
                membership={membership}
                disabled={working}
                onSave={(changes) =>
                  updateMembership(selectedTeam, membership, changes)
                }
                onRemove={() =>
                  removeMembership(selectedTeam, membership)
                }
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function MembershipRow({ membership, disabled, onSave, onRemove }) {
  const [role, setRole] = useState(membership.role)
  const [status, setStatus] = useState(membership.status)
  const [preferredPosition, setPreferredPosition] = useState(
    membership.preferred_position || 'CM',
  )

  useEffect(() => {
    setRole(membership.role)
    setStatus(membership.status)
    setPreferredPosition(membership.preferred_position || 'CM')
  }, [membership])

  return (
    <article className="developer-membership-row">
      <div>
        <strong>{displayName(membership.user)}</strong>
        <span>{membership.user.email}</span>
      </div>

      <select value={role} onChange={(event) => setRole(event.target.value)} disabled={disabled}>
        <option value="manager">Manager</option>
        <option value="player">Player</option>
      </select>

      <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={disabled}>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
        <option value="rejected">Rejected</option>
      </select>

      <select
        value={preferredPosition}
        onChange={(event) => setPreferredPosition(event.target.value)}
        disabled={disabled}
      >
        {['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'LW', 'RW', 'ST'].map((position) => (
          <option key={position} value={position}>{position}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() =>
          onSave({
            role,
            status,
            preferred_position: preferredPosition,
          })
        }
        disabled={disabled}
      >
        Save
      </button>

      <button className="danger" type="button" onClick={onRemove} disabled={disabled}>
        Remove
      </button>
    </article>
  )
}

function displayName(user) {
  return (
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    user?.email ||
    'Unknown user'
  )
}

function formatDate(value) {
  if (!value) return 'No end date'

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatLabel(value) {
  return value?.replaceAll('_', ' ') || 'Unknown'
}

export default DeveloperTeamsPanel
