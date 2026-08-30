import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { MoreHorizontal, Send, ShieldAlert, UserX, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import BackButton from '../components/BackButton'
import Navbar from '../components/Navbar'
import API_URL from '../config/api'
import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'
import './MessagesPage.css'

const REPORT_REASONS = [
  ['harassment', 'Harassment'],
  ['bullying', 'Bullying'],
  ['discrimination', 'Discrimination'],
  ['inappropriate_content', 'Inappropriate content'],
  ['spam', 'Spam'],
  ['other', 'Other'],
]

function fullName(user) {
  return [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ') || 'Teammate'
}

function messageTimestamp(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function ConversationPage() {
  const navigate = useNavigate()
  const { teamId, conversationId } = useParams()

  const [currentUser, setCurrentUser] = useState(null)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('harassment')
  const [reportDetails, setReportDetails] = useState('')
  const [safetyBusy, setSafetyBusy] = useState(false)
  const listRef = useRef(null)

  const redirectToLogin = useCallback(async () => {
    await clearAuthToken()
    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')
    navigate('/login', { replace: true })
  }, [navigate])

  const authHeaders = useCallback(() => {
    const token = getAuthToken()
    if (!token) return null
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: token,
    }
  }, [])

  const loadConversation = useCallback(async ({ quiet = false } = {}) => {
    const headers = authHeaders()
    if (!headers) {
      await redirectToLogin()
      return
    }

    if (!quiet) setLoading(true)

    try {
      const [userResponse, conversationResponse, messagesResponse] =
        await Promise.all([
          fetch(`${API_URL}/users/me`, { headers }),
          fetch(
            `${API_URL}/teams/${teamId}/conversations/${conversationId}`,
            { headers },
          ),
          fetch(
            `${API_URL}/teams/${teamId}/conversations/${conversationId}/messages`,
            { headers },
          ),
        ])

      if (
        userResponse.status === 401 ||
        conversationResponse.status === 401 ||
        messagesResponse.status === 401
      ) {
        await redirectToLogin()
        return
      }

      if (
        conversationResponse.status === 403 ||
        messagesResponse.status === 403
      ) {
        navigate(`/teams/${teamId}/messages`, { replace: true })
        return
      }

      const userData = await userResponse.json()
      const conversationData = await conversationResponse.json()
      const messagesData = await messagesResponse.json()

      if (!conversationResponse.ok) {
        throw new Error(
          conversationData.error || 'Unable to open this conversation.',
        )
      }
      if (!messagesResponse.ok) {
        throw new Error(messagesData.error || 'Unable to load messages.')
      }

      setCurrentUser(userData.user || userData)
      setConversation(conversationData.conversation || null)
      setMessages(messagesData.messages || [])
      setError('')
      window.dispatchEvent(new CustomEvent('matchmuster:messages-updated'))
    } catch (requestError) {
      setError(requestError.message || 'Unable to open messages.')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [authHeaders, conversationId, navigate, redirectToLogin, teamId])

  useEffect(() => {
    void loadConversation()
    const interval = window.setInterval(
      () => void loadConversation({ quiet: true }),
      4000,
    )
    return () => window.clearInterval(interval)
  }, [loadConversation])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.length])

  const otherUser = conversation?.other_user
  const title = fullName(otherUser)

  async function sendMessage(event) {
    event?.preventDefault()
    const cleanBody = body.trim()
    if (!cleanBody || sending) return

    const headers = authHeaders()
    if (!headers) {
      await redirectToLogin()
      return
    }

    setSending(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: { body: cleanBody } }),
        },
      )
      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        await redirectToLogin()
        return
      }
      if (!response.ok) {
        throw new Error(
          data.error || data.errors?.join(', ') || 'Unable to send message.',
        )
      }

      setBody('')
      setMessages((current) => [...current, data.message])
      window.dispatchEvent(new CustomEvent('matchmuster:messages-updated'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  async function blockUser() {
    if (!otherUser?.id || safetyBusy) return
    const confirmed = window.confirm(
      `Block ${title}? You will no longer be able to message each other.`,
    )
    if (!confirmed) return

    const headers = authHeaders()
    if (!headers) return

    setSafetyBusy(true)
    try {
      const response = await fetch(`${API_URL}/user_blocks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_block: { blocked_user_id: otherUser.id } }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.errors?.join(', ') || 'Unable to block this user.')
      }
      navigate(`/teams/${teamId}/messages`, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSafetyBusy(false)
    }
  }

  async function submitReport(event) {
    event.preventDefault()
    if (!otherUser?.id || safetyBusy) return

    if (reportReason === 'other' && !reportDetails.trim()) {
      setError('Add a short description when choosing Other.')
      return
    }

    const headers = authHeaders()
    if (!headers) return

    setSafetyBusy(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          report: {
            reported_user_id: otherUser.id,
            reason: reportReason,
            details: reportDetails.trim(),
          },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.errors?.join(', ') || 'Unable to submit your report.')
      }
      setReportOpen(false)
      setSafetyOpen(false)
      setReportDetails('')
      window.alert('Report submitted to MatchMuster for review.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSafetyBusy(false)
    }
  }

  if (loading) {
    return <p className="dashboard-message">Opening conversation...</p>
  }

  return (
    <>
      <Navbar teamId={teamId} currentUser={currentUser} />

      <main className="conversation-page">
        <section className="conversation-shell">
          <header className="conversation-heading">
            <BackButton to={`/teams/${teamId}/messages`} label="Messages" />

            <div className="conversation-person-row">
              <span className="conversation-avatar">
                {title.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
              <span className="conversation-person-copy">
                <strong>{title}</strong>
                <small>Private team conversation</small>
              </span>
              <button
                className="conversation-more-button"
                type="button"
                onClick={() => setSafetyOpen((current) => !current)}
                aria-label="Conversation safety options"
              >
                <MoreHorizontal size={21} aria-hidden="true" />
              </button>

              {safetyOpen && (
                <div className="conversation-safety-menu">
                  <button type="button" onClick={() => setReportOpen(true)}>
                    <ShieldAlert size={17} aria-hidden="true" />
                    Report
                  </button>
                  <button type="button" onClick={() => void blockUser()} disabled={safetyBusy}>
                    <UserX size={17} aria-hidden="true" />
                    Block
                  </button>
                </div>
              )}
            </div>
          </header>

          {error && <p className="messages-error conversation-error" role="alert">{error}</p>}

          <div className="conversation-thread" ref={listRef}>
            {messages.length === 0 ? (
              <div className="conversation-start">
                <h2>Start the conversation</h2>
                <p>Send a private message to {title}.</p>
              </div>
            ) : (
              messages.map((message) => {
                const mine = String(message.sender_id) === String(currentUser?.id)
                return (
                  <div
                    className={`message-bubble-row${mine ? ' mine' : ''}`}
                    key={message.id}
                  >
                    <div className="message-bubble">
                      <p>{message.body}</p>
                      <small>{messageTimestamp(message.created_at)}</small>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <form className="conversation-composer" onSubmit={sendMessage}>
            <textarea
              rows="1"
              maxLength="2000"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={`Message ${title}`}
              aria-label={`Message ${title}`}
            />
            <button type="submit" disabled={sending || !body.trim()} aria-label="Send message">
              <Send size={19} aria-hidden="true" />
            </button>
          </form>
        </section>
      </main>

      {reportOpen && (
        <div className="message-picker-backdrop" role="presentation">
          <form className="message-report-sheet" onSubmit={submitReport}>
            <header>
              <div>
                <span>SAFETY</span>
                <h2>Report {title}</h2>
              </div>
              <button type="button" onClick={() => setReportOpen(false)} aria-label="Close report">
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <label>
              <span>Reason</span>
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                {REPORT_REASONS.map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Details</span>
              <textarea
                rows="4"
                maxLength="1000"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                placeholder="Tell MatchMuster what happened."
              />
            </label>

            <button className="message-report-submit" type="submit" disabled={safetyBusy}>
              {safetyBusy ? 'Submitting...' : 'Submit report'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default ConversationPage
