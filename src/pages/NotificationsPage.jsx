import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './NotificationsPage.css'
import API_URL from '../config/api'

const AVAILABILITY_NOTIFICATION_TYPES = [
  'fixture_created',
  'availability_required',
  'availability_reminder',
]

function UpdatesPage() {
  const [updates, setUpdates] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [teamId, setTeamId] = useState(null)

  const [selectedUpdate, setSelectedUpdate] =
    useState(null)

  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadUpdates()
    loadTeam()
    loadCurrentUser()
  }, [])

  function authorizationHeaders() {
    const token = localStorage.getItem('token')

    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: token,
    }
  }

  async function loadTeam() {
    const token = localStorage.getItem('token')

    if (!token) return

    try {
      const response = await fetch(
        `${API_URL}/teams`,
        {
          headers: authorizationHeaders(),
        },
      )

      if (!response.ok) return

      const data = await response.json()

      const teams = Array.isArray(data)
        ? data
        : data.teams || []

      setTeamId(teams[0]?.id || null)
    } catch {
      // Updates can still be displayed if this request fails.
    }
  }

  async function loadCurrentUser() {
    const token = localStorage.getItem('token')

    if (!token) return

    try {
      const response = await fetch(
        `${API_URL}/users/me`,
        {
          headers: authorizationHeaders(),
        },
      )

      if (!response.ok) return

      const data = await response.json()

      setCurrentUser(data.user || data)
    } catch {
      // Updates can still be displayed if this request fails.
    }
  }

  async function loadUpdates() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/notifications`,
        {
          headers: authorizationHeaders(),
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to load your updates.',
        )
      }

      const data = await response.json()

      const notificationList =
        Array.isArray(data)
          ? data
          : data.notifications || []

      setUpdates(notificationList)
    } catch (requestError) {
      setError(
        requestError.message ||
          'Unable to load your updates.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function openUpdate(update) {
    setSelectedUpdate(update)

    if (
      update.opened_at ||
      update.read
    ) {
      return
    }

    const openedAt =
      new Date().toISOString()

    setUpdates((currentUpdates) =>
      currentUpdates.map((item) =>
        item.id === update.id
          ? {
              ...item,
              read: true,
              opened_at: openedAt,
            }
          : item,
      ),
    )

    setSelectedUpdate(
      (currentSelected) =>
        currentSelected?.id === update.id
          ? {
              ...currentSelected,
              read: true,
              opened_at: openedAt,
            }
          : currentSelected,
    )

    try {
      const response = await fetch(
        `${API_URL}/notifications/${update.id}`,
        {
          method: 'PATCH',

          headers: authorizationHeaders(),

          body: JSON.stringify({
            notification: {
              opened: true,
            },
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to record this update as opened.',
        )
      }

      const savedUpdate =
        await response.json()

      setUpdates((currentUpdates) =>
        currentUpdates.map((item) =>
          item.id === savedUpdate.id
            ? {
                ...item,
                ...savedUpdate,
              }
            : item,
        ),
      )

      setSelectedUpdate(
        (currentSelected) =>
          currentSelected?.id ===
          savedUpdate.id
            ? {
                ...currentSelected,
                ...savedUpdate,
              }
            : currentSelected,
      )
    } catch (requestError) {
      setError(
        requestError.message ||
          'Unable to record this update as opened.',
      )

      await loadUpdates()
    }
  }

  async function toggleKept(update) {
    const keeping =
      !update.kept_at

    setActionId(update.id)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/notifications/${update.id}`,
        {
          method: 'PATCH',

          headers: authorizationHeaders(),

          body: JSON.stringify({
            notification: {
              kept: keeping,
            },
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          keeping
            ? 'Unable to keep this update.'
            : 'Unable to remove this update from kept.',
        )
      }

      const savedUpdate =
        await response.json()

      setUpdates((currentUpdates) =>
        currentUpdates.map((item) =>
          item.id === savedUpdate.id
            ? {
                ...item,
                ...savedUpdate,
              }
            : item,
        ),
      )

      setSelectedUpdate(
        (currentSelected) =>
          currentSelected?.id ===
          savedUpdate.id
            ? {
                ...currentSelected,
                ...savedUpdate,
              }
            : currentSelected,
      )
    } catch (requestError) {
      setError(
        requestError.message ||
          'Unable to update this item.',
      )
    } finally {
      setActionId(null)
    }
  }

  async function deleteUpdate(
    notificationId,
  ) {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this update?',
      )

    if (!confirmed) return

    setActionId(notificationId)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}`,
        {
          method: 'DELETE',
          headers: authorizationHeaders(),
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to delete this update.',
        )
      }

      setUpdates((currentUpdates) =>
        currentUpdates.filter(
          (update) =>
            update.id !==
            notificationId,
        ),
      )

      setSelectedUpdate(
        (currentSelected) =>
          currentSelected?.id ===
          notificationId
            ? null
            : currentSelected,
      )
    } catch (requestError) {
      setError(
        requestError.message ||
          'Unable to delete this update.',
      )
    } finally {
      setActionId(null)
    }
  }

  function formatDate(date) {
    if (!date) return ''

    const parsedDate =
      new Date(date)

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(parsedDate)
  }

  function updateTitle(update) {
    return (
      update.post?.title ||
      update.title ||
      update.notification_type?.replaceAll(
        '_',
        ' ',
      ) ||
      'MatchMuster update'
    )
  }

  function updateMessage(update) {
    return (
      update.post?.content ||
      update.message ||
      update.body ||
      update.content ||
      'You have a new update.'
    )
  }

  function isUnread(update) {
    return (
      !update.opened_at &&
      !update.read
    )
  }

  function getMatchId(update) {
    if (!update) return null

    return (
      update.match_id ||
      update.match?.id ||
      null
    )
  }

  function getUpdateTeamId(update) {
    if (!update) return teamId

    return (
      update.team_id ||
      update.match?.team_id ||
      teamId
    )
  }

  function getMatchPaymentId(update) {
    return (
      update?.match_payment_id ||
      update?.match_payment?.id ||
      null
    )
  }

  function canRespondToAvailability(
    update,
  ) {
    const updateTeamId =
      getUpdateTeamId(update)

    const updateMatchId =
      getMatchId(update)

    return (
      currentUser?.account_type ===
        'player' &&

      AVAILABILITY_NOTIFICATION_TYPES.includes(
        update.notification_type,
      ) &&

      !update.availability_submitted &&

      Boolean(
        updateMatchId &&
          updateTeamId,
      )
    )
  }

  function canViewPayment(update) {
    return (
      currentUser?.account_type ===
        'player' &&

      update?.notification_type ===
        'match_payment_requested' &&

      Boolean(
        getMatchPaymentId(update) &&
          getMatchId(update) &&
          getUpdateTeamId(update),
      )
    )
  }

  const unreadCount =
    updates.filter(
      isUnread,
    ).length

  const filteredUpdates =
    updates.filter((update) => {
      if (
        filter === 'unread'
      ) {
        return isUnread(update)
      }

      if (
        filter === 'kept'
      ) {
        return Boolean(
          update.kept_at,
        )
      }

      return true
    })

  const selectedTeamId =
    getUpdateTeamId(
      selectedUpdate,
    )

  const selectedMatchId =
    getMatchId(
      selectedUpdate,
    )

  return (
    <>
      <Navbar teamId={teamId} />

      <main className="updates-page">
        <section className="updates-container">
          <div className="updates-heading">
            <div>
              <p className="updates-eyebrow">
                MATCHMUSTER
              </p>

              <h1>Updates</h1>

              <p className="updates-description">
                Keep track of squad selections,
                match changes, payments and team
                announcements.
              </p>
            </div>

            <div className="updates-summary">
              <span>
                {unreadCount}
              </span>

              <p>
                {unreadCount === 1
                  ? 'Unread update'
                  : 'Unread updates'}
              </p>
            </div>
          </div>

          <div
            className="updates-filters"
            aria-label="Filter updates"
          >
            {[
              'all',
              'unread',
              'kept',
            ].map(
              (filterName) => (
                <button
                  key={
                    filterName
                  }
                  type="button"
                  className={
                    filter ===
                    filterName
                      ? 'updates-filter-active'
                      : ''
                  }
                  onClick={() =>
                    setFilter(
                      filterName,
                    )
                  }
                >
                  {filterName}
                </button>
              ),
            )}
          </div>

          {error && (
            <div
              className="updates-error"
              role="alert"
            >
              <span>
                {error}
              </span>

              <button
                type="button"
                onClick={
                  loadUpdates
                }
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="updates-status">
              <div className="updates-spinner" />

              <p>
                Loading your updates...
              </p>
            </div>
          ) : updates.length ===
            0 ? (
            <div className="updates-empty">
              <div className="updates-empty-icon">
                ✓
              </div>

              <h2>
                You’re all caught up
              </h2>

              <p>
                New match, squad member
                and payment updates will
                appear here.
              </p>
            </div>
          ) : filteredUpdates.length ===
            0 ? (
            <div className="updates-empty">
              <div className="updates-empty-icon">
                ✓
              </div>

              <h2>
                No {filter} updates
              </h2>

              <p>
                There are currently no
                updates in this section.
              </p>
            </div>
          ) : (
            <div className="updates-list">
              {filteredUpdates.map(
                (update) => {
                  const unread =
                    isUnread(update)

                  return (
                    <article
                      key={update.id}
                      className={`update-card ${
                        unread
                          ? ''
                          : 'update-card-read'
                      }`}
                      onClick={() =>
                        openUpdate(
                          update,
                        )
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                            'Enter' ||
                          event.key ===
                            ' '
                        ) {
                          event.preventDefault()

                          openUpdate(
                            update,
                          )
                        }
                      }}
                    >
                      <div
                        className={`update-status-dot ${
                          unread
                            ? ''
                            : 'update-status-dot-read'
                        }`}
                        aria-hidden="true"
                      />

                      <div className="update-card-content">
                        <div className="update-card-heading">
                          <h2>
                            {updateTitle(
                              update,
                            )}
                          </h2>

                          {unread && (
                            <span className="update-unread-label">
                              New
                            </span>
                          )}

                          {update.kept_at && (
                            <span className="update-kept-label">
                              Kept
                            </span>
                          )}
                        </div>

                        <p className="update-message">
                          {updateMessage(
                            update,
                          )}
                        </p>

                        <time
                          className="update-time"
                          dateTime={
                            update.created_at
                          }
                        >
                          {formatDate(
                            update.created_at,
                          )}
                        </time>
                      </div>

                      <span
                        className="update-open-label"
                        aria-hidden="true"
                      >
                        View
                      </span>
                    </article>
                  )
                },
              )}
            </div>
          )}
        </section>
      </main>

      {selectedUpdate && (
        <div
          className="update-modal-backdrop"
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedUpdate(
                null,
              )
            }
          }}
        >
          <section
            className="update-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-modal-title"
          >
            <div className="update-modal-header">
              <div>
                <p className="updates-eyebrow">
                  {selectedUpdate
                    .post?.post_type ||
                    selectedUpdate.notification_type?.replaceAll(
                      '_',
                      ' ',
                    ) ||
                    'Update'}
                </p>

                <h2 id="update-modal-title">
                  {updateTitle(
                    selectedUpdate,
                  )}
                </h2>
              </div>

              <button
                className="update-modal-close"
                type="button"
                aria-label="Close update"
                onClick={() =>
                  setSelectedUpdate(
                    null,
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="update-modal-meta">
              {selectedUpdate.post
                ?.author_name && (
                <span>
                  By{' '}
                  {
                    selectedUpdate
                      .post
                      .author_name
                  }
                </span>
              )}

              <time
                dateTime={
                  selectedUpdate.created_at
                }
              >
                {formatDate(
                  selectedUpdate.created_at,
                )}
              </time>
            </div>

            <div className="update-modal-message">
              <p>
                {updateMessage(
                  selectedUpdate,
                )}
              </p>
            </div>

            {selectedUpdate.kept_at && (
              <p className="update-kept-note">
                This update has been kept
                and will remain in your
                Kept section.
              </p>
            )}

            <div className="update-modal-actions">
              {canRespondToAvailability(
                selectedUpdate,
              ) && (
                <Link
                  className="update-availability-button"
                  to={`/teams/${selectedTeamId}/matches/${selectedMatchId}/availabilities/confirm`}
                  onClick={() =>
                    setSelectedUpdate(
                      null,
                    )
                  }
                >
                  Submit availability
                </Link>
              )}

              {canViewPayment(
                selectedUpdate,
              ) && (
                <Link
                  className="update-availability-button update-payment-button"
                  to={`/teams/${selectedTeamId}/matches/${selectedMatchId}/payments`}
                  onClick={() =>
                    setSelectedUpdate(
                      null,
                    )
                  }
                >
                  View payment &amp; pay
                </Link>
              )}

              <button
                className="update-keep-button"
                type="button"
                onClick={() =>
                  toggleKept(
                    selectedUpdate,
                  )
                }
                disabled={
                  actionId ===
                  selectedUpdate.id
                }
              >
                {actionId ===
                selectedUpdate.id
                  ? 'Saving...'
                  : selectedUpdate.kept_at
                    ? 'Remove from kept'
                    : 'Keep update'}
              </button>

              <button
                className="update-delete-button"
                type="button"
                onClick={() =>
                  deleteUpdate(
                    selectedUpdate.id,
                  )
                }
                disabled={
                  actionId ===
                  selectedUpdate.id
                }
              >
                Delete
              </button>

              <button
                className="update-modal-done"
                type="button"
                onClick={() =>
                  setSelectedUpdate(
                    null,
                  )
                }
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default UpdatesPage
