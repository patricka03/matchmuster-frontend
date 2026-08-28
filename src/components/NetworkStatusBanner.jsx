import {
  useEffect,
  useState,
} from 'react'

import './NetworkStatusBanner.css'

function NetworkStatusBanner() {
  const [
    status,
    setStatus,
  ] = useState(
    navigator.onLine
      ? 'online'
      : 'offline',
  )

  useEffect(() => {
    let onlineTimer = null

    function handleOffline() {
      if (onlineTimer) {
        window.clearTimeout(
          onlineTimer,
        )
      }

      setStatus('offline')
    }

    function handleOnline() {
      setStatus('restored')

      onlineTimer =
        window.setTimeout(
          () => {
            setStatus('online')
          },
          2200,
        )
    }

    window.addEventListener(
      'offline',
      handleOffline,
    )

    window.addEventListener(
      'online',
      handleOnline,
    )

    return () => {
      window.removeEventListener(
        'offline',
        handleOffline,
      )

      window.removeEventListener(
        'online',
        handleOnline,
      )

      if (onlineTimer) {
        window.clearTimeout(
          onlineTimer,
        )
      }
    }
  }, [])

  if (status === 'online') {
    return null
  }

  return (
    <div
      className={`network-status-banner network-status-banner--${status}`}
      role="status"
      aria-live="polite"
    >
      {status === 'offline'
        ? 'You’re offline. Changes may not load yet.'
        : 'Back online'}
    </div>
  )
}

export default NetworkStatusBanner
