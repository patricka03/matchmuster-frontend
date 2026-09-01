import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { MessageCircle, Search, X } from 'lucide-react'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'
import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'
import './MessagesPage.css'

function fullName(user) {
  return [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ') || 'Team member'
}

function initials(user) {
  return fullName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function messageTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  return new Intl.DateTimeFormat(
    'en-GB',
    sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short' },
  ).format(date)
}

function MessagesPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [currentUser, setCurrentUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [recipients, setRecipients] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState(null)
  const [error, setError] = useState('')
  const autoStartedRef = useRef(false)

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

  const loadInbox = useCallback(async ({ quiet = false } = {}) => {
    const headers = authHeaders()
    if (!headers) {
      await redirectToLogin()
      return
    }

    if (!quiet) setLoading(true)
    setError('')

    try {
      const [userResponse, conversationsResponse, recipientsResponse] =
        await Promise.all([
          fetch(`${API_URL}/users/me`, { headers }),
          fetch(`${API_URL}/teams/${teamId}/conversations`, { headers }),
          fetch(`${API_URL}/teams/${teamId}/conversations/recipients`, { headers }),
        ])

      if (
        userResponse.status === 401 ||
        conversationsResponse.status === 401 ||
        recipientsResponse.status === 401
      ) {
        await redirectToLogin()
        return
      }

      if (
        userResponse.status === 403 ||
        conversationsResponse.status === 403
      ) {
        navigate('/dashboard', { replace: true })
        return
      }

      const userData = await userResponse.json()
      const conversationsData = await conversationsResponse.json()
      const recipientsData = await recipientsResponse.json().catch(() => ({}))

      if (!userResponse.ok) {
        throw new Error(userData.error || 'Unable to load your account.')
      }
      if (!conversationsResponse.ok) {
        throw new Error(conversationsData.error || 'Unable to load messages.')
      }

      setCurrentUser(userData.user || userData)
      setConversations(conversationsData.conversations || [])
      if (recipientsResponse.ok) {
        setRecipients(recipientsData.recipients || [])
      }

      window.dispatchEvent(new CustomEvent('matchmuster:messages-updated'))
    } catch (requestError) {
      setError(requestError.message || 'Unable to load messages.')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [authHeaders, navigate, redirectToLogin, teamId])

  useEffect(() => {
    void loadInbox()
    const interval = window.setInterval(
      () => void loadInbox({ quiet: true }),
      15000,
    )
    return () => window.clearInterval(interval)
  }, [loadInbox])

  const startConversation = useCallback(async (recipientId) => {
    if (startingId) return
    const headers = authHeaders()
    if (!headers) {
      await redirectToLogin()
      return
    }

    setStartingId(recipientId)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/conversations`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            conversation: { recipient_id: recipientId },
          }),
        },
      )
      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        await redirectToLogin()
        return
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.errors?.join(', ') ||
            'Unable to start this conversation.',
        )
      }

      setShowNew(false)
      navigate(`/teams/${teamId}/messages/${data.conversation.id}`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setStartingId(null)
    }
  }, [authHeaders, navigate, redirectToLogin, startingId, teamId])

  useEffect(() => {
    const recipientId = searchParams.get('recipient_id')
    if (!recipientId || autoStartedRef.current || loading) return

    autoStartedRef.current = true
    setSearchParams({}, { replace: true })
    void startConversation(recipientId)
  }, [loading, searchParams, setSearchParams, startConversation])

  const visibleRecipients = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase()
    if (!query) return recipients

    return recipients.filter((recipient) =>
      [
        fullName(recipient),
        recipient.role,
        recipient.preferred_position,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [recipientSearch, recipients])

  if (loading) {
    return <p className="dashboard-message">Loading messages...</p>
  }

  return (
    <>
      <Navbar teamId={teamId} currentUser={currentUser} />

      <main className="messages-page">
        <section className="messages-shell">
          <header className="messages-heading">
            <div>
              <span>TEAM MESSAGES</span>
              <h1 className="mm-page-title">Messages</h1>
              <p>Private conversations with your teammates.</p>
            </div>

            <button
              className="messages-new-button"
              type="button"
              onClick={() => setShowNew(true)}
            >
              
              New message
            </button>
          </header>

          {error && <p className="messages-error" role="alert">{error}</p>}

          {conversations.length === 0 ? (
            <section className="messages-empty">
              <span><MessageCircle size={28} aria-hidden="true" /></span>
              <h2>No conversations yet</h2>
              <p>Start a private conversation with an approved teammate.</p>
              <button type="button" onClick={() => setShowNew(true)}>
                Start a message
              </button>
            </section>
          ) : (
            <div className="messages-list">
              {conversations.map((conversation) => {
                const other = conversation.other_user
                const unread = Number(conversation.unread_count || 0)

                return (
                  <button
                    className={`messages-row${unread > 0 ? ' unread' : ''}`}
                    type="button"
                    key={conversation.id}
                    onClick={() =>
                      navigate(`/teams/${teamId}/messages/${conversation.id}`)
                    }
                  >
                    <span className="messages-avatar">{initials(other)}</span>
                    <span className="messages-row-copy">
                      <span className="messages-row-title">
                        <strong>{fullName(other)}</strong>
                        <small>
                          {messageTime(
                            conversation.last_message?.created_at ||
                              conversation.updated_at,
                          )}
                        </small>
                      </span>
                      <span className="messages-row-preview">
                        {conversation.last_message?.body || 'Start the conversation'}
                      </span>
                    </span>
                    {unread > 0 && (
                      <span className="messages-unread-badge">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {showNew && (
        <div
          className="message-picker-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowNew(false)
          }}
        >
          <section
            className="message-picker"
            role="dialog"
            aria-modal="true"
            aria-label="Start a new message"
          >
            <header className="message-picker-heading">
              <div>
                <span>NEW MESSAGE</span>
                <h2>Choose teammate</h2>
              </div>
              <button type="button" onClick={() => setShowNew(false)} aria-label="Close">
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <label className="message-picker-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={recipientSearch}
                onChange={(event) => setRecipientSearch(event.target.value)}
                placeholder="Search squad"
              />
            </label>

            <div className="message-picker-list">
              {visibleRecipients.length === 0 ? (
                <p>No matching team members.</p>
              ) : (
                visibleRecipients.map((recipient) => (
                  <button
                    type="button"
                    key={recipient.id}
                    disabled={startingId !== null}
                    onClick={() => void startConversation(recipient.id)}
                  >
                    <span className="messages-avatar">{initials(recipient)}</span>
                    <span>
                      <strong>{fullName(recipient)}</strong>
                      <small>
                        {recipient.role === 'manager'
                          ? 'Manager'
                          : recipient.preferred_position || 'Player'}
                      </small>
                    </span>
                    {String(startingId) === String(recipient.id) && (
                      <em>Opening...</em>
                    )}
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default MessagesPage
