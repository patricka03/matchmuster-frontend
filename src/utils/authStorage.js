import { Capacitor } from '@capacitor/core'

import {
  KeychainAccess,
  SecureStorage,
} from '@aparajita/capacitor-secure-storage'

const TOKEN_KEY = 'token'

let cachedToken = null
let storageInitialised = false

export async function initialiseAuthStorage() {
  if (storageInitialised) {
    return
  }

  if (Capacitor.isNativePlatform()) {
    await SecureStorage.setKeyPrefix(
      'matchmuster_',
    )

    /*
     * Keep the MatchMuster login token local
     * to this device rather than syncing it
     * through iCloud Keychain.
     */
    await SecureStorage.setSynchronize(false)

    /*
     * On iOS the JWT can only be accessed
     * while the device is unlocked and it
     * will not migrate to another device.
     */
    await SecureStorage.setDefaultKeychainAccess(
      KeychainAccess.whenUnlockedThisDeviceOnly,
    )

    let storedToken =
      await SecureStorage.get(TOKEN_KEY)

    if (typeof storedToken !== 'string') {
      storedToken = null
    }

    /*
     * Temporary migration support.
     *
     * If an existing development build already
     * has a JWT inside localStorage, move it into
     * secure native storage once.
     */
    const legacyToken =
      localStorage.getItem('token')

    if (!storedToken && legacyToken) {
      await SecureStorage.set(
        TOKEN_KEY,
        legacyToken,
      )

      storedToken = legacyToken
    }

    /*
     * Native MatchMuster must not leave
     * the authentication token in localStorage.
     */
    localStorage.removeItem('token')

    cachedToken = storedToken
  } else {
    /*
     * Keep the existing MatchMuster website
     * behaviour unchanged.
     */
    cachedToken =
      localStorage.getItem('token')
  }

  storageInitialised = true
}

export function getAuthToken() {
  return cachedToken
}

export async function setAuthToken(token) {
  cachedToken = token

  if (Capacitor.isNativePlatform()) {
    await SecureStorage.set(
      TOKEN_KEY,
      token,
    )

    localStorage.removeItem('token')

    return
  }

  localStorage.setItem(
    'token',
    token,
  )
}

export async function clearAuthToken() {
  cachedToken = null

  if (Capacitor.isNativePlatform()) {
    await SecureStorage.remove(
      TOKEN_KEY,
    )

    localStorage.removeItem('token')

    return
  }

  localStorage.removeItem('token')
}
