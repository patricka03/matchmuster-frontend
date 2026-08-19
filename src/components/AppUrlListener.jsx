import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useNavigate } from 'react-router-dom'

const MATCHMUSTER_DEEP_LINK_HOST =
  'www.matchmuster.uk'

const ALLOWED_PROTOCOLS = [
  'http:',
  'https:',
]

function getInternalPath(rawUrl) {
  if (!rawUrl) {
    return null
  }

  try {
    const url = new URL(rawUrl)

    if (
      !ALLOWED_PROTOCOLS.includes(
        url.protocol,
      )
    ) {
      return null
    }

    if (
      url.hostname.toLowerCase() !==
      MATCHMUSTER_DEEP_LINK_HOST
    ) {
      return null
    }

    const pathname =
      url.pathname || '/'

    return `${pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

function AppUrlListener() {
  const navigate = useNavigate()

  useEffect(() => {
    if (
      !Capacitor.isNativePlatform()
    ) {
      return undefined
    }

    let disposed = false
    let listenerHandle = null

    function navigateFromUrl(
      rawUrl,
      replace = false,
    ) {
      if (disposed) {
        return
      }

      const internalPath =
        getInternalPath(rawUrl)

      if (!internalPath) {
        return
      }

      navigate(
        internalPath,
        {
          replace,
        },
      )
    }

    async function initialiseDeepLinks() {
      const handle =
        await CapacitorApp.addListener(
          'appUrlOpen',
          ({ url }) => {
            navigateFromUrl(url)
          },
        )

      if (disposed) {
        await handle.remove()
        return
      }

      listenerHandle = handle

      const launchUrl =
        await CapacitorApp.getLaunchUrl()

      if (
        launchUrl?.url &&
        !disposed
      ) {
        navigateFromUrl(
          launchUrl.url,
          true,
        )
      }
    }

    initialiseDeepLinks().catch(
      (error) => {
        if (!disposed) {
          console.error(
            'Unable to initialise MatchMuster deep links.',
            error,
          )
        }
      },
    )

    return () => {
      disposed = true

      if (listenerHandle) {
        void listenerHandle.remove()
      }
    }
  }, [navigate])

  return null
}

export default AppUrlListener
