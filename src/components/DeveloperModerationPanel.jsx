import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import './DeveloperModerationPanel.css'

const STATUS_FILTERS = [
  { value: 'all', label: 'All reports' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
]

function DeveloperModerationPanel() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [notesByReport, setNotesByReport] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [workingReportId, setWorkingReportId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadReports = useCallback(async () => {
    const developerToken = localStorage.getItem('developerToken')

    if (!developerToken) {
      navigate('/developer/login', { replace: true })
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch(`${API_URL}/developer/reports`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${developerToken}`,
        },
      })

      const data = await readResponse(response)

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, 'Unable to load moderation reports.'),
        )
      }

      setReports(normaliseReports(data))
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to load moderation reports.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadReports()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [loadReports])

  const filteredReports = useMemo(() => {
    const normalisedSearch = searchTerm.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesStatus =
        statusFilter === 'all' || report.status === statusFilter

      if (!matchesStatus) return false
      if (!normalisedSearch) return true

      const searchableText = [
        report.reason,
        report.details,
        report.reportable?.type,
        report.reportable?.title,
        report.reportable?.content,
        report.reportable?.comment,
        displayName(report.reporter),
        displayName(report.reported_user),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalisedSearch)
    })
  }, [reports, searchTerm, statusFilter])

  async function performAction(report, action) {
    const actionDetails = moderationActionDetails(action)
    const notes = (notesByReport[report.id] || '').trim()

    if (actionDetails.requiresNotes && !notes) {
      setErrorMessage(
        'Add moderation notes before completing this action.',
      )
      setSuccessMessage('')
      return
    }

    if (actionDetails.confirmText) {
      const confirmation = window.prompt(
        actionDetails.confirmMessage(report),
      )

      if (confirmation === null) return

      if (confirmation.trim().toUpperCase() !== actionDetails.confirmText) {
        setErrorMessage(
          `Account deletion cancelled. Type ${actionDetails.confirmText} exactly to confirm.`,
        )
        setSuccessMessage('')
        return
      }
    } else if (
      actionDetails.confirmMessage &&
      !window.confirm(actionDetails.confirmMessage(report))
    ) {
      return
    }

    const developerToken = localStorage.getItem('developerToken')
    const isStatusUpdate = Boolean(actionDetails.status)
    const endpoint = isStatusUpdate
      ? `${API_URL}/developer/reports/${report.id}`
      : `${API_URL}/developer/reports/${report.id}/${actionDetails.endpoint}`

    const body = {
      report: {
        moderation_notes: notes,
        ...(isStatusUpdate ? { status: actionDetails.status } : {}),
      },
    }

    setWorkingReportId(report.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${developerToken}`,
        },
        body: JSON.stringify(body),
      })

      const data = await readResponse(response)

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, actionDetails.failureMessage),
        )
      }

      setSuccessMessage(actionDetails.successMessage)
      setNotesByReport((currentNotes) => ({
        ...currentNotes,
        [report.id]: '',
      }))

      await loadReports()
    } catch (error) {
      setErrorMessage(error.message || actionDetails.failureMessage)
    } finally {
      setWorkingReportId(null)
    }
  }

  return (
    <>
      <header className="developer-header">
        <div>
          <p>TRUST &amp; SAFETY</p>
          <h1>Moderation reports</h1>
          <span>
            Review reports, remove harmful content and protect members.
          </span>
        </div>

        <button
          className="developer-refresh-button"
          type="button"
          onClick={loadReports}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section className="moderation-summary" aria-label="Report summary">
        <article>
          <span>Pending</span>
          <strong>{countStatus(reports, 'pending')}</strong>
        </article>

        <article>
          <span>Reviewing</span>
          <strong>{countStatus(reports, 'reviewing')}</strong>
        </article>

        <article>
          <span>Actioned</span>
          <strong>{countStatus(reports, 'actioned')}</strong>
        </article>
      </section>

      <div className="moderation-toolbar">
        <div className="moderation-filters" aria-label="Filter reports">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={statusFilter === filter.value ? 'active' : ''}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="moderation-search">
          <span className="sr-only">Search reports</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search reports"
          />
        </label>
      </div>

      {errorMessage && (
        <div className="developer-dashboard-error" role="alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="developer-dashboard-success" role="status">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="developer-manager-empty">
          Loading moderation reports…
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="developer-manager-empty">
          <strong>No matching reports</strong>
          <span>
            New safety reports will appear here for review.
          </span>
        </div>
      ) : (
        <section className="moderation-report-list">
          {filteredReports.map((report) => {
            const working = workingReportId === report.id
            const reportedUser = report.reported_user
            const accountStatus = accountStatusDetails(reportedUser)
            const accountRestricted =
              Boolean(reportedUser?.suspended) ||
              Boolean(reportedUser?.banned)
            const accountDeleted = Boolean(reportedUser?.deleted)

            return (
              <article className="moderation-report-card" key={report.id}>
                <div className="moderation-report-heading">
                  <div>
                    <div className="moderation-report-meta">
                      <span
                        className={`moderation-status moderation-status-${report.status}`}
                      >
                        {formatLabel(report.status)}
                      </span>

                      <span>{formatLabel(report.reason)}</span>
                      <span>Report #{report.id}</span>
                    </div>

                    <h2>{reportTitle(report)}</h2>
                  </div>

                  <time dateTime={report.created_at}>
                    {formatDate(report.created_at)}
                  </time>
                </div>

                <div className="moderation-people-grid">
                  <div>
                    <span>Reported by</span>
                    <strong>{displayName(report.reporter)}</strong>
                    <small>{report.reporter?.email}</small>
                  </div>

                  <div>
                    <span>Reported account</span>
                    <strong>{displayName(reportedUser)}</strong>
                    <small>{reportedUser?.email}</small>

                    {reportedUser && (
                      <em
                        className={`moderation-account-status ${accountStatus.className}`}
                      >
                        {accountStatus.label}
                      </em>
                    )}
                  </div>
                </div>

                <div className="moderation-report-details">
                  <span>Member’s explanation</span>
                  <p>{report.details || 'No additional details provided.'}</p>
                </div>

                {report.reportable && (
                  <div className="moderation-reported-content">
                    <span>
                      Reported {formatLabel(report.reportable.type)}
                    </span>
                    <p>{reportableContent(report.reportable)}</p>
                  </div>
                )}

                {report.moderation_notes && (
                  <div className="moderation-existing-notes">
                    <span>Latest moderation notes</span>
                    <p>{report.moderation_notes}</p>
                  </div>
                )}

                <label className="moderation-notes-field">
                  Review notes
                  <textarea
                    value={notesByReport[report.id] || ''}
                    onChange={(event) =>
                      setNotesByReport((currentNotes) => ({
                        ...currentNotes,
                        [report.id]: event.target.value,
                      }))
                    }
                    rows="3"
                    maxLength={2000}
                    placeholder="Add a short audit note before taking action."
                    disabled={working}
                  />
                </label>

                <div className="moderation-actions">
                  {report.status === 'pending' && (
                    <button
                      className="moderation-review-button"
                      type="button"
                      onClick={() => performAction(report, 'review')}
                      disabled={working}
                    >
                      Start review
                    </button>
                  )}

                  {canRemoveContent(report) && (
                    <button
                      className="moderation-remove-button"
                      type="button"
                      onClick={() =>
                        performAction(report, 'remove_content')
                      }
                      disabled={working}
                    >
                      Remove content
                    </button>
                  )}

                  {reportedUser &&
                    !accountDeleted &&
                    !accountRestricted && (
                      <button
                        className="moderation-suspend-button"
                        type="button"
                        onClick={() =>
                          performAction(report, 'suspend_user')
                        }
                        disabled={working}
                      >
                        Suspend account
                      </button>
                    )}

                  {reportedUser &&
                    !accountDeleted &&
                    !reportedUser.banned && (
                      <button
                        className="moderation-ban-button"
                        type="button"
                        onClick={() => performAction(report, 'ban_user')}
                        disabled={working}
                      >
                        Ban account
                      </button>
                    )}

                  {reportedUser &&
                    !accountDeleted &&
                    accountRestricted && (
                      <button
                        className="moderation-restore-button"
                        type="button"
                        onClick={() =>
                          performAction(report, 'restore_user')
                        }
                        disabled={working}
                      >
                        Reactivate account
                      </button>
                    )}

                  {reportedUser && !accountDeleted && (
                    <button
                      className="moderation-delete-button"
                      type="button"
                      onClick={() => performAction(report, 'delete_user')}
                      disabled={working}
                    >
                      Delete account
                    </button>
                  )}

                  {!['actioned', 'dismissed'].includes(report.status) && (
                    <button
                      className="moderation-dismiss-button"
                      type="button"
                      onClick={() => performAction(report, 'dismiss')}
                      disabled={working}
                    >
                      {working ? 'Working…' : 'Dismiss report'}
                    </button>
                  )}
                </div>

                {report.moderation_actions?.length > 0 && (
                  <section className="moderation-action-history">
                    <h3>Action history</h3>

                    {report.moderation_actions.map((moderationAction) => (
                      <article key={moderationAction.id}>
                        <div>
                          <strong>
                            {formatLabel(moderationAction.action_type)}
                          </strong>
                          <time dateTime={moderationAction.created_at}>
                            {formatDate(moderationAction.created_at)}
                          </time>
                        </div>

                        {moderationAction.notes && (
                          <p>{moderationAction.notes}</p>
                        )}
                      </article>
                    ))}
                  </section>
                )}
              </article>
            )
          })}
        </section>
      )}
    </>
  )
}

