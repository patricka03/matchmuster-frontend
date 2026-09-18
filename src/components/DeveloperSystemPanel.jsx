import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import './DeveloperPlatformPanels.css'

function DeveloperSystemPanel() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
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
      const response = await fetch(`${API_URL}/developer/control_center`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('developerToken')
        navigate('/developer/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(result.error || 'Unable to load platform diagnostics.')
      }

      setData(result)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <div className="developer-control-empty">Loading system health…</div>
  }

  return (
    <>
      <header className="developer-header">
        <div>
          <p>PLATFORM HEALTH</p>
          <h1 className="mm-page-title">System & diagnostics</h1>
          <span>
            Operational view of MatchMuster data, billing readiness and store errors.
          </span>
        </div>

        <button className="developer-refresh-button" type="button" onClick={load}>
          Refresh
        </button>
      </header>

      {errorMessage && (
        <div className="developer-dashboard-error">{errorMessage}</div>
      )}

      {data?.overview && (
        <section className="developer-control-stat-grid">
          <article><span>Active users</span><strong>{data.overview.active_users}</strong></article>
          <article><span>Teams</span><strong>{data.overview.total_teams}</strong></article>
          <article><span>Plus teams</span><strong>{data.overview.plus_teams}</strong></article>
          <article><span>Messages</span><strong>{data.overview.total_messages}</strong></article>
          <article><span>Open reports</span><strong>{data.overview.open_reports}</strong></article>
          <article className={data.overview.failed_store_events > 0 ? 'warning' : ''}>
            <span>Store errors</span><strong>{data.overview.failed_store_events}</strong>
          </article>
        </section>
      )}

      <section className="developer-data-card">
        <div className="developer-data-card-heading">
          <h2>Subscription production readiness</h2>
          <span className={data?.subscription_readiness?.ok ? 'status-good' : 'status-bad'}>
            {data?.subscription_readiness?.ok ? 'Ready' : 'Needs attention'}
          </span>
        </div>

        {data?.subscription_readiness?.ok ? (
          <div className="developer-readiness-grid">
            <span>Apple environment <strong>{data.subscription_readiness.apple_environment}</strong></span>
            <span>Google credentials <strong>{data.subscription_readiness.google_credentials}</strong></span>
            <span>Open timeout <strong>{data.subscription_readiness.open_timeout_seconds}s</strong></span>
            <span>Read timeout <strong>{data.subscription_readiness.read_timeout_seconds}s</strong></span>
          </div>
        ) : (
          <ul className="developer-problem-list">
            {(data?.subscription_readiness?.problems || []).map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="developer-data-card">
        <div className="developer-data-card-heading">
          <h2>Recent store failures</h2>
        </div>

        {data?.recent_store_errors?.length ? (
          <div className="developer-event-list">
            {data.recent_store_errors.map((event) => (
              <article className="problem" key={event.id}>
                <div>
                  <strong>{event.provider} · {event.event_type}</strong>
                  <span>Team #{event.team_id || 'unresolved'} · {formatDateTime(event.created_at)}</span>
                </div>
                <p>{event.processing_error || event.verification_error || 'Store event needs attention.'}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="developer-control-empty">No recent store failures. Nice.</div>
        )}
      </section>
    </>
  )
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default DeveloperSystemPanel
