import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  ArrowRight,
  Bell,
  BellRing,
  Bookmark,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  CreditCard,
  FileText,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

import Navbar from '../components/Navbar'
import './NotificationsPage.css'
import './NotificationsPage.mobile.css'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const TYPE_META = {
  announcement: {
    label: 'Announcement',
    tone: 'pink',
    icon: Megaphone,
    defaultTitle:
      'New team announcement',
  },

  tactical_post: {
    label: 'Tactical update',
    tone: 'blue',
    icon: FileText,
    defaultTitle:
      'New tactical update',
  },

  post_created: {
    label: 'Team post',
    tone: 'blue',
    icon: FileText,
    defaultTitle:
      'New team post',
  },

  training_availability_updated: {
    label: 'Training response',
    tone: 'blue',
    icon: UserCheck,
    defaultTitle:
      'Training availability updated',
  },

  training_availability_reminder: {
    label: 'Training reminder',
    tone: 'amber',
    icon: BellRing,
    defaultTitle:
      'Training availability needed',
    requiresAction: true,
  },

  subscription_preview_reminder: {
    label: 'Plus',
    tone: 'blue',
    icon: BellRing,
    defaultTitle:
      'MatchMuster Plus',
    requiresAction: true,
  },

  fixture_created: {
    label: 'Fixture',
    tone: 'blue',
    icon: CalendarClock,
    defaultTitle:
      'New fixture added',
    requiresAction: true,
  },

  fixture_updated: {
    label: 'Fixture changed',
    tone: 'amber',
    icon: CalendarClock,
    defaultTitle:
      'Fixture details changed',
  },

  fixture_cancelled: {
    label: 'Fixture cancelled',
    tone: 'red',
    icon: CircleAlert,
    defaultTitle:
      'Fixture cancelled',
  },

  availability_required: {
    label: 'Availability',
    tone: 'pink',
    icon: UserCheck,
    defaultTitle:
      'Are you available?',
    requiresAction: true,
  },

  availability_reminder: {
    label:
      'Availability reminder',
    tone: 'amber',
    icon: BellRing,
    defaultTitle:
      'Availability needed',
    requiresAction: true,
  },

  player_availability_updated: {
    label: 'Player response',
    tone: 'blue',
    icon: UserCheck,
    defaultTitle:
      'Player availability updated',
  },

  squad_selected: {
    label: 'Squad',
    tone: 'pink',
    icon: Users,
    defaultTitle:
      'Squad selected',
  },

  squad_updated: {
    label: 'Squad changed',
    tone: 'blue',
    icon: Users,
    defaultTitle:
      'Squad selection updated',
  },

  match_payment_requested: {
    label: 'Payment request',
    tone: 'pink',
    icon: CreditCard,
    defaultTitle:
      'Match payment requested',
    requiresAction: true,
  },

  match_payment_paid: {
    label: 'Payment received',
    tone: 'green',
    icon: CheckCheck,
    defaultTitle:
      'Match payment received',
  },

  match_payment_waived: {
    label: 'Payment waived',
    tone: 'green',
    icon: WalletCards,
    defaultTitle:
      'Match payment waived',
  },

  match_payment_amount_changed: {
    label: 'Payment changed',
    tone: 'amber',
    icon: CreditCard,
    defaultTitle:
      'Match payment updated',
    requiresAction: true,
  },

  match_payment_reminder: {
    label: 'Payment reminder',
    tone: 'amber',
    icon: CreditCard,
    defaultTitle:
      'Match payment reminder',
    requiresAction: true,
  },

  join_request_received: {
    label: 'Join request',
    tone: 'pink',
    icon: UserPlus,
    defaultTitle:
      'New player join request',
    requiresAction: true,
  },

  membership_approved: {
    label: 'Team membership',
    tone: 'green',
    icon: UserCheck,
    defaultTitle:
      'You have joined the team',
  },

  membership_rejected: {
    label: 'Team membership',
    tone: 'red',
    icon: CircleAlert,
    defaultTitle:
      'Team request update',
  },

  player_joined: {
    label: 'Squad member',
    tone: 'green',
    icon: UserPlus,
    defaultTitle:
      'A player joined your squad',
  },

  team_updated: {
    label: 'Team update',
    tone: 'blue',
    icon: Users,
    defaultTitle:
      'Team details updated',
  },

  team_join_requested: {
    label: 'Join request',
    tone: 'pink',
    icon: UserPlus,
    defaultTitle:
      'New player join request',
    requiresAction: true,
  },

  team_join_approved: {
    label: 'Team membership',
    tone: 'green',
    icon: UserCheck,
    defaultTitle:
      'Team request approved',
  },

  team_join_rejected: {
    label: 'Team membership',
    tone: 'red',
    icon: CircleAlert,
    defaultTitle:
      'Team request update',
  },

  team_membership_removed: {
    label: 'Team membership',
    tone: 'red',
    icon: CircleAlert,
    defaultTitle:
      'Team membership update',
  },

  motm_voting_open: {
    label: 'Player of the match',
    tone: 'amber',
    icon: Trophy,
    defaultTitle:
      'Vote for player of the match',
    requiresAction: true,
  },

  motm_vote_received: {
    label: 'MOTM vote',
    tone: 'blue',
    icon: Star,
    defaultTitle:
      'A player submitted an MOTM vote',
  },

  motm_announced: {
    label: 'Player of the match',
    tone: 'amber',
    icon: Trophy,
    defaultTitle:
      'Player of the match announced',
  },

  match_rating_open: {
    label: 'Player of the match',
    tone: 'amber',
    icon: Trophy,
    defaultTitle:
      'Vote for player of the match',
    requiresAction: true,
  },

  match_rating_reminder: {
    label: 'Player of the match',
    tone: 'amber',
    icon: BellRing,
    defaultTitle:
      'Player ratings reminder',
    requiresAction: true,
  },

  man_of_the_match: {
    label: 'Player of the match',
    tone: 'amber',
    icon: Trophy,
    defaultTitle:
      'Player of the match announced',
  },

  match_rating_result: {
    label: 'Player of the match',
    tone: 'amber',
    icon: Trophy,
    defaultTitle:
      'Player ratings result',
  },

  manager_status_updated: {
    label: 'Account update',
    tone: 'blue',
    icon: ShieldCheck,
    defaultTitle:
      'Manager account update',
  },

  app_update: {
    label: 'MatchMuster update',
    tone: 'brand',
    icon: Sparkles,
    defaultTitle:
      'What’s new in MatchMuster',
  },
}

const DEFAULT_META = {
  label: 'MatchMuster',
  tone: 'blue',
  icon: Bell,
  defaultTitle:
    'MatchMuster notification',
}

const FILTERS = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'unread',
    label: 'Unread',
  },
  {
    value: 'action',
    label: 'Needs action',
  },
  {
    value: 'kept',
    label: 'Saved',
  },
]

