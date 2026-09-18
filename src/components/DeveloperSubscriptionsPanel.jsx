import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import './DeveloperPlatformPanels.css'

function DeveloperSubscriptionsPanel() {
  const navigate = useNavigate()
  const [entitlements, setEntitlements] = useState([])
  const [events, setEvents] = useState([])
  const [summary, setSummary] = useState(null)
  const [provider, setProvider] = useState('all')
  const [showOnlyProblems, setShowOnlyProblems] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    const token = localStorage.getItem('developerToken')
    if (!token) {
      navigate('/developer/login', { replace: true })
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const params = new URLSearchParams()
      if (provider !== 'all') params.set('provider', provider)

      const response = await fetch(
        `${API_URL}/developer/subscriptions${params.toString() ? `?${params.toString()}` : ''}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
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
        throw new Error(data.error || 'Unable to load subscriptions.')
      }

      setEntitlements(data.entitlements || [])
      setEvents(data.events || [])
      setSummary(data.summary || null)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [navigate, provider])

  useEffect(() => {
    void load()
  }, [load])

  const visibleEvents = useMemo(() => {
    if (!showOnlyProblems) return events

    return events.filter(
      (event) =>
        event.processing_status === 'failed' ||
        ['failed', 'rejected'].includes(event.verification_status),
    )
  }, [events, showOnlyProblems])

  return (
    <>
      <header className="developer-header">
        <div>
          <p>BILLING INTELLIGENCE</p>
          <h1 className="mm-page-title">Plus & subscriptions</h1>
          <span>
            View Apple, Google Play, trials, Founder Clubs and every store event.
          </span>
        </div>

        <button className="developer-refresh-button" type="button" onClick={load}>
          Refresh
        </button>
      </header>

      {errorMessage && (
        <div className="developer-dashboard-error">{errorMessage}</div>
      )}

      {summary && (
        <section className="developer-control-stat-grid">
          <article><span>Active Plus</span><strong>{summary.active_plus}</strong></article>
          <article><span>Apple</span><strong>{summary.apple}</strong></article>
          <article><span>Google Play</span><strong>{summary.google_play}</strong></article>
          <article><span>Founder</span><strong>{summary.founder}</strong></article>
          <article><span>Admin Plus</span><strong>{summary.admin}</strong></article>
          <article className={summary.failed_events > 0 ? 'warning' : ''}>
            <span>Store problems</span><strong>{summary.failed_events}</strong>
          </article>
        </section>
      )}

      <div className="developer-panel-toolbar">
        <label>
          Provider
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="all">All</option>
            <option value="apple">Apple</option>
            <option value="google_play">Google Play</option>
          </select>
        </label>
      </div>

      <section className="developer-data-card">
        <div className="developer-data-card-heading">
          <h2>Team entitlements</h2>
          <span>{entitlements.length} records</span>
        </div>

        {loading ? (
          <div className="developer-control-empty">Loading subscription data…</div>
        ) : (
          <div className="developer-table-scroll">
            <table className="developer-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Access</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Period</th>
                  <th>Ends</th>
                  <th>Renews</th>
                </tr>
              </thead>
              <tbody>
                {entitlements.map((entitlement) => (
                  <tr key={entitlement.id}>
                    <td>
                      <strong>{entitlement.team.name}</strong>
                      <small>{entitlement.owner?.email || 'No owner'}</small>
                    </td>
                    <td>{entitlement.plus_active ? 'Plus' : 'Free'}</td>
                    <td>{formatLabel(entitlement.source)}</td>
                    <td>{formatLabel(entitlement.status)}</td>
                    <td>{formatLabel(entitlement.billing_period)}</td>
                    <td>{formatDate(entitlement.ends_at)}</td>
                    <td>{entitlement.auto_renews ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="developer-data-card">
        <div className="developer-data-card-heading">
          <div>
            <h2>Store event monitor</h2>
            <span>Latest Apple and Google lifecycle events</span>
          </div>

          <label className="developer-inline-toggle">
            <input
              type="checkbox"
              checked={showOnlyProblems}
              onChange={(event) => setShowOnlyProblems(event.target.checked)}
            />
            Problems only
          </label>
        </div>

        <div className="developer-event-list">
          {visibleEvents.length === 0 ? (
            <div className="developer-control-empty">No store events to show.</div>
          ) : (
            visibleEvents.map((event) => (
              <article
                className={
                  event.processing_status === 'failed' ||
                  ['failed', 'rejected'].includes(event.verification_status)
                    ? 'problem'
                    : ''
                }
                key={event.id}
              >
                <div>
                  <strong>
                    {formatLabel(event.provider)} · {formatLabel(event.event_type)}
                  </strong>
                  <span>
                    {event.team?.name || 'Unresolved team'} · {formatDateTime(event.created_at)}
                  </span>
                </div>

                <div>
                  <span>Process: {formatLabel(event.processing_status)}</span>
                  <span>Verify: {formatLabel(event.verification_status)}</span>
                </div>

                {(event.processing_error || event.verification_error) && (
                  <p>{event.processing_error || event.verification_error}</p>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </>
  )
}

function formatLabel(value) {
  if (!value) return '—'
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default DeveloperSubscriptionsPanel
