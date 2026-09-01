import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  Edit3,
  MessageCircle,
  MoreVertical,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'
import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'
import './TeamMessagesV2Page.css'

function getUserName(user) {
  if (!user) return 'Teammate'

  const directName =
    user.name ||
    user.full_name

  if (directName?.trim()) {
    return directName.trim()
  }

  const fullName = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return (
    fullName ||
    user.email ||
    'Teammate'
  )
}

function initials(user) {
  const name = getUserName(user)

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function roleLabel(user) {
  if (user?.role === 'manager') {
    return 'Manager'
  }

  if (user?.role === 'player') {
    return user.preferred_position
      ? `Player · ${user.preferred_position}`
      : 'Player'
  }

  if (user?.account_type === 'manager') {
    return 'Manager'
  }

  return 'Player'
}

function formatTime(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const today = new Date()
  const sameDay =
    date.toDateString() ===
    today.toDateString()

  if (sameDay) {
    return new Intl.DateTimeFormat(
      undefined,
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(date)
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      day: 'numeric',
      month: 'short',
    },
  ).format(date)
}

function TeamMessagesV2Page() {
  const navigate = useNavigate()
  const {
    teamId,
    conversationId,
  } = useParams()
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const [currentUser, setCurrentUser] =
    useState(null)
  const [conversations, setConversations] =
    useState([])
  const [conversation, setConversation] =
    useState(null)
  const [messages, setMessages] =
    useState([])
  const [messageBody, setMessageBody] =
    useState('')
  const [loading, setLoading] =
    useState(true)
  const [sending, setSending] =
    useState(false)
  const [errorMessage, setErrorMessage] =
    useState('')

  const [showNewMessage, setShowNewMessage] =
    useState(false)
  const [recipientQuery, setRecipientQuery] =
    useState('')
  const [recipientResults, setRecipientResults] =
    useState([])
  const [recipientLoading, setRecipientLoading] =
    useState(false)
  const [recipientError, setRecipientError] =
    useState('')
  const [startingRecipientId, setStartingRecipientId] =
    useState(null)

  const [showChatMenu, setShowChatMenu] =
    useState(false)
  const [editingMessageId, setEditingMessageId] =
    useState(null)
  const [editingBody, setEditingBody] =
    useState('')
  const [savingEdit, setSavingEdit] =
    useState(false)

  const messagesEndRef = useRef(null)
  const messagesThreadRef = useRef(null)
  const messageInputRef = useRef(null)
  const directRecipientHandled = useRef(false)

  useEffect(() => {
    if (!conversationId) {
      return undefined
    }

    const root = document.documentElement
    const body = document.body
    const viewport = window.visualViewport

    root.classList.add('mm-conversation-active')
    body.classList.add('mm-conversation-active')

    function keepLatestMessageVisible() {
      const thread = messagesThreadRef.current

      if (!thread) return

      thread.scrollTop = thread.scrollHeight
    }

    function syncChatViewport() {
      const viewportTop =
        viewport?.offsetTop || 0
      const viewportHeight =
        viewport?.height ||
        window.innerHeight
      const keyboardHeight = Math.max(
        0,
        window.innerHeight -
          viewportHeight -
          viewportTop,
      )
      const keyboardOpen =
        keyboardHeight > 120

      root.style.setProperty(
        '--mm-chat-viewport-top',
        `${Math.round(viewportTop)}px`,
      )
      root.style.setProperty(
        '--mm-chat-viewport-height',
        `${Math.round(viewportHeight)}px`,
      )

      root.classList.toggle(
        'mm-chat-keyboard-open',
        keyboardOpen,
      )
      body.classList.toggle(
        'mm-chat-keyboard-open',
        keyboardOpen,
      )

      window.requestAnimationFrame(
        keepLatestMessageVisible,
      )
    }

    syncChatViewport()

    viewport?.addEventListener(
      'resize',
      syncChatViewport,
    )
    viewport?.addEventListener(
      'scroll',
      syncChatViewport,
    )
    window.addEventListener(
      'resize',
      syncChatViewport,
    )
    window.addEventListener(
      'orientationchange',
      syncChatViewport,
    )

    return () => {
      viewport?.removeEventListener(
        'resize',
        syncChatViewport,
      )
      viewport?.removeEventListener(
        'scroll',
        syncChatViewport,
      )
      window.removeEventListener(
        'resize',
        syncChatViewport,
      )
      window.removeEventListener(
        'orientationchange',
        syncChatViewport,
      )

      root.classList.remove(
        'mm-conversation-active',
        'mm-chat-keyboard-open',
      )
      body.classList.remove(
        'mm-conversation-active',
        'mm-chat-keyboard-open',
      )
      root.style.removeProperty(
        '--mm-chat-viewport-top',
      )
      root.style.removeProperty(
        '--mm-chat-viewport-height',
      )
    }
  }, [conversationId])

  useEffect(() => {
    const input = messageInputRef.current

    if (!input) return

    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 104)}px`
  }, [messageBody])

  const token = getAuthToken()

  const logoutToLogin =
    useCallback(
      async () => {
        await clearAuthToken()

        localStorage.removeItem(
          'currentUser',
        )
        localStorage.removeItem(
          'activeTeamId',
        )

        navigate('/login', {
          replace: true,
        })
      },
      [navigate],
    )

  const apiFetch =
    useCallback(
      async (
        path,
        options = {},
      ) => {
        const authToken =
          getAuthToken()

        if (!authToken) {
          await logoutToLogin()
          throw new Error(
            'Your session has expired.',
          )
        }

        const response =
          await fetch(
            `${API_URL}${path}`,
            {
              ...options,
              headers: {
                Accept:
                  'application/json',
                ...(options.body
                  ? {
                      'Content-Type':
                        'application/json',
                    }
                  : {}),
                Authorization:
                  authToken,
                ...(options.headers || {}),
              },
            },
          )

        if (response.status === 401) {
          await logoutToLogin()
          throw new Error(
            'Your session has expired.',
          )
        }

        let data = {}

        if (response.status !== 204) {
          const text =
            await response.text()

          if (text) {
            try {
              data = JSON.parse(text)
            } catch {
              data = {
                error:
                  response.statusText ||
                  'The server returned an unreadable response.',
              }
            }
          }
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.errors?.join?.(', ') ||
              data.message ||
              'Unable to complete that request.',
          )
        }

        return data
      },
      [logoutToLogin],
    )

  const loadCurrentUser =
    useCallback(async () => {
      const data =
        await apiFetch('/users/me')

      const user =
        data.user || data

      setCurrentUser(user)
      return user
    }, [apiFetch])

  const loadConversations =
    useCallback(async () => {
      const data =
        await apiFetch(
          `/teams/${teamId}/conversations`,
        )

      setConversations(
        data.conversations || [],
      )
    }, [apiFetch, teamId])

  const loadThread =
    useCallback(async () => {
      if (!conversationId) {
        setConversation(null)
        setMessages([])
        return
      }

      const [
        conversationData,
        messagesData,
      ] = await Promise.all([
        apiFetch(
          `/teams/${teamId}/conversations/${conversationId}`,
        ),
        apiFetch(
          `/teams/${teamId}/conversations/${conversationId}/messages`,
        ),
      ])

      setConversation(
        conversationData.conversation ||
          null,
      )
      setMessages(
        messagesData.messages || [],
      )
    }, [
      apiFetch,
      teamId,
      conversationId,
    ])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!token) {
        await logoutToLogin()
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        await loadCurrentUser()

        if (conversationId) {
          await loadThread()
        } else {
          await loadConversations()
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error.message ||
              'Unable to load messages.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [
    token,
    conversationId,
    loadCurrentUser,
    loadThread,
    loadConversations,
    logoutToLogin,
  ])

  useEffect(() => {
    if (!conversationId) return

    const thread = messagesThreadRef.current

    if (!thread) return

    thread.scrollTo({
      top: thread.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, conversationId])

  const createConversation =
    useCallback(
      async (recipientId) => {
        setStartingRecipientId(
          recipientId,
        )
        setErrorMessage('')

        try {
          const data =
            await apiFetch(
              `/teams/${teamId}/conversations`,
              {
                method: 'POST',
                body: JSON.stringify({
                  conversation: {
                    recipient_id:
                      recipientId,
                  },
                }),
              },
            )

          const created =
            data.conversation

          if (!created?.id) {
            throw new Error(
              'The conversation could not be opened.',
            )
          }

          setShowNewMessage(false)
          setRecipientQuery('')
          setRecipientResults([])

          navigate(
            `/teams/${teamId}/messages/${created.id}`,
            {
              replace: false,
            },
          )
        } catch (error) {
          setErrorMessage(
            error.message ||
              'Unable to start this conversation.',
          )
        } finally {
          setStartingRecipientId(null)
        }
      },
      [apiFetch, teamId, navigate],
    )

  useEffect(() => {
    if (
      conversationId ||
      directRecipientHandled.current ||
      !currentUser?.id
    ) {
      return
    }

    const recipientId =
      searchParams.get('recipient_id')

    if (!recipientId) return

    directRecipientHandled.current = true

    setSearchParams({}, {
      replace: true,
    })

    if (
      Number(recipientId) ===
      Number(currentUser.id)
    ) {
      return
    }

    const startTimer = window.setTimeout(
      () => {
        void createConversation(recipientId)
      },
      0,
    )

    return () => {
      window.clearTimeout(startTimer)
    }
  }, [
    searchParams,
    setSearchParams,
    conversationId,
    currentUser?.id,
    createConversation,
  ])

  // MATCHMUSTER MESSAGING DIRECTORY FIX
  // Use the exact same approved TeamMembership source as Squad.
  // Search stays local in recipientResults.
  useEffect(() => {
    if (!showNewMessage) return

    let cancelled = false

    async function loadRecipients() {
      setRecipientLoading(true)
      setRecipientError('')

      try {
        const data = await apiFetch(
          `/teams/${teamId}/conversations/recipients`,
        )

        const recipients = Array.isArray(
          data?.recipients,
        )
          ? data.recipients.filter(
              (recipient) =>
                Number(recipient.id) !==
                Number(currentUser?.id),
            )
          : []

        if (!cancelled) {
          setRecipientResults(recipients)
        }
      } catch (error) {
        if (!cancelled) {
          setRecipientResults([])
          setRecipientError(
            error.message ||
              'Unable to load team members.',
          )
        }
      } finally {
        if (!cancelled) {
          setRecipientLoading(false)
        }
      }
    }

    loadRecipients()

    return () => {
      cancelled = true
    }
  }, [
    showNewMessage,
    apiFetch,
    teamId,
    currentUser?.id,
  ])

  const sendMessage =
    async (event) => {
      event.preventDefault()

      const body =
        messageBody.trim()

      if (!body || !conversationId) {
        return
      }

      setSending(true)
      setErrorMessage('')

      try {
        const data =
          await apiFetch(
            `/teams/${teamId}/conversations/${conversationId}/messages`,
            {
              method: 'POST',
              body: JSON.stringify({
                message: {
                  body,
                },
              }),
            },
          )

        setMessages(
          (current) => [
            ...current,
            data.message,
          ],
        )
        setMessageBody('')
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to send the message.',
        )
      } finally {
        setSending(false)
      }
    }

  const beginEdit =
    (message) => {
      setEditingMessageId(
        message.id,
      )
      setEditingBody(
        message.body,
      )
      setShowChatMenu(false)
    }

  const saveEdit =
    async (messageId) => {
      const body =
        editingBody.trim()

      if (!body) return

      setSavingEdit(true)
      setErrorMessage('')

      try {
        const data =
          await apiFetch(
            `/teams/${teamId}/conversations/${conversationId}/messages/${messageId}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                message: {
                  body,
                },
              }),
            },
          )

        setMessages(
          (current) =>
            current.map(
              (message) =>
                message.id === messageId
                  ? data.message
                  : message,
            ),
        )

        setEditingMessageId(null)
        setEditingBody('')
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to edit this message.',
        )
      } finally {
        setSavingEdit(false)
      }
    }

  const deleteMessage =
    async (messageId) => {
      const confirmed =
        window.confirm(
          'Delete this message? This removes it from the conversation.',
        )

      if (!confirmed) return

      setErrorMessage('')

      try {
        await apiFetch(
          `/teams/${teamId}/conversations/${conversationId}/messages/${messageId}`,
          {
            method: 'DELETE',
          },
        )

        setMessages(
          (current) =>
            current.filter(
              (message) =>
                message.id !== messageId,
            ),
        )
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to delete this message.',
        )
      }
    }

  const deleteChat =
    async () => {
      const confirmed =
        window.confirm(
          'Delete this chat from your MatchMuster account? The other person will keep their copy.',
        )

      if (!confirmed) return

      setShowChatMenu(false)
      setErrorMessage('')

      try {
        await apiFetch(
          `/teams/${teamId}/conversations/${conversationId}`,
          {
            method: 'DELETE',
          },
        )

        navigate(
          `/teams/${teamId}/messages`,
          {
            replace: true,
          },
        )
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to delete this chat.',
        )
      }
    }

  const otherUser =
    conversation?.other_user

  const filteredRecipients =
    useMemo(() => {
      const query =
        recipientQuery
          .trim()
          .toLowerCase()

      if (!query) {
        return recipientResults
      }

      return recipientResults.filter(
        (recipient) => {
          const haystack = [
            getUserName(recipient),
            recipient.first_name,
            recipient.last_name,
            recipient.email,
            recipient.role,
            recipient.account_type,
            recipient.preferred_position,
            roleLabel(recipient),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return haystack.includes(query)
        },
      )
    }, [
      recipientResults,
      recipientQuery,
    ])

  const sortedRecipients =
    useMemo(
      () =>
        [...filteredRecipients].sort(
          (first, second) => {
            const roleOrder = {
              manager: 0,
              player: 1,
            }

            const firstRole =
              roleOrder[first.role] ?? 2
            const secondRole =
              roleOrder[second.role] ?? 2

            if (firstRole !== secondRole) {
              return firstRole - secondRole
            }

            return getUserName(first)
              .localeCompare(
                getUserName(second),
              )
          },
        ),
      [filteredRecipients],
    )

  if (loading) {
    return (
      <main className="mm-messages-loading">
        Loading messages...
      </main>
    )
  }

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main
        className={`mm-messages-page ${conversationId ? 'mm-conversation-page' : ''}`}
      >
        {errorMessage && (
          <div
            className="mm-messages-error"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {!conversationId ? (
          <section className="mm-messages-inbox">
            <header className="mm-messages-title-row">
              <div>
                <span>TEAM CHAT</span>
                <h1 className="mm-page-title">Messages</h1>
                <p>
                  Message players and managers from your team.
                </p>
              </div>

              <button
                className="mm-new-message-button"
                type="button"
                onClick={() =>
                  setShowNewMessage(true)
                }
              >
                
                New message
              </button>
            </header>

            {conversations.length === 0 ? (
              <div className="mm-message-empty-card">
                <MessageCircle size={34} />
                <h2>No conversations yet</h2>
                <p>
                  Start a private conversation with a player or manager in this team.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setShowNewMessage(true)
                  }
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              <div className="mm-conversation-list">
                {conversations.map(
                  (item) => {
                    const person =
                      item.other_user

                    return (
                      <button
                        className="mm-conversation-row"
                        key={item.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/teams/${teamId}/messages/${item.id}`,
                          )
                        }
                      >
                        <span className="mm-message-avatar">
                          {initials(person)}
                        </span>

                        <span className="mm-conversation-copy">
                          <strong>
                            {getUserName(person)}
                          </strong>
                          <small>
                            {roleLabel(person)}
                          </small>
                          <span>
                            {item.last_message?.body ||
                              'Open conversation'}
                          </span>
                        </span>

                        <span className="mm-conversation-meta">
                          <time>
                            {formatTime(
                              item.last_message?.created_at ||
                                item.updated_at,
                            )}
                          </time>

                          {item.unread_count > 0 && (
                            <b>
                              {item.unread_count > 99
                                ? '99+'
                                : item.unread_count}
                            </b>
                          )}
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="mm-message-thread-shell">
            <header className="mm-thread-header">
              <button
                className="mm-thread-back"
                type="button"
                aria-label="Back to messages"
                onClick={() =>
                  navigate(
                    `/teams/${teamId}/messages`,
                  )
                }
              >
                <ChevronLeft size={26} />
              </button>

              <span className="mm-message-avatar compact">
                {initials(otherUser)}
              </span>

              <div className="mm-thread-person">
                <strong>
                  {getUserName(otherUser)}
                </strong>
                <span>
                  {roleLabel(otherUser)}
                </span>
              </div>

              <div className="mm-thread-menu-wrap">
                <button
                  className="mm-thread-menu-button"
                  type="button"
                  aria-label="Conversation options"
                  onClick={() =>
                    setShowChatMenu(
                      (current) => !current,
                    )
                  }
                >
                  <MoreVertical size={23} />
                </button>

                {showChatMenu && (
                  <div className="mm-thread-menu">
                    <button
                      type="button"
                      onClick={deleteChat}
                    >
                      <Trash2 size={17} />
                      Delete chat
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div
              className="mm-thread-messages"
              ref={messagesThreadRef}
            >
              {messages.length === 0 ? (
                <div className="mm-thread-empty">
                  <MessageCircle size={28} />
                  <p>
                    Start the conversation with {getUserName(otherUser)}.
                  </p>
                </div>
              ) : (
                messages.map(
                  (message) => {
                    const mine =
                      Number(message.sender_id) ===
                      Number(currentUser?.id)

                    const editing =
                      editingMessageId ===
                      message.id

                    return (
                      <article
                        className={`mm-message-bubble-row ${mine ? 'mine' : 'theirs'}`}
                        key={message.id}
                      >
                        <div className="mm-message-bubble-wrap">
                          {editing ? (
                            <div className="mm-message-edit-card">
                              <textarea
                                value={editingBody}
                                maxLength={2000}
                                autoFocus
                                onChange={(event) =>
                                  setEditingBody(
                                    event.target.value,
                                  )
                                }
                              />

                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(null)
                                    setEditingBody('')
                                  }}
                                >
                                  <X size={16} />
                                  Cancel
                                </button>
                                <button
                                  className="primary"
                                  type="button"
                                  disabled={
                                    savingEdit ||
                                    !editingBody.trim()
                                  }
                                  onClick={() =>
                                    saveEdit(
                                      message.id,
                                    )
                                  }
                                >
                                  <Check size={16} />
                                  {savingEdit
                                    ? 'Saving...'
                                    : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mm-message-bubble">
                                {message.body}
                              </div>

                              <div className="mm-message-under-bubble">
                                <span>
                                  {formatTime(
                                    message.created_at,
                                  )}
                                  {message.edited_at
                                    ? ' · Edited'
                                    : ''}
                                </span>

                                {mine && (
                                  <span className="mm-message-actions">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        beginEdit(message)
                                      }
                                    >
                                      <Edit3 size={13} />
                                      Edit
                                    </button>

                                    <button
                                      className="danger"
                                      type="button"
                                      onClick={() =>
                                        deleteMessage(message.id)
                                      }
                                    >
                                      <Trash2 size={13} />
                                      Delete
                                    </button>
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </article>
                    )
                  },
                )
              )}

              <div ref={messagesEndRef} />
            </div>

            <form
              className="mm-message-composer mm-keyboard-aware-composer"
              onSubmit={sendMessage}
            >
              <textarea
                ref={messageInputRef}
                aria-label="Message"
                placeholder="Message..."
                maxLength={2000}
                rows={1}
                value={messageBody}
                onChange={(event) =>
                  setMessageBody(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault()
                    event.currentTarget
                      .form
                      ?.requestSubmit()
                  }
                }}
              />

              <button
                type="submit"
                aria-label="Send message"
                disabled={
                  sending ||
                  !messageBody.trim()
                }
              >
                <Send size={20} />
              </button>
            </form>
          </section>
        )}
      </main>

      {showNewMessage && (
        <div
          className="mm-new-message-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowNewMessage(false)
            }
          }}
        >
          <section
            className="mm-new-message-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="New message"
          >
            <header>
              <div>
                <span>NEW MESSAGE</span>
                <h2>Choose teammate</h2>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() =>
                  setShowNewMessage(false)
                }
              >
                <X size={25} />
              </button>
            </header>

            <div className="mm-recipient-search">
              <Search size={21} />
              <input
                type="search"
                value={recipientQuery}
                placeholder="Search player or manager"
                autoFocus
                autoComplete="off"
                onChange={(event) =>
                  setRecipientQuery(
                    event.target.value,
                  )
                }
              />

              {recipientQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() =>
                    setRecipientQuery('')
                  }
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <div className="mm-recipient-results">
              {recipientLoading ? (
                <p className="mm-recipient-state">
                  Loading team...
                </p>
              ) : recipientError ? (
                <p className="mm-recipient-state error">
                  {recipientError}
                </p>
              ) : sortedRecipients.length === 0 ? (
                <p className="mm-recipient-state">
                  {recipientQuery.trim()
                    ? 'No matching team members.'
                    : 'No other approved team members are available.'}
                </p>
              ) : (
                sortedRecipients.map(
                  (recipient) => (
                    <button
                      className="mm-recipient-row"
                      key={recipient.id}
                      type="button"
                      disabled={
                        startingRecipientId ===
                        recipient.id
                      }
                      onClick={() =>
                        createConversation(
                          recipient.id,
                        )
                      }
                    >
                      <span className="mm-message-avatar compact">
                        {initials(recipient)}
                      </span>

                      <span>
                        <strong>
                          {getUserName(recipient)}
                        </strong>
                        <small>
                          {roleLabel(recipient)}
                        </small>
                        {recipient.email && (
                          <em>
                            {recipient.email}
                          </em>
                        )}
                      </span>

                      <MessageCircle size={20} />
                    </button>
                  ),
                )
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default TeamMessagesV2Page