const MOTM_ACTION_TYPES = [
  'motm_voting_open',
  'match_rating_open',
  'match_rating_reminder',
]

const MOTM_ACTION_WINDOW_MS =
  2 * 60 * 60 * 1000

const MOTM_CLOSE_AFTER_KICKOFF_MS =
  4 * 60 * 60 * 1000

const AVAILABILITY_ACTION_TYPES = [
  'fixture_created',
  'availability_required',
  'availability_reminder',
]

const PAYMENT_NOTIFICATION_TYPES = [
  'match_payment_requested',
  'match_payment_amount_changed',
  'match_payment_reminder',
  'match_payment_paid',
  'match_payment_waived',
]

const PAYMENT_ACTION_REQUEST_TYPES = [
  'match_payment_requested',
  'match_payment_amount_changed',
  'match_payment_reminder',
]

const JOIN_REQUEST_ACTION_TYPES = [
  'join_request_received',
  'team_join_requested',
]

function joinRequestResolution(
  notification,
) {
  if (
    !JOIN_REQUEST_ACTION_TYPES.includes(
      notification
        ?.notification_type,
    )
  ) {
    return null
  }

  const status =
    [
      notification?.team_membership
        ?.status,
      notification?.membership
        ?.status,
      notification?.join_request
        ?.status,
      notification
        ?.membership_status,
      notification
        ?.join_request_status,
      notification?.metadata
        ?.membership_status,
      notification?.metadata
        ?.join_request_status,
      notification?.data
        ?.membership_status,
      notification?.data
        ?.join_request_status,
    ]
      .find(
        (value) =>
          typeof value ===
            'string' &&
          value.trim(),
      )
      ?.trim()
      .toLowerCase()

  if (
    [
      'approved',
      'accepted',
      'active',
    ].includes(status) ||
    notification?.approved_at ||
    notification?.team_membership
      ?.approved_at ||
    notification?.membership
      ?.approved_at ||
    notification?.join_request
      ?.approved_at
  ) {
    return 'approved'
  }

  if (
    [
      'rejected',
      'declined',
    ].includes(status) ||
    notification?.rejected_at ||
    notification?.team_membership
      ?.rejected_at ||
    notification?.membership
      ?.rejected_at ||
    notification?.join_request
      ?.rejected_at
  ) {
    return 'rejected'
  }

  if (
    [
      'cancelled',
      'canceled',
      'removed',
      'expired',
    ].includes(status) ||
    notification?.resolved_at ||
    notification?.actioned_at
  ) {
    return 'closed'
  }

  return null
}

function paymentResolution(
  notification,
) {
  if (
    !PAYMENT_NOTIFICATION_TYPES.includes(
      notification
        ?.notification_type,
    )
  ) {
    return null
  }

  if (
    notification
      .notification_type ===
    'match_payment_paid'
  ) {
    return 'paid'
  }

  if (
    notification
      .notification_type ===
    'match_payment_waived'
  ) {
    return 'waived'
  }

  const status =
    [
      notification?.match_payment
        ?.status,
      notification?.payment
        ?.status,
      notification
        ?.payment_status,
      notification
        ?.match_payment_status,
      notification?.metadata
        ?.payment_status,
      notification?.data
        ?.payment_status,
    ]
      .find(
        (value) =>
          typeof value ===
            'string' &&
          value.trim(),
      )
      ?.trim()
      .toLowerCase()

  if (
    [
      'paid',
      'succeeded',
      'complete',
      'completed',
    ].includes(status) ||
    notification?.paid_at ||
    notification?.match_payment
      ?.paid_at ||
    notification?.payment
      ?.paid_at
  ) {
    return 'paid'
  }

  if (
    status === 'waived' ||
    notification?.waived_at ||
    notification?.match_payment
      ?.waived_at ||
    notification?.payment
      ?.waived_at
  ) {
    return 'waived'
  }

  if (
    [
      'cancelled',
      'canceled',
      'refunded',
      'void',
      'voided',
    ].includes(status)
  ) {
    return 'closed'
  }

  return null
}

function isAvailabilityFixtureCancelled(
  notification,
) {
  const status =
    [
      notification?.match
        ?.status,
      notification
        ?.match_status,
      notification?.metadata
        ?.match_status,
      notification?.data
        ?.match_status,
    ]
      .find(
        (value) =>
          typeof value ===
            'string' &&
          value.trim(),
      )
      ?.trim()
      .toLowerCase()

  return Boolean(
    [
      'cancelled',
      'canceled',
    ].includes(status) ||
      notification?.match
        ?.cancelled === true ||
      notification?.match
        ?.is_cancelled === true ||
      notification
        ?.match_cancelled === true ||
      notification?.match
        ?.cancelled_at ||
      notification
        ?.match_cancelled_at,
  )
}

function isAvailabilityActionExpired(
  notification,
  currentTime = Date.now(),
) {
  if (
    !AVAILABILITY_ACTION_TYPES.includes(
      notification
        ?.notification_type,
    )
  ) {
    return false
  }

  if (
    isAvailabilityFixtureCancelled(
      notification,
    )
  ) {
    return true
  }

  const kickoffTime =
    notification?.match
      ?.kickoff_time ||
    notification?.kickoff_time ||
    notification
      ?.match_kickoff_time ||
    notification?.metadata
      ?.kickoff_time ||
    notification?.data
      ?.kickoff_time ||
    null

  if (!kickoffTime) {
    return false
  }

  const kickoffTimestamp =
    new Date(
      kickoffTime,
    ).getTime()

  return (
    !Number.isNaN(
      kickoffTimestamp,
    ) &&
    currentTime >=
      kickoffTimestamp
  )
}

function isMotmActionNotification(
  notification,
) {
  return MOTM_ACTION_TYPES.includes(
    notification
      ?.notification_type,
  )
}

