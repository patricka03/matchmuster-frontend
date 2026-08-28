import { useEffect, useState } from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import API_URL from '../config/api'
import { getAuthToken } from '../utils/authStorage'

function ManagerPlusPrompt({
  teamId,
  currentUser,
  title = 'More with Plus',
  description = 'Unlock more manager tools with MatchMuster Plus.',
  compact = false,
}) {
  const navigate = useNavigate()
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkPlusAccess() {
      const isApprovedManager =
        currentUser?.account_type === 'manager' &&
        currentUser?.manager_verification_status === 'approved'

      if (!teamId || !isApprovedManager) {
        setShowPrompt(false)
        return
      }

      const token = getAuthToken()

      if (!token) {
        setShowPrompt(false)
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/teams`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
            },
          },
        )

        if (!response.ok) {
          return
        }

        const data = await response.json()

        const teams = Array.isArray(data)
          ? data
          : data.teams || []

        const team = teams.find(
          (teamRecord) =>
            String(teamRecord.id) === String(teamId),
        )

        const access = team?.multi_team_access

        /*
         * This prompt is deliberately fail-quiet.
         * We only upsell when Rails explicitly tells us:
         * - this manager owns the team; and
         * - Plus capability is currently unavailable.
         *
         * Founder complimentary, trialing and active Plus should
         * therefore stay prompt-free whenever Rails grants the
         * capability. Players and co-managers never receive a CTA.
         */
        const canOfferPlus =
          access?.owned_by_current_manager === true &&
          access?.can_create_additional_team === false &&
          access?.locked !== true

        if (!cancelled) {
          setShowPrompt(canOfferPlus)
        }
      } catch {
        /*
         * A marketing prompt must never break the feature page.
         */
      }
    }

    checkPlusAccess()

    return () => {
      cancelled = true
    }
  }, [
    currentUser?.account_type,
    currentUser?.id,
    currentUser?.manager_verification_status,
    teamId,
  ])

  if (!showPrompt) {
    return null
  }

  return (
    <button
      className={`mm-plus-prompt${
        compact ? ' mm-plus-prompt--compact' : ''
      }`}
      type="button"
      onClick={() =>
        navigate('/team?plus=required')
      }
      aria-label={`${title}. View MatchMuster Plus.`}
    >
      <span
        className="mm-plus-prompt-icon"
        aria-hidden="true"
      >
        <Sparkles size={18} />
      </span>

      <span className="mm-plus-prompt-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <span className="mm-plus-prompt-action">
        Plus
        <ChevronRight
          size={16}
          aria-hidden="true"
        />
      </span>
    </button>
  )
}

export default ManagerPlusPrompt
