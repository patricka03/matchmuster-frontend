import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Capacitor,
} from '@capacitor/core'

import {
  PushNotifications,
} from '@capacitor/push-notifications'

import {
  Bell,
} from 'lucide-react'

import {
  AUTH_CHANGED_EVENT,
  getAuthToken,
} from '../utils/authStorage'

import {
  registerForPushNotifications,
} from '../utils/pushNotifications'

import './NotificationPermissionPrompt.css'

const DISMISSED_KEY =
  'matchmuster-push-permission-dismissed'

function NotificationPermissionPrompt() {
  const [
    visible,
    setVisible,
  ] = useState(false)

  const [
    requesting,
    setRequesting,
  ] = useState(false)

  const checkPrompt =
    useCallback(async () => {
      if (
        !Capacitor.isNativePlatform() ||
        !getAuthToken() ||
        sessionStorage.getItem(
          DISMISSED_KEY,
        ) === 'true'
      ) {
        setVisible(false)
        return
      }

      const permission =
        await PushNotifications
          .checkPermissions()

      setVisible(
        permission.receive ===
          'prompt' ||
          permission.receive ===
            'prompt-with-rationale',
      )
    }, [])

  useEffect(() => {
    let cancelled = false

    const timer =
      window.setTimeout(
        () => {
          if (!cancelled) {
            void checkPrompt()
          }
        },
        700,
      )

    function handleAuthChanged() {
      if (!cancelled) {
        void checkPrompt()
      }
    }

    window.addEventListener(
      AUTH_CHANGED_EVENT,
      handleAuthChanged,
    )

    return () => {
      cancelled = true

      window.clearTimeout(
        timer,
      )

      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        handleAuthChanged,
      )
    }
  }, [checkPrompt])

  async function handleAllow() {
    setRequesting(true)

    try {
      await registerForPushNotifications()

      const permission =
        await PushNotifications
          .checkPermissions()

      setVisible(
        permission.receive !==
          'granted' &&
        permission.receive !==
          'denied',
      )
    } finally {
      setRequesting(false)
    }
  }

  function handleLater() {
    sessionStorage.setItem(
      DISMISSED_KEY,
      'true',
    )

    setVisible(false)
  }

  if (!visible) {
    return null
  }

  return (
    <div className="notification-permission-overlay">
      <section
        className="notification-permission-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-permission-title"
      >
        <div className="notification-permission-icon">
          <Bell
            size={24}
            aria-hidden="true"
          />
        </div>

        <h2 id="notification-permission-title">
          Stay updated
        </h2>

        <p>
          Get fixture,
          availability, squad and
          team alerts on your
          iPhone.
        </p>

        <button
          type="button"
          className="notification-permission-primary"
          disabled={requesting}
          onClick={handleAllow}
        >
          {requesting
            ? 'Opening...'
            : 'Allow notifications'}
        </button>

        <button
          type="button"
          className="notification-permission-secondary"
          onClick={handleLater}
        >
          Not now
        </button>
      </section>
    </div>
  )
}

export default NotificationPermissionPrompt