function isMotmActionExpired(
  notification,
) {
  if (
    !isMotmActionNotification(
      notification,
    )
  ) {
    return false
  }

  if (
    notification?.ratings_closed ===
      true ||
    notification?.match
      ?.ratings_closed === true ||
    notification?.ratings_closed_at ||
    notification?.match
      ?.ratings_closed_at ||
    notification
      ?.rating_window_closed_at ||
    notification?.match
      ?.rating_window_closed_at
  ) {
    return true
  }

  const explicitDeadline =
    notification?.action_expires_at ||
    notification?.voting_closes_at ||
    notification?.ratings_close_at ||
    notification?.match
      ?.voting_closes_at ||
    notification?.match
      ?.ratings_close_at ||
    notification?.match
      ?.rating_window_closes_at

  if (explicitDeadline) {
    const deadlineTime =
      new Date(
        explicitDeadline,
      ).getTime()

    if (
      !Number.isNaN(
        deadlineTime,
      )
    ) {
      return (
        Date.now() >=
        deadlineTime
      )
    }
  }

  const kickoffTime =
    notification?.match
      ?.kickoff_time ||
    notification?.kickoff_time ||
    notification
      ?.match_kickoff_time ||
    notification?.metadata
      ?.kickoff_time ||
    notification?.data
      ?.kickoff_time ||
    null

  if (kickoffTime) {
    const kickoffTimestamp =
      new Date(
        kickoffTime,
      ).getTime()

    if (
      !Number.isNaN(
        kickoffTimestamp,
      )
    ) {
      return (
        Date.now() >=
        kickoffTimestamp +
          MOTM_CLOSE_AFTER_KICKOFF_MS
      )
    }
  }

  const explicitOpenedAt =
    notification
      ?.rating_window_opened_at ||
    notification?.ratings_opened_at ||
    notification?.match
      ?.rating_window_opened_at ||
    notification?.match
      ?.ratings_opened_at ||
    notification?.match
      ?.ratings_open_at

  if (explicitOpenedAt) {
    const openedTime =
      new Date(
        explicitOpenedAt,
      ).getTime()

    if (
      !Number.isNaN(
        openedTime,
      )
    ) {
      return (
        Date.now() >=
        openedTime +
          MOTM_ACTION_WINDOW_MS
      )
    }
  }

  const createdTime =
    new Date(
      notification?.created_at,
    ).getTime()

  if (
    Number.isNaN(
      createdTime,
    )
  ) {
    return false
  }

  return (
    Date.now() >=
    createdTime +
      MOTM_ACTION_WINDOW_MS
  )
}

function authorizationHeaders(
  token,
) {
  return {
    Accept:
      'application/json',

    'Content-Type':
      'application/json',

    Authorization:
      token,
  }
}

