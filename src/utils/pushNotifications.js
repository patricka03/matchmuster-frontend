import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

export async function registerForPushNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  let permissionStatus =
    await PushNotifications.checkPermissions()

  if (
    permissionStatus.receive === 'prompt' ||
    permissionStatus.receive === 'prompt-with-rationale'
  ) {
    permissionStatus =
      await PushNotifications.requestPermissions()
  }

  if (permissionStatus.receive !== 'granted') {
    console.info(
      'Push notification permission was not granted.',
    )

    return
  }

  await PushNotifications.register()
}

export async function initialisePushNotificationListeners() {
  if (!Capacitor.isNativePlatform()) {
    return () => {}
  }

  const registrationListener =
    await PushNotifications.addListener(
      'registration',
      (token) => {
        /*
         * Temporary during push setup.
         * Android returns the FCM token here.
         * This will later be sent securely to Rails.
         */
        console.info(
          'MatchMuster push registration succeeded.',
        )

        console.info(
          'MatchMuster push token:',
          token.value,
        )
      },
    )

  const registrationErrorListener =
    await PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error(
          'Push notification registration failed:',
          error.error || error,
        )
      },
    )

  const receivedListener =
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.info(
          'Push notification received:',
          notification,
        )
      },
    )

  const actionListener =
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.info(
          'Push notification opened:',
          action.notification,
        )
      },
    )

  return async () => {
    await registrationListener.remove()
    await registrationErrorListener.remove()
    await receivedListener.remove()
    await actionListener.remove()
  }
}