function moderationActionDetails(action) {
  const actions = {
    review: {
      status: 'reviewing',
      successMessage: 'The report is now being reviewed.',
      failureMessage: 'Unable to start this review.',
    },
    dismiss: {
      status: 'dismissed',
      requiresNotes: true,
      confirmMessage: () =>
        'Dismiss this report without taking moderation action?',
      successMessage: 'The report was dismissed.',
      failureMessage: 'Unable to dismiss this report.',
    },
    remove_content: {
      endpoint: 'remove_content',
      requiresNotes: true,
      confirmMessage: () =>
        'Permanently remove the reported content?',
      successMessage: 'The reported content was removed.',
      failureMessage: 'Unable to remove the reported content.',
    },
    suspend_user: {
      endpoint: 'suspend_user',
      requiresNotes: true,
      confirmMessage: (report) =>
        `Suspend ${displayName(report.reported_user)} from MatchMuster?`,
      successMessage: 'The reported account was suspended.',
      failureMessage: 'Unable to suspend the reported account.',
    },
    ban_user: {
      endpoint: 'ban_user',
      requiresNotes: true,
      confirmMessage: (report) =>
        `Ban ${displayName(report.reported_user)} from MatchMuster?`,
      successMessage: 'The reported account was banned.',
      failureMessage: 'Unable to ban the reported account.',
    },
    restore_user: {
      endpoint: 'restore_user',
      requiresNotes: true,
      confirmMessage: (report) =>
        `Reactivate ${displayName(report.reported_user)} and restore their MatchMuster access?`,
      successMessage: 'The reported account was reactivated.',
      failureMessage: 'Unable to reactivate the reported account.',
    },
    delete_user: {
      endpoint: 'delete_user',
      requiresNotes: true,
      confirmText: 'DELETE',
      confirmMessage: (report) =>
        `This permanently anonymises ${displayName(report.reported_user)} and removes their active MatchMuster data. Type DELETE to confirm.`,
      successMessage: 'The reported account was deleted.',
      failureMessage: 'Unable to delete the reported account.',
    },
  }

  return actions[action]
}

