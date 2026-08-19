import { useEffect, useState } from 'react'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

import './SafetyModals.css'

function BlockedUsersModal({
  isOpen,
  onClose,
}) {
  const [userBlocks, setUserBlocks] =
    useState([])

  const [isLoading, setIsLoading] =
    useState(false)

  const [unblockingId, setUnblockingId] =
    useState(null)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearBlockedUsersSession() {
    await clearAuthToken()

    localStorage.removeItem(
      'currentUser',
    )

    localStorage.removeItem(
      'activeTeamId',
    )

    localStorage.removeItem(
      'activeTeamName',
    )

    window.location.assign(
      '/login',
    )
  }

  // ========================================
  // LOAD BLOCKED USERS
  // ========================================

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let cancelled = false

    async function loadBlockedUsers() {
      const token =
        getAuthToken()

      if (!token) {
        await clearBlockedUsersSession()
        return
      }

      setIsLoading(true)
      setErrorMessage('')

      try {
        const response =
          await fetch(
            `${API_URL}/user_blocks`,
            {
              headers: {
                Accept:
                  'application/json',

                Authorization:
                  token,
              },
            },
          )

        const data =
          await readResponse(
            response,
          )

        if (
          response.status === 401
        ) {
          await clearBlockedUsersSession()

          return
        }

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              'Unable to load your blocked accounts.',
            ),
          )
        }

        if (!cancelled) {
          setUserBlocks(
            normaliseBlocks(
              data,
            ),
          )
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error.message ||
              'Unable to load your blocked accounts.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    function handleKeyDown(
      event,
    ) {
      if (
        event.key === 'Escape'
      ) {
        onClose()
      }
    }

    loadBlockedUsers()

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      cancelled = true

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    isOpen,
    onClose,
  ])

  if (!isOpen) {
    return null
  }

  // ========================================
  // UNBLOCK USER
  // ========================================

  async function handleUnblock(
    userBlock,
  ) {
    const blockedUser =
      blockedUserFrom(
        userBlock,
      )

    const name =
      displayName(
        blockedUser,
      )

    const confirmed =
      window.confirm(
        `Unblock ${name}? You may see their content and activity again.`,
      )

    if (!confirmed) {
      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await clearBlockedUsersSession()
      return
    }

    setUnblockingId(
      userBlock.id,
    )

    setErrorMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/user_blocks/${userBlock.id}`,
          {
            method: 'DELETE',

            headers: {
              Accept:
                'application/json',

              Authorization:
                token,
            },
          },
        )

      const data =
        await readResponse(
          response,
        )

      if (
        response.status === 401
      ) {
        await clearBlockedUsersSession()

        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Unable to unblock ${name}.`,
          ),
        )
      }

      setUserBlocks(
        (currentBlocks) =>
          currentBlocks.filter(
            (
              currentBlock,
            ) =>
              currentBlock.id !==
              userBlock.id,
          ),
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          `Unable to unblock ${name}.`,
      )
    } finally {
      setUnblockingId(null)
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      className="safety-modal-overlay"
      role="presentation"
      onMouseDown={() => {
        if (!unblockingId) {
          onClose()
        }
      }}
    >
      <section
        className="safety-modal safety-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-users-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="safety-modal-heading">
          <div>
            <p className="safety-modal-label">
              Privacy controls
            </p>

            <h2 id="blocked-users-title">
              Blocked accounts
            </h2>

            <p>
              Blocked people cannot
              interact with you, and
              their content is hidden
              from your MatchMuster
              experience.
            </p>
          </div>

          <button
            className="safety-modal-close"
            type="button"
            onClick={onClose}
            disabled={Boolean(
              unblockingId,
            )}
            aria-label="Close blocked accounts"
          >
            ×
          </button>
        </header>

        {errorMessage && (
          <p
            className="safety-modal-error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <div className="blocked-users-loading">
            Loading blocked
            accounts…
          </div>
        ) : userBlocks.length ===
          0 ? (
          <div className="blocked-users-empty">
            <div>
              <strong>
                No blocked accounts
              </strong>

              <p>
                Anyone you block from a
                post or another safety
                control will appear
                here.
              </p>
            </div>
          </div>
        ) : (
          <div className="blocked-users-list">
            {userBlocks.map(
              (userBlock) => {
                const blockedUser =
                  blockedUserFrom(
                    userBlock,
                  )

                const name =
                  displayName(
                    blockedUser,
                  )

                return (
                  <article
                    className="blocked-user-row"
                    key={
                      userBlock.id
                    }
                  >
                    <div className="blocked-user-details">
                      <div className="blocked-user-avatar">
                        {name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {name}
                        </strong>

                        <span>
                          {blockedUser?.email ||
                            'MatchMuster member'}
                        </span>
                      </div>
                    </div>

                    <button
                      className="blocked-user-unblock"
                      type="button"
                      onClick={() =>
                        handleUnblock(
                          userBlock,
                        )
                      }
                      disabled={
                        unblockingId ===
                        userBlock.id
                      }
                    >
                      {unblockingId ===
                      userBlock.id
                        ? 'Unblocking…'
                        : 'Unblock'}
                    </button>
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// ========================================
// RESPONSE HELPERS
// ========================================

function normaliseBlocks(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (
    Array.isArray(
      data.user_blocks,
    )
  ) {
    return data.user_blocks
  }

  if (
    Array.isArray(
      data.blocks,
    )
  ) {
    return data.blocks
  }

  return []
}

function blockedUserFrom(
  userBlock,
) {
  return (
    userBlock.blocked_user ||
    userBlock.blockedUser ||
    userBlock.user ||
    {}
  )
}

function displayName(user) {
  const fullName = [
    user?.first_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return (
    fullName ||
    user?.email ||
    'MatchMuster member'
  )
}

async function readResponse(
  response,
) {
  const responseText =
    await response.text()

  if (!responseText) {
    return {}
  }

  try {
    return JSON.parse(
      responseText,
    )
  } catch {
    return {}
  }
}

function getErrorMessage(
  data,
  fallbackMessage,
) {
  if (
    Array.isArray(data.errors)
  ) {
    return data.errors.join(', ')
  }

  return (
    data.error ||
    data.message ||
    fallbackMessage
  )
}

export default BlockedUsersModal
