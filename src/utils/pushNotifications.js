import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { FCM } from '@capacitor-community/fcm'

import API_URL from '../config/api'

import {
  getAuthToken,
} from './authStorage'

const ANDROID_PUSH_CHANNEL_ID =
  'matchmuster_alerts'

async function ensureAndroidPushChannel() {
  if (
    Capacitor.getPlatform() !==
    'android'
  ) {
    return
  }

  await PushNotifications.createChannel({
    id: ANDROID_PUSH_CHANNEL_ID,
    name: 'MatchMuster alerts',
    description:
      'Important MatchMuster team and match notifications.',
    importance: 4,
    visibility: 1,
    vibration: true,
  })

  console.info(
    'MatchMuster Android notification channel ready.',
  )
}

async function registerPushDevice(
  pushToken,
) {
  const authToken =
    getAuthToken()

  if (!authToken) {
    console.info(
      'Push device registration skipped because the user is not authenticated.',
    )

    return
  }

  const platform =
    Capacitor.getPlatform()

  if (
    platform !== 'android' &&
    platform !== 'ios'
  ) {
    return
  }

  const response =
    await fetch(
      `${API_URL}/push_devices`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            authToken,
        },

        body: JSON.stringify({
          push_device: {
            token: pushToken,
            platform,
          },
        }),
      },
    )

  if (!response.ok) {
    let errorMessage =
      `Push device registration failed with status ${response.status}.`

    try {
      const data =
        await response.json()

      errorMessage =
        data.error ||
        data.errors?.join(', ') ||
        errorMessage
    } catch {
      // Keep the HTTP status message.
    }

    throw new Error(
      errorMessage,
    )
  }

  console.info(
    'MatchMuster push device registered with Rails.',
  )
}

export async function registerForPushNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  await ensureAndroidPushChannel()

  let permissionStatus =
    await PushNotifications.checkPermissions()

  if (
    permissionStatus.receive === 'prompt' ||
    permissionStatus.receive ===
      'prompt-with-rationale'
  ) {
    permissionStatus =
      await PushNotifications.requestPermissions()
  }

  if (
    permissionStatus.receive !==
    'granted'
  ) {
    console.info(
      'Push notification permission was not granted.',
    )

    return
  }

  await PushNotifications.register()
}

export async function initialisePushNotificationListeners({
  onNotificationOpened,
} = {}) {
  if (!Capacitor.isNativePlatform()) {
    return () => {}
  }

  const registrationListener =
    await PushNotifications.addListener(
      'registration',
      (token) => {
        console.info(
          'MatchMuster push registration succeeded.',
        )

        /*
         * Never log the full FCM/APNs token.
         * Send it directly to the authenticated
         * Rails API instead.
         */
        void (async () => {
          const platform =
            Capacitor.getPlatform()

          const pushToken =
            platform === 'ios'
              ? (
                  await FCM.getToken()
                ).token
              : token.value

          if (!pushToken) {
            throw new Error(
              'No push token was returned by the device.',
            )
          }

          await registerPushDevice(
            pushToken,
          )
        })().catch(
          (error) => {
            console.error(
              'Unable to register MatchMuster push device with Rails:',
              error,
            )
          },
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
        const notification =
          action.notification

        console.info(
          'Push notification opened:',
          notification,
        )

        if (
          typeof onNotificationOpened ===
          'function'
        ) {
          try {
            onNotificationOpened(
              notification,
            )
          } catch (error) {
            console.error(
              'Unable to handle opened MatchMuster push notification:',
              error,
            )
          }
        }
      },
    )

  return async () => {
    await registrationListener.remove()
    await registrationErrorListener.remove()
    await receivedListener.remove()
    await actionListener.remove()
  }
}