function NotificationsPage() {
  const navigate =
    useNavigate()

  const [
    notifications,
    setNotifications,
  ] = useState([])

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    actionId,
    setActionId,
  ] = useState(null)

  const [teamId, setTeamId] =
    useState(null)

  const [
    selectedNotification,
    setSelectedNotification,
  ] = useState(null)

  const [filter, setFilter] =
    useState('all')

  const [currentTime, setCurrentTime] =
    useState(() => Date.now())

  const redirectToLogin =
    useCallback(async () => {
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

      navigate('/login', {
        replace: true,
      })
    }, [navigate])

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          isUnread,
        ).length,
      [notifications],
    )

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        'matchmuster:notifications-updated',
        {
          detail: {
            unreadCount,
          },
        },
      ),
    )
  }, [unreadCount])

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrentTime(
            Date.now(),
          )
        },
        30 * 1000,
      )

    return () =>
      window.clearInterval(
        timer,
      )
  }, [])

  useEffect(() => {
    if (
      !selectedNotification
    ) {
      return undefined
    }

    function closeOnEscape(
      event,
    ) {
      if (
        event.key === 'Escape'
      ) {
        setSelectedNotification(
          null,
        )
      }
    }

    document.body.classList.add(
      'updates-modal-open',
    )

    window.addEventListener(
      'keydown',
      closeOnEscape,
    )

    return () => {
      document.body.classList.remove(
        'updates-modal-open',
      )

      window.removeEventListener(
        'keydown',
        closeOnEscape,
      )
    }
  }, [selectedNotification])

  const loadNotificationCentre =
    useCallback(
      async ({
        quiet = false,
      } = {}) => {
        quiet
          ? setRefreshing(true)
          : setLoading(true)

        setError('')

        const token =
          getAuthToken()

        if (!token) {
          await redirectToLogin()

          setLoading(false)
          setRefreshing(false)

          return
        }

        const headers =
          authorizationHeaders(
            token,
          )

        try {
          const [
            notificationResponse,
            teamResponse,
            userResponse,
          ] = await Promise.all([
            fetch(
              `${API_URL}/notifications`,
              {
                headers,
              },
            ),

            fetch(
              `${API_URL}/teams`,
              {
                headers,
              },
            ),

            fetch(
              `${API_URL}/users/me`,
              {
                headers,
              },
            ),
          ])

          if (
            notificationResponse.status ===
              401 ||
            teamResponse.status ===
              401 ||
            userResponse.status ===
              401
          ) {
            await redirectToLogin()
            return
          }

          if (
            !notificationResponse.ok
          ) {
            throw new Error(
              'Unable to load your notifications.',
            )
          }

          const notificationData =
            await notificationResponse.json()

          setNotifications(
            Array.isArray(
              notificationData,
            )
              ? notificationData
              : notificationData.notifications ||
                  [],
          )

          if (teamResponse.ok) {
            const teamData =
              await teamResponse.json()

            const teams =
              Array.isArray(teamData)
                ? teamData
                : teamData.teams ||
                  []

            setTeamId(
              teams[0]?.id ||
                null,
            )
          }

          if (userResponse.ok) {
            const userData =
              await userResponse.json()

            setCurrentUser(
              userData.user ||
                userData,
            )
          }
        } catch (
          requestError
        ) {
          setError(
            requestError.message ||
              'Unable to load your notifications.',
          )
        } finally {
          setLoading(false)
          setRefreshing(false)
        }
      },
      [redirectToLogin],
    )

  useEffect(() => {
    const loadTimer =
      window.setTimeout(() => {
        loadNotificationCentre()
      }, 0)

    return () =>
      window.clearTimeout(
        loadTimer,
      )
  }, [loadNotificationCentre])

  function updateNotificationLocally(
    notificationId,
    attributes,
  ) {
    setNotifications(
      (
        currentNotifications,
      ) =>
        currentNotifications.map(
          (notification) =>
            notification.id ===
            notificationId
              ? {
                  ...notification,
                  ...attributes,
                }
              : notification,
        ),
    )

    setSelectedNotification(
      (currentSelected) =>
        currentSelected?.id ===
        notificationId
          ? {
              ...currentSelected,
              ...attributes,
            }
          : currentSelected,
    )
  }

  async function markNotificationOpened(
    notification,
  ) {
    if (
      !notification ||
      !isUnread(notification)
    ) {
      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()
      return
    }

    const openedAt =
      new Date().toISOString()

    updateNotificationLocally(
      notification.id,
      {
        read: true,
        opened_at:
          openedAt,
      },
    )

    try {
      const response =
        await fetch(
          `${API_URL}/notifications/${notification.id}`,
          {
            method: 'PATCH',

            headers:
              authorizationHeaders(
                token,
              ),

            body:
              JSON.stringify({
                notification: {
                  opened: true,
                },
              }),
          },
        )

      if (
        response.status === 401
      ) {
        await redirectToLogin()
        return
      }

      if (!response.ok) {
        throw new Error(
          'Unable to mark this notification as read.',
        )
      }

      const savedNotification =
        await response.json()

      updateNotificationLocally(
        notification.id,
        savedNotification,
      )
    } catch (
      requestError
    ) {
      setError(
        requestError.message ||
          'Unable to mark this notification as read.',
      )

      await loadNotificationCentre({
        quiet: true,
      })
    }
  }

  async function openNotification(
    notification,
  ) {
    markNotificationOpened(
      notification,
    )

    setSelectedNotification(
      notification,
    )
  }

  async function markAllRead() {
    const unreadNotifications =
      notifications.filter(
        isUnread,
      )

    if (
      unreadNotifications.length ===
      0
    ) {
      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()
      return
    }

    setActionId('mark-all')
    setError('')

    const openedAt =
      new Date().toISOString()

    setNotifications(
      (
        currentNotifications,
      ) =>
        currentNotifications.map(
          (notification) =>
            isUnread(notification)
              ? {
                  ...notification,
                  read: true,
                  opened_at:
                    openedAt,
                }
              : notification,
        ),
    )

    try {
      const collectionResponse =
        await fetch(
          `${API_URL}/notifications/mark_all_read`,
          {
            method: 'PATCH',

            headers:
              authorizationHeaders(
                token,
              ),

            body:
              JSON.stringify({}),
          },
        )

      if (
        collectionResponse.status ===
        401
      ) {
        await redirectToLogin()
        return
      }

      if (
        !collectionResponse.ok
      ) {
        await Promise.all(
          unreadNotifications.map(
            async (
              notification,
            ) => {
              const response =
                await fetch(
                  `${API_URL}/notifications/${notification.id}`,
                  {
                    method:
                      'PATCH',

                    headers:
                      authorizationHeaders(
                        token,
                      ),

                    body:
                      JSON.stringify({
                        notification: {
                          opened:
                            true,
                        },
                      }),
                  },
                )

              if (
                response.status ===
                401
              ) {
                await redirectToLogin()

                throw new Error(
                  'Session expired.',
                )
              }

              if (
                !response.ok
              ) {
                throw new Error(
                  'Unable to mark every notification as read.',
                )
              }
            },
          ),
        )
      }
    } catch (
      requestError
    ) {
      setError(
        requestError.message ||
          'Unable to mark every notification as read.',
      )

      await loadNotificationCentre({
        quiet: true,
      })
    } finally {
      setActionId(null)
    }
  }

  async function toggleKept(
    notification,
  ) {
    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()
      return
    }

    const keeping =
      !notification.kept_at

    setActionId(
      notification.id,
    )

    setError('')

    try {
      const response =
        await fetch(
          `${API_URL}/notifications/${notification.id}`,
          {
            method: 'PATCH',

            headers:
              authorizationHeaders(
                token,
              ),

            body:
              JSON.stringify({
                notification: {
                  kept: keeping,
                },
              }),
          },
        )

      if (
        response.status === 401
      ) {
        await redirectToLogin()
        return
      }

      if (!response.ok) {
        throw new Error(
          keeping
            ? 'Unable to save this notification.'
            : 'Unable to remove this notification from saved.',
        )
      }

      const savedNotification =
        await response.json()

      updateNotificationLocally(
        notification.id,
        savedNotification,
      )
    } catch (
      requestError
    ) {
      setError(
        requestError.message ||
          'Unable to update this notification.',
      )
    } finally {
      setActionId(null)
    }
  }

  async function deleteNotification(
    notificationId,
  ) {
    const confirmed =
      window.confirm(
        'Delete this notification? This cannot be undone.',
      )

    if (!confirmed) return

    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()
      return
    }

    setActionId(
      notificationId,
    )

    setError('')

    try {
      const response =
        await fetch(
          `${API_URL}/notifications/${notificationId}`,
          {
            method:
              'DELETE',

            headers:
              authorizationHeaders(
                token,
              ),
          },
        )

      if (
        response.status === 401
      ) {
        await redirectToLogin()
        return
      }

      if (!response.ok) {
        throw new Error(
          'Unable to delete this notification.',
        )
      }

      setNotifications(
        (
          currentNotifications,
        ) =>
          currentNotifications.filter(
            (notification) =>
              notification.id !==
              notificationId,
          ),
      )

      setSelectedNotification(
        null,
      )
    } catch (
      requestError
    ) {
      setError(
        requestError.message ||
          'Unable to delete this notification.',
      )
    } finally {
      setActionId(null)
    }
  }

  function notificationMeta(
    notification,
  ) {
    return (
      TYPE_META[
        notification
          ?.notification_type
      ] ||
      DEFAULT_META
    )
  }

  function playerIsNotSelected(
    notification,
  ) {
    if (
      currentUser?.account_type !==
        'player' ||
      notification
        ?.notification_type !==
        'squad_updated' ||
      !Array.isArray(
        notification
          ?.game_squad,
      )
    ) {
      return false
    }

    return !notification
      .game_squad
      .some(
        (selection) =>
          String(
            selection.user_id ||
              selection.user?.id,
          ) ===
          String(
            currentUser.id,
          ),
      )
  }

  function notificationTitle(
    notification,
  ) {
    if (
      playerIsNotSelected(
        notification,
      )
    ) {
      return 'Not selected for this fixture'
    }

    return (
      notification.post?.title ||
      notification.title ||
      notificationMeta(
        notification,
      ).defaultTitle
    )
  }

  function notificationMessage(
    notification,
  ) {
    if (
      playerIsNotSelected(
        notification,
      )
    ) {
      const opponent =
        notification
          ?.match?.opponent

      return opponent
        ? `You are not in the Matchday squad for the fixture against ${opponent}.`
        : 'You are not in the Matchday squad for this fixture.'
    }

    return notificationMessageText(
      notification,
    )
  }

  function getMatchId(
    notification,
  ) {
    return (
      notification?.match_id ||
      notification?.match?.id ||
      null
    )
  }

  function getTrainingId(
    notification,
  ) {
    return (
      notification?.training_id ||
      notification?.training?.id ||
      null
    )
  }

  function getPostId(
    notification,
  ) {
    return (
      notification?.post_id ||
      notification?.post?.id ||
      null
    )
  }

  function getNotificationTeamId(
    notification,
  ) {
    return (
      notification?.team_id ||
      notification?.match
        ?.team_id ||
      notification?.post
        ?.team_id ||
      notification?.training
        ?.team_id ||
      teamId ||
      null
    )
  }

  function notificationAction(
    notification,
  ) {
    if (!notification) {
      return null
    }

    const type =
      notification.notification_type

    const role =
      currentUser?.account_type

    const notificationTeamId =
      getNotificationTeamId(
        notification,
      )

    const matchId =
      getMatchId(
        notification,
      )

    const postId =
      getPostId(
        notification,
      )

    const trainingId =
      getTrainingId(
        notification,
      )

    if (
      [
        'training_availability_reminder',
        'training_availability_updated',
      ].includes(type) &&
      notificationTeamId &&
      trainingId
    ) {
      return {
        label:
          role === 'player'
            ? 'Set availability'
            : 'View training',

        path:
          `/teams/${notificationTeamId}/trainings/${trainingId}`,

        icon:
          CalendarClock,
      }
    }

    if (
      type ===
        'subscription_preview_reminder' &&
      notificationTeamId &&
      role === 'manager'
    ) {
      return {
        label:
          'View Plus',

        path:
          `/teams/${notificationTeamId}/subscription`,

        icon:
          BellRing,
      }
    }

    if (
      AVAILABILITY_ACTION_TYPES.includes(
        type,
      ) &&
      notificationTeamId &&
      matchId &&
      !isAvailabilityActionExpired(
        notification,
        currentTime,
      )
    ) {
      return {
        label:
          'Set availability',

        path:
          `/teams/${notificationTeamId}/matches/${matchId}/availabilities/confirm`,

        icon:
          UserCheck,
      }
    }

    if (
      role === 'manager' &&
      type ===
        'player_availability_updated' &&
      notificationTeamId &&
      matchId
    ) {
      return {
        label:
          'View match',

        path:
          `/teams/${notificationTeamId}/matches/${matchId}`,

        icon:
          CalendarClock,
      }
    }

    if (
      PAYMENT_NOTIFICATION_TYPES.includes(
        type,
      ) &&
      notificationTeamId &&
      matchId &&
      !paymentResolution(
        notification,
      )
    ) {
      const playerNeedsToPay =
        role === 'player' &&
        [
          'match_payment_requested',
          'match_payment_amount_changed',
          'match_payment_reminder',
        ].includes(type)

      return {
        label:
          playerNeedsToPay
            ? 'View and pay'
            : 'View payments',

        path:
          `/teams/${notificationTeamId}/matches/${matchId}/payments`,

        icon:
          CreditCard,
      }
    }

    if (
      JOIN_REQUEST_ACTION_TYPES.includes(
        type,
      ) &&
      notificationTeamId &&
      !joinRequestResolution(
        notification,
      )
    ) {
      return {
        label:
          'View squad',

        path:
          `/teams/${notificationTeamId}/squad`,

        icon:
          Users,
      }
    }

    if (
      type === 'player_joined' &&
      notificationTeamId
    ) {
      return {
        label:
          'View squad',

        path:
          `/teams/${notificationTeamId}/squad`,

        icon:
          Users,
      }
    }

    if (
      [
        'squad_selected',
        'squad_updated',
      ].includes(type) &&
      notificationTeamId &&
      matchId
    ) {
      return {
        label:
          'View game squad',

        path:
          `/teams/${notificationTeamId}/matches/${matchId}/squad`,

        icon:
          Users,
      }
    }

    if (
      [
        'announcement',
        'tactical_post',
        'post_created',
      ].includes(type) &&
      notificationTeamId &&
      postId
    ) {
      return {
        label:
          'View post',

        path:
          `/teams/${notificationTeamId}/posts/${postId}`,

        icon:
          FileText,
      }
    }

    if (
      [
        'fixture_updated',
        'fixture_cancelled',
      ].includes(type) &&
      notificationTeamId &&
      matchId
    ) {
      return {
        label:
          'View match',

        path:
          `/teams/${notificationTeamId}/matches/${matchId}`,

        icon:
          CalendarClock,
      }
    }

    if (
      MOTM_ACTION_TYPES.includes(
        type,
      ) &&
      notificationTeamId &&
      matchId &&
      !isMotmActionExpired(
        notification,
      )
    ) {
      return {
        label:
          'Rate players',

        path:
          `/teams/${notificationTeamId}/matches/${matchId}/ratings`,

        icon:
          Trophy,
      }
    }

    if (
      [
        'membership_approved',
        'membership_rejected',
        'team_join_approved',
        'team_join_rejected',
        'team_membership_removed',
        'team_updated',
        'manager_status_updated',
      ].includes(type)
    ) {
      return {
        label:
          'Go to dashboard',

        path:
          '/dashboard',

        icon:
          ArrowRight,
      }
    }

    return null
  }

  function notificationContextAction(
    notification,
  ) {
    if (!notification) {
      return null
    }

    const type =
      notification.notification_type

    const notificationTeamId =
      getNotificationTeamId(
        notification,
      )

    const matchId =
      getMatchId(
        notification,
      )

    if (
      [
        'fixture_created',
        'availability_required',
        'availability_reminder',
      ].includes(type) &&
      notificationTeamId &&
      matchId
    ) {
      return {
        label:
          'View match',

        path:
          `/teams/${notificationTeamId}/matches/${matchId}`,

        icon:
          CalendarClock,
      }
    }

    return null
  }

  function needsAction(
    notification,
  ) {
    if (
      isMotmActionExpired(
        notification,
      ) ||
      isAvailabilityActionExpired(
        notification,
        currentTime,
      ) ||
      paymentResolution(
        notification,
      ) ||
      joinRequestResolution(
        notification,
      )
    ) {
      return false
    }

    return Boolean(
      (
        notification.requires_action ||
        notificationMeta(
          notification,
        ).requiresAction
      ) &&
        (
          notificationAction(
            notification,
          ) ||
          isMotmNotification(
            notification,
          )
        ),
    )
  }

  const counts = {
    all:
      notifications.length,

    unread:
      notifications.filter(
        isUnread,
      ).length,

    action:
      notifications.filter(
        needsAction,
      ).length,

    kept:
      notifications.filter(
        (notification) =>
          notification.kept_at,
      ).length,
  }

  const filteredNotifications =
    (() => {
      const matchesFilter =
        notifications.filter(
          (notification) => {
            if (
              filter ===
              'unread'
            ) {
              return isUnread(
                notification,
              )
            }

            if (
              filter ===
              'action'
            ) {
              return needsAction(
                notification,
              )
            }

            if (
              filter ===
              'kept'
            ) {
              return Boolean(
                notification.kept_at,
              )
            }

            return true
          },
        )

      return [
        ...matchesFilter,
      ].sort(
        (
          first,
          second,
        ) =>
          new Date(
            second.created_at,
          ).getTime() -
          new Date(
            first.created_at,
          ).getTime(),
      )
    })()

  const groupedNotifications =
    useMemo(
      () =>
        groupNotifications(
          filteredNotifications,
        ),
      [filteredNotifications],
    )

  const selectedMeta =
    selectedNotification
      ? notificationMeta(
          selectedNotification,
        )
      : DEFAULT_META

  const selectedAction =
    selectedNotification
      ? notificationAction(
          selectedNotification,
        )
      : null

  const selectedContextAction =
    selectedNotification
      ? notificationContextAction(
          selectedNotification,
        )
      : null

  const selectedAvailabilityExpired =
    selectedNotification
      ? isAvailabilityActionExpired(
          selectedNotification,
          currentTime,
        )
      : false

  const selectedAvailabilityCancelled =
    selectedNotification
      ? isAvailabilityFixtureCancelled(
          selectedNotification,
        )
      : false

  const selectedPaymentResolution =
    selectedNotification
      ? paymentResolution(
          selectedNotification,
        )
      : null

  const selectedPaymentActionClosed =
    Boolean(
      selectedPaymentResolution &&
        PAYMENT_ACTION_REQUEST_TYPES.includes(
          selectedNotification
            ?.notification_type,
        ),
    )

  const selectedJoinRequestResolution =
    selectedNotification
      ? joinRequestResolution(
          selectedNotification,
        )
      : null

  const SelectedIcon =
    selectedMeta.icon

  const SelectedActionIcon =
    selectedAction?.icon

  const SelectedContextIcon =
    selectedContextAction?.icon

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={
          currentUser
        }
      />

      <main className="updates-page">
        <section className="updates-container">
          <header className="updates-heading">
            <div>
              <h1>
                Notifications
              </h1>

              <p className="updates-description">
                {unreadCount === 0
                  ? 'You’re all caught up'
                  : `${unreadCount} unread`}
              </p>
            </div>

            <div className="updates-heading-actions">
              <button
                className="updates-mark-read"
                type="button"
                onClick={
                  markAllRead
                }
                disabled={
                  unreadCount ===
                    0 ||
                  actionId ===
                    'mark-all'
                }
              >
                <CheckCheck
                  size={17}
                  aria-hidden="true"
                />

                {actionId ===
                'mark-all'
                  ? 'Marking…'
                  : 'Mark all read'}
              </button>

              <button
                className="updates-refresh"
                type="button"
                onClick={() =>
                  loadNotificationCentre({
                    quiet: true,
                  })
                }
                disabled={
                  refreshing
                }
                aria-label="Refresh notifications"
                title="Refresh notifications"
              >
                <RefreshCw
                  size={18}
                  className={
                    refreshing
                      ? 'updates-refresh-spinning'
                      : ''
                  }
                  aria-hidden="true"
                />
              </button>
            </div>
          </header>

          <nav
            className="updates-filters"
            aria-label="Filter notifications"
          >
            {FILTERS.map(
              (
                filterOption,
              ) => (
                <button
                  key={
                    filterOption.value
                  }
                  type="button"
                  className={
                    filter ===
                    filterOption.value
                      ? 'updates-filter-active'
                      : ''
                  }
                  onClick={() =>
                    setFilter(
                      filterOption.value,
                    )
                  }
                >
                  {
                    filterOption.label
                  }

                  <span className="updates-filter-count">
                    {
                      counts[
                        filterOption
                          .value
                      ]
                    }
                  </span>
                </button>
              ),
            )}
          </nav>

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
                onClick={() =>
                  loadNotificationCentre({
                    quiet: true,
                  })
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
                Loading your
                notifications…
              </p>
            </div>
          ) : notifications.length ===
            0 ? (
            <EmptyState
              title="You’re all caught up"
              message="Important team updates will appear here."
            />
          ) : filteredNotifications.length ===
            0 ? (
            <EmptyState
              title={`No ${FILTERS.find(
                (item) =>
                  item.value ===
                  filter,
              )?.label.toLowerCase()} notifications`}
              message="Nothing here yet."
            />
          ) : (
            <div className="notification-groups">
              {groupedNotifications.map(
                (group) => (
                  <section
                    className="notification-group"
                    key={
                      group.label
                    }
                  >
                    <h2 className="notification-group-title">
                      {
                        group.label
                      }
                    </h2>

                    <div className="updates-list">
                      {group.items.map(
                        (
                          notification,
                        ) => {
                          const meta =
                            notificationMeta(
                              notification,
                            )

                          const Icon =
                            meta.icon

                          const unread =
                            isUnread(
                              notification,
                            )

                          return (
                            <article
                              key={
                                notification.id
                              }
                              className={`update-card update-tone-${meta.tone} ${
                                unread
                                  ? 'update-card-unread'
                                  : 'update-card-read'
                              }`}
                              onClick={() =>
                                openNotification(
                                  notification,
                                )
                              }
                              role="button"
                              tabIndex={
                                0
                              }
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

                                  openNotification(
                                    notification,
                                  )
                                }
                              }}
                            >
                              <NotificationAvatar
                                notification={
                                  notification
                                }
                                meta={
                                  meta
                                }
                                Icon={
                                  Icon
                                }
                              />

                              <div className="update-card-content">
                                <div className="update-card-kicker">
                                  <span>
                                    {
                                      meta.label
                                    }
                                  </span>

                                  {unread && (
                                    <span
                                      className="update-unread-label"
                                      aria-label="Unread"
                                      title="Unread"
                                    />
                                  )}

                                  {notification.kept_at && (
                                    <span className="update-kept-label">
                                      <Bookmark
                                        size={
                                          11
                                        }
                                        aria-hidden="true"
                                      />

                                      Saved
                                    </span>
                                  )}
                                </div>

                                <div className="update-card-heading">
                                  <h3>
                                    {notificationTitle(
                                      notification,
                                    )}
                                  </h3>
                                </div>

                                <p className="update-message">
                                  {notificationMessage(
                                    notification,
                                  )}
                                </p>

                                <div className="update-card-footer">
                                  <time
                                    className="update-time"
                                    dateTime={
                                      notification.created_at
                                    }
                                    title={formatFullDate(
                                      notification.created_at,
                                    )}
                                  >
                                    {formatRelativeTime(
                                      notification.created_at,
                                    )}
                                  </time>
                                </div>
                              </div>

                              <ChevronRight
                                className="update-card-chevron"
                                size={
                                  19
                                }
                                aria-hidden="true"
                              />
                            </article>
                          )
                        },
                      )}
                    </div>
                  </section>
                ),
              )}
            </div>
          )}
        </section>
      </main>

      {selectedNotification && (
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
              setSelectedNotification(
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
              <div
                className={`update-modal-icon update-tone-${selectedMeta.tone}`}
              >
                <SelectedIcon
                  size={22}
                  aria-hidden="true"
                />
              </div>

              <div className="update-modal-heading-copy">
                <p className="updates-eyebrow">
                  {
                    selectedMeta.label
                  }
                </p>

                <h2 id="update-modal-title">
                  {selectedAvailabilityExpired
                    ? 'Availability has closed'
                    : selectedPaymentActionClosed
                      ? selectedPaymentResolution ===
                        'waived'
                        ? 'Payment waived'
                        : selectedPaymentResolution ===
                            'paid'
                          ? 'Payment completed'
                          : 'Payment closed'
                      : selectedJoinRequestResolution ===
                          'approved'
                        ? 'Join request approved'
                        : selectedJoinRequestResolution ===
                            'rejected'
                          ? 'Join request rejected'
                          : selectedJoinRequestResolution
                            ? 'Join request closed'
                    : notificationTitle(
                        selectedNotification,
                      )}
                </h2>
              </div>

              <button
                className="update-modal-close"
                type="button"
                aria-label="Close notification"
                onClick={() =>
                  setSelectedNotification(
                    null,
                  )
                }
              >
                <X
                  size={20}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="update-modal-meta">
              <span>
                {notificationSender(
                  selectedNotification,
                  selectedMeta,
                )}
              </span>

              <time
                dateTime={
                  selectedNotification.created_at
                }
              >
                {formatFullDate(
                  selectedNotification.created_at,
                )}
              </time>
            </div>

            {isMotmNotification(
              selectedNotification,
            ) ? (
              <MotmNotificationCard
                notification={
                  selectedNotification
                }
              />
            ) : isSquadNotification(
                selectedNotification,
              ) ? (
              <GameSquadNotificationCard
                notification={
                  selectedNotification
                }
              />
            ) : (
              <div className="update-modal-message">
                <p>
                  {selectedAvailabilityExpired
                    ? selectedAvailabilityCancelled
                      ? 'This fixture was cancelled. Availability can no longer be changed.'
                      : 'This fixture has started. Availability can no longer be changed.'
                    : selectedPaymentActionClosed
                      ? selectedPaymentResolution ===
                        'waived'
                        ? 'This match fee was waived. No action is needed.'
                        : selectedPaymentResolution ===
                            'paid'
                          ? 'This match fee has been paid. No action is needed.'
                          : 'This payment request is closed. No action is needed.'
                      : selectedJoinRequestResolution ===
                          'approved'
                        ? 'This player has joined the squad. No action is needed.'
                        : selectedJoinRequestResolution ===
                            'rejected'
                          ? 'This join request was rejected. No action is needed.'
                          : selectedJoinRequestResolution
                            ? 'This join request is closed. No action is needed.'
                    : notificationMessage(
                        selectedNotification,
                      )}
                </p>
              </div>
            )}

            {selectedNotification.kept_at && (
              <p className="update-kept-note">
                <Bookmark
                  size={15}
                  aria-hidden="true"
                />

                Saved for later.
              </p>
            )}

            <div className="update-modal-actions">
              {selectedAction &&
                SelectedActionIcon && (
                  <Link
                    className="update-availability-button"
                    to={
                      selectedAction.path
                    }
                    onClick={() =>
                      setSelectedNotification(
                        null,
                      )
                    }
                  >
                    <SelectedActionIcon
                      size={17}
                      aria-hidden="true"
                    />

                    {
                      selectedAction.label
                    }
                  </Link>
                )}

              {selectedContextAction &&
                SelectedContextIcon && (
                  <Link
                    className="update-context-button"
                    to={
                      selectedContextAction.path
                    }
                    onClick={() =>
                      setSelectedNotification(
                        null,
                      )
                    }
                  >
                    <SelectedContextIcon
                      size={17}
                      aria-hidden="true"
                    />

                    {
                      selectedContextAction.label
                    }
                  </Link>
                )}

              <button
                className="update-keep-button"
                type="button"
                onClick={() =>
                  toggleKept(
                    selectedNotification,
                  )
                }
                disabled={
                  actionId ===
                  selectedNotification.id
                }
              >
                <Bookmark
                  size={16}
                  aria-hidden="true"
                />

                {actionId ===
                selectedNotification.id
                  ? 'Saving…'
                  : selectedNotification.kept_at
                    ? 'Remove saved'
                    : 'Save for later'}
              </button>

              <button
                className="update-delete-button"
                type="button"
                onClick={() =>
                  deleteNotification(
                    selectedNotification.id,
                  )
                }
                disabled={
                  actionId ===
                  selectedNotification.id
                }
              >
                Delete
              </button>

            </div>
          </section>
        </div>
      )}
    </>
  )
}

