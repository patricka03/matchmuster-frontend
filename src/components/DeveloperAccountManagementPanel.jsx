import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import './DeveloperAccountManagementPanel.css'
import './DeveloperAccountManagementPanel.mobile.css'


function DeveloperAccountManagementPanel() {
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    accountType: 'all',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [isLoading, setIsLoading] = useState(true)
  const [actionUserId, setActionUserId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadUsers = useCallback(async () => {
    const developerToken = localStorage.getItem('developerToken')

    if (!developerToken) {
      navigate('/developer/login', { replace: true })
      return
    }

    const searchParams = new URLSearchParams()

    if (appliedFilters.query.trim()) {
      searchParams.set('query', appliedFilters.query.trim())
    }

    if (appliedFilters.status !== 'all') {
      searchParams.set('status', appliedFilters.status)
    }

    if (appliedFilters.accountType !== 'all') {
      searchParams.set(
        'account_type',
        appliedFilters.accountType,
      )
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const queryString = searchParams.toString()
      const response = await fetch(
        `${API_URL}/developer/users${
          queryString ? `?${queryString}` : ''
        }`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${developerToken}`,
          },
        },
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load accounts.')
      }

      setUsers(data.users || [])
      setSummary(data.summary || null)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters, navigate])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadUsers()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadUsers])

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  function handleSearch(event) {
    event.preventDefault()
    setSuccessMessage('')
    setAppliedFilters({ ...filters })
  }

  function resetFilters() {
    const emptyFilters = {
      query: '',
      status: 'all',
      accountType: 'all',
    }

    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setSuccessMessage('')
  }

  async function handleAccountAction(user, action) {
    const userName =
      `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      user.email

    const actionLabels = {
      suspend: 'suspend',
      ban: 'ban',
      restore: 'reactivate',
      delete: 'delete',
    }

    const actionLabel = actionLabels[action]
    const notes = window.prompt(
      `Explain why you want to ${actionLabel} ${userName}. This is saved in the audit history.`,
    )

    if (notes === null) return

    if (!notes.trim()) {
      setErrorMessage('A reason is required for account actions.')
      return
    }

    let confirmation = null

    if (action === 'delete') {
      confirmation = window.prompt(
        `Deleting ${userName} will anonymise the account and revoke access. Type DELETE to continue.`,
      )

      if (confirmation !== 'DELETE') {
        setErrorMessage('Account deletion was cancelled.')
        return
      }
    } else {
      const confirmed = window.confirm(
        `${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} ${userName}?`,
      )

      if (!confirmed) return
    }

    const developerToken = localStorage.getItem('developerToken')
    const isDelete = action === 'delete'

    setActionUserId(user.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        isDelete
          ? `${API_URL}/developer/users/${user.id}`
          : `${API_URL}/developer/users/${user.id}/${action}`,
        {
          method: isDelete ? 'DELETE' : 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${developerToken}`,
          },
          body: JSON.stringify({
            user: {
              notes: notes.trim(),
              confirmation,
            },
          }),
        },
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || `Unable to ${actionLabel} this account.`,
        )
      }

      setSuccessMessage(
        data.message || `${userName} was updated successfully.`,
      )
      await loadUsers()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setActionUserId(null)
    }
  }

  function formatDate(date) {
    if (!date) return 'Not available'

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <section className="developer-accounts-panel">
      <header className="developer-accounts-header">
        <div>
          <p>ACCOUNT CONTROL</p>
          <h1>Account management</h1>
          <span>
            Search, restrict, reactivate or delete MatchMuster accounts.
          </span>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {summary && (
        <div className="developer-accounts-summary">
          <article>
            <span>Active</span>
            <strong>{summary.active}</strong>
          </article>
          <article>
            <span>Suspended</span>
            <strong>{summary.suspended}</strong>
          </article>
          <article>
            <span>Banned</span>
            <strong>{summary.banned}</strong>
          </article>
          <article>
            <span>Deleted</span>
            <strong>{summary.deleted}</strong>
          </article>
        </div>
      )}

      <form className="developer-accounts-filters" onSubmit={handleSearch}>
        <label>
          Search
          <input
            name="query"
            type="search"
            value={filters.query}
            onChange={handleFilterChange}
            placeholder="Name or email"
          />
        </label>

        <label>
          Status
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
            <option value="deleted">Deleted</option>
          </select>
        </label>

        <label>
          Account type
          <select
            name="accountType"
            value={filters.accountType}
            onChange={handleFilterChange}
          >
            <option value="all">Players and managers</option>
            <option value="player">Players</option>
            <option value="manager">Managers</option>
          </select>
        </label>

        <div>
          <button type="submit">Apply filters</button>
          <button type="button" onClick={resetFilters}>
            Clear
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="developer-accounts-error" role="alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="developer-accounts-success">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="developer-accounts-empty">Loading accounts…</div>
      ) : users.length === 0 ? (
        <div className="developer-accounts-empty">
          No accounts match these filters.
        </div>
      ) : (
        <div className="developer-accounts-list">
          {users.map((user) => (
            <article className="developer-account-card" key={user.id}>
              <div className="developer-account-main">
                <div className="developer-account-avatar">
                  {user.first_name?.[0]?.toUpperCase() || 'U'}
                </div>

                <div>
                  <div className="developer-account-name-row">
                    <h2>
                      {user.first_name} {user.last_name}
                    </h2>
                    <span className={`status-${user.status}`}>
                      {user.status}
                    </span>
                  </div>

                  <p>{user.email}</p>

                  <div className="developer-account-meta">
                    <span>{user.account_type}</span>
                    <span>Joined {formatDate(user.created_at)}</span>
                    <span>
                      {user.legal_acceptance_count} legal records
                    </span>
                  </div>

                  {user.team_names.length > 0 && (
                    <small>
                      Teams: {user.team_names.join(', ')}
                    </small>
                  )}

                  {user.restriction_reason && (
                    <small>
                      Reason: {user.restriction_reason}
                    </small>
                  )}
                </div>
              </div>

              <div className="developer-account-actions">
                {user.status === 'active' && (
                  <>
                    <button
                      type="button"
                      className="suspend"
                      onClick={() =>
                        handleAccountAction(user, 'suspend')
                      }
                      disabled={actionUserId === user.id}
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      className="ban"
                      onClick={() =>
                        handleAccountAction(user, 'ban')
                      }
                      disabled={actionUserId === user.id}
                    >
                      Ban
                    </button>
                  </>
                )}

                {(user.status === 'suspended' ||
                  user.status === 'banned') && (
                  <button
                    type="button"
                    className="restore"
                    onClick={() =>
                      handleAccountAction(user, 'restore')
                    }
                    disabled={actionUserId === user.id}
                  >
                    Reactivate
                  </button>
                )}

                {user.status !== 'deleted' && (
                  <button
                    type="button"
                    className="delete"
                    onClick={() =>
                      handleAccountAction(user, 'delete')
                    }
                    disabled={actionUserId === user.id}
                  >
                    {actionUserId === user.id
                      ? 'Working…'
                      : 'Delete'}
                  </button>
                )}

                {user.status === 'deleted' && (
                  <span className="developer-account-final-state">
                    Anonymised
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default DeveloperAccountManagementPanel
