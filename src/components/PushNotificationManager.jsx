import {
  useEffect,
} from 'react'

import {
  AUTH_CHANGED_EVENT,
  getAuthToken,
} from '../utils/authStorage'

import {
  initialisePushNotificationListeners,
  registerForPushNotifications,
} from '../utils/pushNotifications'

function PushNotificationManager() {
  useEffect(() => {
    let cleanup = null
    let cancelled = false

    async function attemptRegistration() {
      const token =
        getAuthToken()

      if (!token || cancelled) {
        return
      }

      await registerForPushNotifications()
    }

    async function initialisePushNotifications() {
      cleanup =
        await initialisePushNotificationListeners()

      if (cancelled) {
        await cleanup()
        return
      }

      await attemptRegistration()
    }

    function handleAuthChanged() {
      void attemptRegistration().catch(
        (error) => {
          console.error(
            'Unable to register MatchMuster push notifications after authentication changed.',
            error,
          )
        },
      )
    }

    window.addEventListener(
      AUTH_CHANGED_EVENT,
      handleAuthChanged,
    )

    initialisePushNotifications().catch(
      (error) => {
        console.error(
          'Unable to initialise MatchMuster push notifications.',
          error,
        )
      },
    )

    return () => {
      cancelled = true

      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        handleAuthChanged,
      )

      if (cleanup) {
        void cleanup()
      }
    }
  }, [])

  return null
}

export default PushNotificationManager