function normaliseReports(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data.reports)) return data.reports

  return []
}

function countStatus(reports, status) {
  return reports.filter((report) => report.status === status).length
}

function canRemoveContent(report) {
  return ['Post', 'MatchRating'].includes(report.reportable?.type)
}

function reportTitle(report) {
  const type = formatLabel(report.reportable?.type || 'account')
  const reportedName = displayName(report.reported_user)

  return `${type} reported for ${formatLabel(report.reason)} — ${reportedName}`
}

function reportableContent(reportable) {
  return (
    reportable.content ||
    reportable.comment ||
    reportable.title ||
    'No content is available.'
  )
}

function accountStatusDetails(user) {
  if (user?.deleted) {
    return { label: 'Deleted', className: 'deleted' }
  }

  if (user?.banned) {
    return { label: 'Banned', className: 'banned' }
  }

  if (user?.suspended) {
    return { label: 'Suspended', className: 'suspended' }
  }

  return { label: 'Active', className: 'active' }
}

function displayName(user) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || user?.email || 'Unknown account'
}

function formatLabel(value) {
  if (!value) return 'Not available'

  return value
    .toString()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(date) {
  if (!date) return 'Date unavailable'

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

async function readResponse(response) {
  const responseText = await response.text()

  if (!responseText) return {}

  try {
    return JSON.parse(responseText)
  } catch {
    return {}
  }
}

function getErrorMessage(data, fallbackMessage) {
  if (Array.isArray(data.errors)) {
    return data.errors.join(', ')
  }

  return data.error || data.message || fallbackMessage
}

export default DeveloperModerationPanel
