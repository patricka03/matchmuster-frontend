import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import './DeveloperPlatformPanels.css'

function DeveloperCommunicationsPanel() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    scope: 'all',
    title: '',
    message: '',
    teamId: '',
    userId: '',
    notes: '',
  })
  const [working, setWorking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function submit(event) {
    event.preventDefault()

    if (
      !window.confirm(
        `Send this notification to ${audienceLabel(form.scope)}?`,
      )
    ) {
      return
    }

    const token = localStorage.getItem('developerToken')
    setWorking(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        `${API_URL}/developer/notifications`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notification: {
              scope: form.scope,
              title: form.title.trim(),
              message: form.message.trim(),
              team_id: form.teamId || null,
              user_id: form.userId || null,
              notes: form.notes.trim(),
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
        throw new Error(data.error || 'Unable to send notification.')
      }

      setSuccessMessage(
        `${data.recipient_count} ${data.recipient_count === 1 ? 'person was' : 'people were'} notified.`,
      )
      setForm((current) => ({
        ...current,
        title: '',
        message: '',
        notes: '',
      }))
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <header className="developer-header">
        <div>
          <p>COMMUNICATION COMMAND</p>
          <h1 className="mm-page-title">Notifications</h1>
          <span>
            Push a platform message to everyone, a role, one team or one user.
          </span>
        </div>
      </header>

      {errorMessage && (
        <div className="developer-dashboard-error">{errorMessage}</div>
      )}

      {successMessage && (
        <div className="developer-dashboard-success">{successMessage}</div>
      )}

      <section className="developer-data-card developer-notification-card">
        <form onSubmit={submit}>
          <label>
            Audience
            <select name="scope" value={form.scope} onChange={updateField}>
              <option value="all">All active users</option>
              <option value="managers">Approved managers</option>
              <option value="players">Players</option>
              <option value="team">One team</option>
              <option value="user">One user</option>
            </select>
          </label>

          {form.scope === 'team' && (
            <label>
              Team ID
              <input
                name="teamId"
                value={form.teamId}
                onChange={updateField}
                inputMode="numeric"
                required
              />
            </label>
          )}

          {form.scope === 'user' && (
            <label>
              User ID
              <input
                name="userId"
                value={form.userId}
                onChange={updateField}
                inputMode="numeric"
                required
              />
            </label>
          )}

          <label>
            Title
            <input
              name="title"
              value={form.title}
              onChange={updateField}
              maxLength="120"
              required
            />
          </label>

          <label>
            Message
            <textarea
              name="message"
              value={form.message}
              onChange={updateField}
              rows="6"
              maxLength="1000"
              required
            />
          </label>

          <label>
            Internal audit note
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              rows="3"
              placeholder="Why is this communication being sent?"
              maxLength="2000"
              required
            />
          </label>

          <button type="submit" disabled={working}>
            {working ? 'Sending…' : 'Send notification'}
          </button>
        </form>
      </section>
    </>
  )
}

function audienceLabel(scope) {
  return {
    all: 'all active MatchMuster users',
    managers: 'all approved managers',
    players: 'all active players',
    team: 'the selected team',
    user: 'the selected user',
  }[scope]
}

export default DeveloperCommunicationsPanel
