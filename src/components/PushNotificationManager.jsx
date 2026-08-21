import { useEffect } from 'react'

import {
  getAuthToken,
} from '../utils/authStorage'

import {
  initialisePushNotificationListeners,
  registerForPushNotifications,
} from '../utils/pushNotifications'

function PushNotificationManager() {
  useEffect(() => {
    const token = getAuthToken()

    if (!token) {
      return undefined
    }

    let cleanup = null
    let cancelled = false

    async function initialisePushNotifications() {
      cleanup =
        await initialisePushNotificationListeners()

      if (cancelled) {
        await cleanup()
        return
      }

      await registerForPushNotifications()
    }

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

      if (cleanup) {
        void cleanup()
      }
    }
  }, [])

  return null
}

export default PushNotificationManager