function NotificationAvatar({
  notification,
  meta,
  Icon,
}) {
  const actor =
    notification.actor ||
    notification.sender

  const avatarUrl =
    actor?.avatar_url

  if (avatarUrl) {
    return (
      <div className="notification-avatar notification-avatar-photo">
        <img
          src={avatarUrl}
          alt=""
        />

        <span
          className={`notification-avatar-badge update-tone-${meta.tone}`}
        >
          <Icon
            size={12}
            aria-hidden="true"
          />
        </span>
      </div>
    )
  }

  return (
    <div
      className={`notification-avatar update-tone-${meta.tone}`}
      aria-hidden="true"
    >
      <Icon size={20} />
    </div>
  )
}

function MotmNotificationCard({
  notification,
}) {
  const featuredPlayer =
    notification.featured_user ||
    notification.motm?.winner ||
    notification.motm?.player ||
    notification.winner ||
    null

  const type =
    notification.notification_type

  const message =
    notificationMessageText(
      notification,
    )

  const winnerNames =
    motmWinnerNames(
      message,
    )

  const playerName =
    personFirstName(
      featuredPlayer,
    )

  const isWinner =
    [
      'motm_announced',
      'man_of_the_match',
    ].includes(type) ||
    (
      type ===
        'match_rating_result' &&
      Boolean(featuredPlayer)
    )

  const isVote =
    type ===
    'motm_vote_received'

  const isClosedWithoutWinner =
    type ===
      'match_rating_result' &&
    !featuredPlayer

  const actionExpired =
    isMotmActionExpired(
      notification,
    )

  const heading =
    isWinner
      ? formatMotmHeading(
          winnerNames,
        ) ||
        playerName ||
        'Player of the match announced'
      : isVote
        ? playerName ||
          'A new MOTM vote was received'
        : isClosedWithoutWinner
          ? notification.title ||
            'Player ratings closed'
          : actionExpired
            ? 'Voting has closed'
            : 'MOTM voting is open'

  const label =
    isWinner
      ? 'Player of the match'
      : isVote
        ? 'Vote received'
        : isClosedWithoutWinner
          ? 'Voting update'
          : actionExpired
            ? 'Voting update'
            : 'Time to choose your standout player'

  return (
    <article className="notification-motm-card">
      <div
        className="notification-motm-glow"
        aria-hidden="true"
      />

      <div
        className="notification-motm-trophy"
        aria-hidden="true"
      >
        <Trophy
          size={38}
          strokeWidth={1.8}
        />
      </div>

      {featuredPlayer?.avatar_url && (
        <img
          className="notification-motm-avatar"
          src={
            featuredPlayer.avatar_url
          }
          alt=""
        />
      )}

      <p>
        {label}
      </p>

      <h3>
        {heading}
      </h3>

      <div
        className="notification-motm-stars"
        aria-hidden="true"
      >
        <Star
          size={15}
          fill="currentColor"
        />

        <Star
          size={18}
          fill="currentColor"
        />

        <Star
          size={15}
          fill="currentColor"
        />
      </div>

      <span>
        {actionExpired ? (
          'This voting window has closed.'
        ) : (
          <MotmMessage
            message={message}
          />
        )}
      </span>
    </article>
  )
}

