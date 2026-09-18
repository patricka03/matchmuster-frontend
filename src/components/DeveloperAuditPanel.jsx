import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import './DeveloperPlatformPanels.css'

function DeveloperAuditPanel() {
  const navigate = useNavigate()
  const [actions, setActions] = useState([])
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
      const response = await fetch(
        `${API_URL}/developer/audit_logs?limit=300`,
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
        throw new Error(data.error || 'Unable to load audit history.')
      }

      setActions(data.actions || [])
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <header className="developer-header">
        <div>
          <p>ACCOUNTABILITY</p>
          <h1 className="mm-page-title">Developer audit log</h1>
          <span>
            Permanent history of developer, account and moderation actions.
          </span>
        </div>

        <button className="developer-refresh-button" type="button" onClick={load}>
          Refresh
        </button>
      </header>

      {errorMessage && (
        <div className="developer-dashboard-error">{errorMessage}</div>
      )}

      <section className="developer-data-card">
        {loading ? (
          <div className="developer-control-empty">Loading audit history…</div>
        ) : actions.length === 0 ? (
          <div className="developer-control-empty">No developer actions recorded yet.</div>
        ) : (
          <div className="developer-audit-list">
            {actions.map((action) => (
              <article key={action.id}>
                <div>
                  <strong>{formatLabel(action.action_type)}</strong>
                  <span>
                    {action.developer_email || 'Developer'} · {formatDateTime(action.created_at)}
                  </span>
                </div>

                <p>{action.notes}</p>

                <small>
                  {action.target_type
                    ? `${action.target_type} #${action.target_id}`
                    : 'Platform-wide'}
                  {' · '}
                  {formatLabel(action.source)}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function formatLabel(value) {
  if (!value) return 'Unknown'
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
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

export default DeveloperAuditPanel
