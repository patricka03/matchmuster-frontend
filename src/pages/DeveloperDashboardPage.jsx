import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DeveloperModerationPanel from '../components/DeveloperModerationPanel'
import DeveloperAccountManagementPanel from '../components/DeveloperAccountManagementPanel'
import './DeveloperDashboardPage.css'
import API_URL from '../config/api'
import matchMusterLogo from '../assets/matchmuster-logo.png'

function DeveloperDashboardPage() {
  const navigate = useNavigate()

  const [overview, setOverview] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [pendingManagers, setPendingManagers] = useState([])
  const [appUpdateTitle, setAppUpdateTitle] = useState('')
  const [appUpdateMessage, setAppUpdateMessage] = useState('')
  const [appUpdateError, setAppUpdateError] = useState('')
  const [appUpdateResult, setAppUpdateResult] = useState(null)
  const [isSendingUpdate, setIsSendingUpdate] = useState(false)
  const [activities, setActivities] = useState([])
  const [activityError, setActivityError] = useState('')
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)


  const [errorMessage, setErrorMessage] = useState('')
  const [managerError, setManagerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingManagers, setIsLoadingManagers] = useState(false)
  const [managerActionId, setManagerActionId] = useState(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const loadDashboard = async () => {
      const developerToken =
        localStorage.getItem('developerToken')

      if (!developerToken) {
        navigate('/developer/login', { replace: true })
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/developer/dashboard`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${developerToken}`,
            },
          }
        )

        const data = await response.json().catch(() => ({}))

        if (response.status === 401) {
          localStorage.removeItem('developerToken')
          navigate('/developer/login', { replace: true })
          return
        }

        if (!response.ok) {
          throw new Error(
            data.error || 'Unable to load developer dashboard'
          )
        }

        setOverview(data.overview)
      } catch (error) {
        setErrorMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [navigate])

  const loadManagers = async () => {
    const developerToken =
      localStorage.getItem('developerToken')

    setActiveSection('managers')
    setManagerError('')
    setSuccessMessage('')
    setIsLoadingManagers(true)

    try {
      const response = await fetch(
        `${API_URL}/developer/managers`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${developerToken}`,
          },
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to load manager applications'
        )
      }

      setPendingManagers(data.managers || [])
    } catch (error) {
      setManagerError(error.message)
    } finally {
      setIsLoadingManagers(false)
    }
  }

  const handleManagerDecision = async (manager, decision) => {
    const managerName =
      `${manager.first_name || ''} ${manager.last_name || ''}`.trim() ||
      manager.email

    const confirmed = window.confirm(
      decision === 'approve'
        ? `Approve ${managerName} as a MatchMuster manager?`
        : `Reject ${managerName}? A rejection email will be sent and their account will be permanently deleted.`
    )

    if (!confirmed) return

    const developerToken =
      localStorage.getItem('developerToken')

    setManagerActionId(manager.id)
    setManagerError('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        `${API_URL}/developer/managers/${manager.id}/${decision}`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${developerToken}`,
          },
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || `Unable to ${decision} manager`
        )
      }

      setPendingManagers((currentManagers) =>
        currentManagers.filter(
          (currentManager) => currentManager.id !== manager.id
        )
      )

      setOverview((currentOverview) => {
        if (!currentOverview) return currentOverview

        const updatedOverview = {
          ...currentOverview,
          pending_managers: Math.max(
            (currentOverview.pending_managers || 0) - 1,
            0
          ),
        }

        if (decision === 'approve') {
          updatedOverview.approved_managers =
            (currentOverview.approved_managers || 0) + 1
        }

        if (decision === 'reject') {
          updatedOverview.total_users = Math.max(
            (currentOverview.total_users || 0) - 1,
            0
          )

          updatedOverview.total_managers = Math.max(
            (currentOverview.total_managers || 0) - 1,
            0
          )
        }

        return updatedOverview
      })

      setSuccessMessage(
        decision === 'approve'
          ? `${managerName} was approved successfully.`
          : `${managerName} was rejected and their account was deleted.`
      )
    } catch (error) {
      setManagerError(error.message)
    } finally {
      setManagerActionId(null)
    }
  }

  const handleSendAppUpdate = async (event) => {
    event.preventDefault()

    const title = appUpdateTitle.trim()
    const message = appUpdateMessage.trim()

    setAppUpdateError('')
    setAppUpdateResult(null)

    if (!title || !message) {
      setAppUpdateError('Title and message are required.')
      return
    }

    const confirmed = window.confirm(
      `Send "${title}" to every approved manager?`
    )

    if (!confirmed) return

    const developerToken =
      localStorage.getItem('developerToken')

    setIsSendingUpdate(true)

    try {
      const response = await fetch(
        `${API_URL}/developer/app_updates`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${developerToken}`,
          },
          body: JSON.stringify({
            app_update: {
              title,
              message,
            },
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          data.errors?.join(', ') ||
          data.error ||
          'Unable to send app update'
        )
      }

      setAppUpdateResult(data.app_update)
      setAppUpdateTitle('')
      setAppUpdateMessage('')
    } catch (error) {
      setAppUpdateError(error.message)
    } finally {
      setIsSendingUpdate(false)
    }
  }

  const loadActivity = async () => {
    const developerToken =
      localStorage.getItem('developerToken')

    setActiveSection('activity')
    setActivityError('')
    setIsLoadingActivity(true)

    try {
      const response = await fetch(
        `${API_URL}/developer/activity`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${developerToken}`,
          },
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to load platform activity'
        )
      }

      setActivities(data.activities || [])
    } catch (error) {
      setActivityError(error.message)
    } finally {
      setIsLoadingActivity(false)
    }
  }

  const handleLogout = async () => {
    const developerToken =
      localStorage.getItem('developerToken')

    setIsLoggingOut(true)

    try {
      await fetch(`${API_URL}/developer/logout`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${developerToken}`,
        },
      })
    } finally {
      localStorage.removeItem('developerToken')
      navigate('/developer/login', { replace: true })
    }
  }

  const formatMoney = (pence = 0) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(pence / 100)
  }

  const formatDate = (date) => {
    if (!date) return 'Not available'

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))
  }

  const formatActivityTime = (date) => {
    if (!date) return 'Time unavailable'

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const activityIcon = (type) => {
    const icons = {
      manager_applied: 'M',
      player_joined: 'P',
      team_created: 'T',
      fixture_created: 'F',
      payment_paid: '£',
    }

    return icons[type] || '•'
  }

  if (isLoading) {
    return (
      <main className="developer-loading">
        Loading control centre…
      </main>
    )
  }

  return (
    <main className="developer-dashboard">
      <aside className="developer-sidebar">
        <div>
          <div className="developer-brand">
            <img
              className="developer-brand-mark "
              src={matchMusterLogo}
              alt=""
              aria-hidden="true"
            />

            <div>
              <strong>MatchMuster</strong>
              <span>Control centre</span>
            </div>
          </div>

          <nav className="developer-navigation">
            <button
              className={
                activeSection === 'overview' ? 'active' : ''
              }
              onClick={() => setActiveSection('overview')}
            >
              Overview
            </button>

            <button
              className={
                activeSection === 'moderation' ? 'active' : ''
              }
              onClick={() => setActiveSection('moderation')}
            >
              Moderation
            </button>

            <button
              className={
                activeSection === 'accounts' ? 'active' : ''
              }
              onClick={() => setActiveSection('accounts')}
            >
              Accounts
            </button>

            <button
              className={
                activeSection === 'managers' ? 'active' : ''
              }
              onClick={loadManagers}
            >
              Manager reviews

              {overview?.pending_managers > 0 && (
                <span className="developer-nav-count">
                  {overview.pending_managers}
                </span>
              )}
            </button>

            <button
              className={
                activeSection === 'updates' ? 'active' : ''
              }
              onClick={() => {
                setActiveSection('updates')
                setAppUpdateError('')
                setAppUpdateResult(null)
              }}
            >
              App updates
            </button>
            <button
              className={
                activeSection === 'activity' ? 'active' : ''
              }
              onClick={loadActivity}
            >
              Platform activity
            </button>
          </nav>
        </div>

        <button
          className="developer-logout"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </aside>

      <section className="developer-content">
        {activeSection === 'overview' && (
          <>
            <header className="developer-header">
              <div>
                <p>PRIVATE CONTROL CENTRE</p>
                <h1>Developer dashboard</h1>
                <span>Monitor the MatchMuster platform.</span>
              </div>

              <div className="developer-live-status">
                <span />
                Live data
              </div>
            </header>

            {errorMessage && (
              <div className="developer-dashboard-error">
                {errorMessage}
              </div>
            )}

            {overview && (
              <section className="developer-stat-grid">
                <article>
                  <span>Total users</span>
                  <strong>{overview.total_users}</strong>
                </article>

                <article>
                  <span>Players</span>
                  <strong>{overview.total_players}</strong>
                </article>

                <article>
                  <span>Managers</span>
                  <strong>{overview.total_managers}</strong>
                </article>

                <article className="pending-stat">
                  <span>Pending managers</span>
                  <strong>{overview.pending_managers}</strong>
                </article>

                <article>
                  <span>Approved managers</span>
                  <strong>{overview.approved_managers}</strong>
                </article>

                <article>
                  <span>Teams</span>
                  <strong>{overview.total_teams}</strong>
                </article>

                <article>
                  <span>Fixtures</span>
                  <strong>{overview.total_fixtures}</strong>
                </article>

                <article>
                  <span>Paid payments</span>
                  <strong>{overview.paid_payments}</strong>
                </article>

                <article>
                  <span>Payment volume</span>
                  <strong>
                    {formatMoney(overview.payment_volume_pence)}
                  </strong>
                </article>
              </section>
            )}
          </>
        )}

        {activeSection === 'managers' && (
          <>
            <header className="developer-header">
              <div>
                <p>MANAGER APPLICATIONS</p>
                <h1>Manager reviews</h1>
                <span>
                  Review pending MatchMuster manager accounts.
                </span>
              </div>

              <button
                className="developer-refresh-button"
                onClick={loadManagers}
                disabled={isLoadingManagers}
              >
                {isLoadingManagers ? 'Refreshing…' : 'Refresh'}
              </button>
            </header>

            {managerError && (
              <div className="developer-dashboard-error">
                {managerError}
              </div>
            )}

            {successMessage && (
              <div className="developer-dashboard-success">
                {successMessage}
              </div>
            )}

            {isLoadingManagers ? (
              <div className="developer-manager-empty">
                Loading manager applications…
              </div>
            ) : pendingManagers.length === 0 ? (
              <div className="developer-manager-empty">
                <strong>No pending applications</strong>
                <span>
                  All manager applications have been reviewed.
                </span>
              </div>
            ) : (
              <section className="developer-manager-list">
                {pendingManagers.map((manager) => (
                  <article
                    className="developer-manager-card"
                    key={manager.id}
                  >
                    <div className="developer-manager-details">
                      <div className="developer-manager-avatar">
                        {manager.first_name?.[0]?.toUpperCase() || 'M'}
                      </div>

                      <div>
                        <h2>
                          {manager.first_name} {manager.last_name}
                        </h2>
                        <p>{manager.email}</p>
                        <span>
                          Applied {formatDate(manager.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="developer-manager-actions">
                      <button
                        className="developer-reject-button"
                        onClick={() =>
                          handleManagerDecision(manager, 'reject')
                        }
                        disabled={managerActionId === manager.id}
                      >
                        Reject
                      </button>

                      <button
                        className="developer-approve-button"
                        onClick={() =>
                          handleManagerDecision(manager, 'approve')
                        }
                        disabled={managerActionId === manager.id}
                      >
                        {managerActionId === manager.id
                          ? 'Working…'
                          : 'Approve'}
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}

        {activeSection === 'updates' && (
          <>
            <header className="developer-header">
              <div>
                <p>PLATFORM COMMUNICATION</p>
                <h1>App updates</h1>
                <span>
                  Send an in-app announcement to every approved manager.
                </span>
              </div>
            </header>

            {appUpdateError && (
              <div className="developer-dashboard-error">
                {appUpdateError}
              </div>
            )}

            {appUpdateResult && (
              <div className="developer-app-update-success">
                <strong>Update sent successfully</strong>

                <span>
                  {appUpdateResult.recipient_count}{' '}
                  {appUpdateResult.recipient_count === 1
                    ? 'approved manager was'
                    : 'approved managers were'}{' '}
                  notified.
                </span>
              </div>
            )}

            <section className="developer-app-update-card">
              <form onSubmit={handleSendAppUpdate}>
                <label htmlFor="app-update-title">
                  Update title
                </label>

                <input
                  id="app-update-title"
                  type="text"
                  value={appUpdateTitle}
                  onChange={(event) =>
                    setAppUpdateTitle(event.target.value)
                  }
                  placeholder="For example: New MatchMuster feature"
                  disabled={isSendingUpdate}
                  required
                />

                <label htmlFor="app-update-message">
                  Message
                </label>

                <textarea
                  id="app-update-message"
                  value={appUpdateMessage}
                  onChange={(event) =>
                    setAppUpdateMessage(event.target.value)
                  }
                  placeholder="Explain the update to managers..."
                  rows="7"
                  disabled={isSendingUpdate}
                  required
                />

                <div className="developer-app-update-footer">
                  <p>
                    This creates an in-app notification. It does not
                    send an email.
                  </p>

                  <button
                    type="submit"
                    disabled={isSendingUpdate}
                  >
                    {isSendingUpdate
                      ? 'Sending update…'
                      : 'Send update'}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}

        {activeSection === 'moderation' && (
          <DeveloperModerationPanel />
        )}

        {activeSection === 'accounts' && (
          <DeveloperAccountManagementPanel />
        )}

        {activeSection === 'activity' && (
          <>
            <header className="developer-header">
              <div>
                <p>PLATFORM MONITORING</p>
                <h1>Platform activity</h1>
                <span>
                  View the latest activity across MatchMuster.
                </span>
              </div>

              <button
                className="developer-refresh-button"
                onClick={loadActivity}
                disabled={isLoadingActivity}
              >
                {isLoadingActivity ? 'Refreshing…' : 'Refresh'}
              </button>
            </header>

            {activityError && (
              <div className="developer-dashboard-error">
                {activityError}
              </div>
            )}

            {isLoadingActivity ? (
              <div className="developer-manager-empty">
                Loading platform activity…
              </div>
            ) : activities.length === 0 ? (
              <div className="developer-manager-empty">
                <strong>No platform activity yet</strong>
                <span>
                  New users, teams, fixtures and payments will appear here.
                </span>
              </div>
            ) : (
              <section className="developer-activity-list">
                {activities.map((activity) => (
                  <article
                    className="developer-activity-item"
                    key={activity.id}
                  >
                    <div
                      className={`developer-activity-icon ${activity.type}`}
                    >
                      {activityIcon(activity.type)}
                    </div>

                    <div className="developer-activity-details">
                      <div className="developer-activity-heading">
                        <strong>{activity.title}</strong>

                        <time dateTime={activity.occurred_at}>
                          {formatActivityTime(activity.occurred_at)}
                        </time>
                      </div>

                      <p>{activity.description}</p>

                      {activity.amount_pence != null && (
                        <span className="developer-activity-amount">
                          {formatMoney(activity.amount_pence)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}

      </section>
    </main>
  )
}

export default DeveloperDashboardPage