function MotmMessage({
  message,
}) {
  const winnerNames =
    motmWinnerNames(
      message,
    )

  if (!winnerNames) {
    return message
  }

  return (
    <>
      <strong className="notification-motm-winner-names">
        {winnerNames}
      </strong>

      {message.slice(
        winnerNames.length,
      )}
    </>
  )
}

function motmWinnerNames(
  message,
) {
  if (!message) return ''

  const marker = [
    ' were voted',
    ' was voted',
  ].find((text) =>
    message.includes(text),
  )

  if (!marker) return ''

  const markerIndex =
    message.indexOf(
      marker,
    )

  const names =
    message
      .slice(
        0,
        markerIndex,
      )
      .trim()

  if (
    !names ||
    names
      .toLowerCase()
      .includes(
        'congratulations',
      )
  ) {
    return ''
  }

  return names
}

function formatMotmHeading(
  winnerNames,
) {
  if (!winnerNames) {
    return ''
  }

  return winnerNames.replace(
    /,?\s+and\s+/,
    ' & ',
  )
}

function personFirstName(
  person,
) {
  if (!person) return ''

  if (
    person.first_name?.trim()
  ) {
    return person.first_name.trim()
  }

  if (
    person.name?.trim()
  ) {
    return person.name
      .trim()
      .split(/\s+/)[0]
  }

  return ''
}

