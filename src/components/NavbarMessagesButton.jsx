import { useCallback, useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import API_URL from '../config/api'
import { getAuthToken } from '../utils/authStorage'
import './NavbarMessagesButton.css'

function NavbarMessagesButton({ teamId, enabled = true }) {
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnread = useCallback(async () => {
    if (!teamId || !enabled) {
      setUnreadCount(0)
      return
    }

    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/conversations`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        },
      )

      if (!response.ok) return
      const data = await response.json()
      const conversations = data.conversations || []

      setUnreadCount(
        conversations.reduce(
          (total, conversation) =>
            total + Number(conversation.unread_count || 0),
          0,
        ),
      )
    } catch {
      // Keep navigation usable if messages cannot refresh.
    }
  }, [enabled, teamId])

  useEffect(() => {
    void loadUnread()
    const interval = window.setInterval(loadUnread, 20000)
    const updated = () => void loadUnread()
    window.addEventListener('matchmuster:messages-updated', updated)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('matchmuster:messages-updated', updated)
    }
  }, [loadUnread])

  if (!teamId || !enabled) return null

  return (
    <Link
      className="app-topbar-action navbar-messages-button"
      to={`/teams/${teamId}/messages`}
      aria-label={
        unreadCount > 0
          ? `Messages, ${unreadCount} unread`
          : 'Messages'
      }
      title="Messages"
    >
      <MessageCircle size={22} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="navbar-messages-badge" aria-hidden="true">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}

export default NavbarMessagesButton
