import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Clock3, X } from 'lucide-react'

import API_URL from '../config/api'
import { getAuthToken } from '../utils/authStorage'
import './RunningLatePanel.css'

function londonDateKey(value) {
  if (!value) return null

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function sameLondonDate(firstDate, secondDate) {
  const first = londonDateKey(firstDate)
  const second = londonDateKey(secondDate)
  return Boolean(first && second && first === second)
}

function fullName(user) {
  return [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ') || 'Team member'
}

function RunningLatePanel({
  teamId,
  matchId,
  match,
  currentUser,
}) {
  const [statuses, setStatuses] = useState([])
  const [minutesLate, setMinutesLate] = useState('')
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const kickoffDate = useMemo(
    () => (match?.kickoff_time ? new Date(match.kickoff_time) : null),
    [match?.kickoff_time],
  )

  const reportingOpen = sameLondonDate(kickoffDate, new Date())

  const ownStatus = statuses.find(
    (status) => String(status.user_id) === String(currentUser?.id),
  ) || null

  const isManager =
    currentUser?.account_type === 'manager' &&
    currentUser?.manager_verification_status === 'approved'

  const loadStatuses = useCallback(async () => {
    if (!teamId || !matchId || !reportingOpen) {
      setStatuses([])
      return
    }

    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matches/${matchId}/late_statuses`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        },
      )

      if (!response.ok) return
      const data = await response.json()
      setStatuses(Array.isArray(data.statuses) ? data.statuses : [])
    } catch {
      // Keep the match page usable.
    }
  }, [matchId, reportingOpen, teamId])

  useEffect(() => {
    void loadStatuses()
    if (!reportingOpen) return undefined

    const interval = window.setInterval(loadStatuses, 20000)
    return () => window.clearInterval(interval)
  }, [loadStatuses, reportingOpen])

  useEffect(() => {
    if (!ownStatus) return
    setMinutesLate(String(ownStatus.minutes_late))
    setNote(ownStatus.note || '')
  }, [ownStatus])

  if (!reportingOpen) return null

  async function saveLateStatus(event) {
    event.preventDefault()

    const parsedMinutes = Number.parseInt(minutesLate, 10)

    if (
      !Number.isInteger(parsedMinutes) ||
      parsedMinutes < 1 ||
      parsedMinutes > 300
    ) {
      setError('Enter how many minutes late you expect to be (1–300).')
      return
    }

    const token = getAuthToken()
    if (!token) return

    setSaving(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matches/${matchId}/late_status`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify({
            match_late_status: {
              minutes_late: parsedMinutes,
              note: note.trim(),
            },
          }),
        },
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.errors?.join(', ') ||
            'Unable to update your arrival time.',
        )
      }

      await loadStatuses()
      setEditing(false)
      window.dispatchEvent(
        new CustomEvent('matchmuster:late-status-updated'),
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function clearLateStatus() {
    const token = getAuthToken()
    if (!token) return

    setSaving(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matches/${matchId}/late_status`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Unable to clear your late status.')
      }

      setMinutesLate('')
      setNote('')
      setEditing(false)
      await loadStatuses()
      window.dispatchEvent(
        new CustomEvent('matchmuster:late-status-updated'),
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="running-late-panel">
      <div className="running-late-heading">
        <span className="running-late-heading-icon">
          <Clock3 size={20} aria-hidden="true" />
        </span>

        <div>
          <span>MATCHDAY</span>
          <h3>Running late?</h3>
          <p>Let your team know your expected delay.</p>
        </div>
      </div>

      {ownStatus && !editing ? (
        <div className="running-late-own-status">
          <div>
            <strong>
              You’re marked {ownStatus.minutes_late} min late
            </strong>
            {ownStatus.note && <span>{ownStatus.note}</span>}
          </div>

          <div className="running-late-own-actions">
            <button type="button" onClick={() => setEditing(true)}>
              Update
            </button>
            <button
              className="running-late-clear-button"
              type="button"
              disabled={saving}
              onClick={clearLateStatus}
            >
              On time
            </button>
          </div>
        </div>
      ) : (
        <form className="running-late-form" onSubmit={saveLateStatus}>
          <div className="running-late-field-row">
            <label>
              <span>Minutes late</span>
              <input
                type="number"
                min="1"
                max="300"
                inputMode="numeric"
                value={minutesLate}
                onChange={(event) => setMinutesLate(event.target.value)}
                placeholder="e.g. 13"
                required
              />
            </label>

            <label className="running-late-note-field">
              <span>Note (optional)</span>
              <input
                type="text"
                maxLength="160"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Traffic, train delay..."
              />
            </label>
          </div>

          {error && (
            <p className="running-late-error" role="alert">
              {error}
            </p>
          )}

          <div className="running-late-form-actions">
            <button
              className="running-late-submit"
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'Updating...'
                : ownStatus
                  ? 'Update arrival'
                  : 'I’m running late'}
            </button>

            {editing && (
              <button
                className="running-late-cancel"
                type="button"
                onClick={() => {
                  setEditing(false)
                  setMinutesLate(String(ownStatus?.minutes_late || ''))
                  setNote(ownStatus?.note || '')
                }}
              >
                <X size={17} aria-hidden="true" />
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {isManager && statuses.length > 0 && (
        <div className="running-late-live-list">
          <div className="running-late-list-heading">
            <strong>Live arrivals</strong>
            <span>{statuses.length} running late</span>
          </div>

          {statuses.map((status) => (
            <div className="running-late-person" key={status.id}>
              <span className="running-late-person-avatar">
                {fullName(status.user)
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </span>

              <span className="running-late-person-copy">
                <strong>{fullName(status.user)}</strong>
                <small>
                  {status.role === 'manager' ? 'Manager' : 'Player'}
                  {status.note ? ` • ${status.note}` : ''}
                </small>
              </span>

              <strong className="running-late-minutes">
                {status.minutes_late} min
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default RunningLatePanel