function GameSquadNotificationCard({
  notification,
}) {
  const squad =
    notification.game_squad ||
    notification.match
      ?.game_squad ||
    notification.squad_selections ||
    []

  const starters =
    squad.filter(
      (selection) =>
        selection.selection_type ===
        'starter',
    )

  const substitutes =
    squad.filter(
      (selection) =>
        selection.selection_type ===
        'substitute',
    )

  const formation =
    notification.match
      ?.formation ||
    notification.formation

  return (
    <section className="notification-game-squad">
      <header>
        <div>
          <p className="updates-eyebrow">
            GAME SQUAD
          </p>

          <h3>
            {notification.match
              ?.opponent
              ? `Squad vs ${notification.match.opponent}`
              : 'Your selected squad'}
          </h3>
        </div>

        {formation && (
          <span>
            {formation}
          </span>
        )}
      </header>

      {squad.length === 0 ? (
        <div className="notification-squad-empty">
          <Users
            size={26}
            aria-hidden="true"
          />

          <strong>
            Squad details are being
            prepared
          </strong>

          <p>
            {notificationMessageText(
              notification,
            )}
          </p>
        </div>
      ) : (
        <div className="notification-squad-columns">
          <SquadList
            title="Starting XI"
            count={
              starters.length
            }
            players={
              starters
            }
          />

          <SquadList
            title="Bench"
            count={
              substitutes.length
            }
            players={
              substitutes
            }
          />
        </div>
      )}
    </section>
  )
}

function SquadList({
  title,
  count,
  players,
}) {
  return (
    <section className="notification-squad-list">
      <h4>
        {title}

        <span>
          {count}
        </span>
      </h4>

      {players.length === 0 ? (
        <p className="notification-squad-list-empty">
          No players listed yet.
        </p>
      ) : (
        <ol>
          {players.map(
            (selection) => {
              const player =
                selection.user ||
                selection.player ||
                selection

              return (
                <li
                  key={
                    selection.id ||
                    `${selection.user_id}-${selection.position}`
                  }
                >
                  <span className="notification-squad-number">
                    {selection.position ||
                      '—'}
                  </span>

                  <strong>
                    {personName(
                      player,
                    ) ||
                      'Player'}
                  </strong>

                  {selection.captain && (
                    <span className="notification-captain-badge">
                      C
                    </span>
                  )}
                </li>
              )
            },
          )}
        </ol>
      )}
    </section>
  )
}

function EmptyState({
  title,
  message,
}) {
  return (
    <div className="updates-empty">
      <div className="updates-empty-icon">
        <Check
          size={25}
          aria-hidden="true"
        />
      </div>

      <h2>
        {title}
      </h2>

      <p>
        {message}
      </p>
    </div>
  )
}

function isUnread(
  notification,
) {
  return (
    !notification.opened_at &&
    !notification.read
  )
}

function isMotmNotification(
  notification,
) {
  return [
    'motm_voting_open',
    'motm_vote_received',
    'motm_announced',
    'match_rating_open',
    'match_rating_reminder',
    'man_of_the_match',
    'match_rating_result',
  ].includes(
    notification
      ?.notification_type,
  )
}

function isSquadNotification(
  notification,
) {
  return [
    'squad_selected',
    'squad_updated',
  ].includes(
    notification
      ?.notification_type,
  )
}

function notificationMessageText(
  notification,
) {
  return (
    notification?.post?.content ||
    notification?.message ||
    notification?.body ||
    notification?.content ||
    'You have a new MatchMuster notification.'
  )
}

function personName(person) {
  if (!person) return ''

  if (
    person.name?.trim()
  ) {
    return person.name.trim()
  }

  return [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function notificationSender(
  notification,
  meta,
) {
  const actor =
    notification.actor ||
    notification.sender

  const actorName =
    actor
      ? [
          actor.first_name,
          actor.last_name,
        ]
          .filter(Boolean)
          .join(' ')
      : ''

  return (
    actorName ||
    notification.post
      ?.author_name ||
    meta.label
  )
}

function formatFullDate(date) {
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
  ).format(
    parsedDate,
  )
}

function formatRelativeTime(date) {
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

  const difference =
    Date.now() -
    parsedDate.getTime()

  const minutes =
    Math.max(
      0,
      Math.floor(
        difference / 60000,
      ),
    )

  if (minutes < 1) {
    return 'Just now'
  }

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours =
    Math.floor(
      minutes / 60,
    )

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days =
    Math.floor(
      hours / 24,
    )

  if (days < 7) {
    return `${days}d ago`
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
    },
  ).format(
    parsedDate,
  )
}

function groupNotifications(
  notifications,
) {
  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0,
  )

  const yesterday =
    new Date(today)

  yesterday.setDate(
    yesterday.getDate() -
      1,
  )

  const groups = [
    {
      label: 'Today',
      items: [],
    },
    {
      label: 'Yesterday',
      items: [],
    },
    {
      label: 'Earlier',
      items: [],
    },
  ]

  notifications.forEach(
    (notification) => {
      const createdAt =
        new Date(
          notification.created_at,
        )

      if (
        createdAt >= today
      ) {
        groups[0].items.push(
          notification,
        )
      } else if (
        createdAt >= yesterday
      ) {
        groups[1].items.push(
          notification,
        )
      } else {
        groups[2].items.push(
          notification,
        )
      }
    },
  )

  return groups.filter(
    (group) =>
      group.items.length >
      0,
  )
}

export default NotificationsPage
