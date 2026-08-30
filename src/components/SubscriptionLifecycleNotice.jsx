import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  Crown,
} from 'lucide-react'

import './SubscriptionLifecycleNotice.css'

function SubscriptionLifecycleNotice({
  team,
  isApprovedManager,
}) {
  const navigate =
    useNavigate()

  const [
    visible,
    setVisible,
  ] = useState(false)

  const subscription =
    team?.subscription

  const owner =
    team
      ?.multi_team_access
      ?.owned_by_current_manager ===
      true

  useEffect(() => {
    if (
      !team?.id ||
      !isApprovedManager ||
      !owner ||
      !subscription ||
      subscription.status !==
        'expired' ||
      ![
        'standard_trial',
        'founder',
      ].includes(
        subscription.source,
      )
    ) {
      setVisible(false)
      return
    }

    const key =
      `matchmuster:subscription-expiry-notice:${team.id}:${subscription.source}:${subscription.ends_at || 'ended'}`

    if (
      localStorage.getItem(
        key,
      ) === 'seen'
    ) {
      setVisible(false)
      return
    }

    setVisible(true)
  }, [
    isApprovedManager,
    owner,
    subscription,
    team?.id,
  ])

  function dismiss() {
    const key =
      `matchmuster:subscription-expiry-notice:${team.id}:${subscription.source}:${subscription.ends_at || 'ended'}`

    localStorage.setItem(
      key,
      'seen',
    )

    setVisible(false)
  }

  if (!visible) {
    return null
  }

  const launchClub =
    subscription
      ?.launch_club ===
      true

  return (
    <div className="subscription-lifecycle-overlay">
      <section
        className="subscription-lifecycle-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-lifecycle-title"
      >
        <div className="subscription-lifecycle-icon">
          <Crown
            size={25}
            aria-hidden="true"
          />
        </div>

        <p className="dashboard-label">
          {launchClub
            ? 'Launch Club'
            : 'MatchMuster Plus'}
        </p>

        <h2 id="subscription-lifecycle-title">
          {launchClub
            ? 'Launch Plus has ended'
            : 'Your Plus Preview has ended'}
        </h2>

        <p>
          {launchClub
            ? 'Your Launch Club status is permanent. Your team is now using MatchMuster Free unless you choose to keep Plus.'
            : 'Your team is now using MatchMuster Free. Your team, players and data are unchanged.'}
        </p>

        <button
          type="button"
          className="subscription-lifecycle-primary"
          onClick={() => {
            dismiss()

            navigate(
              `/teams/${team.id}/subscription`,
            )
          }}
        >
          View Plus
        </button>

        <button
          type="button"
          className="subscription-lifecycle-secondary"
          onClick={dismiss}
        >
          Continue with Free
        </button>
      </section>
    </div>
  )
}

export default SubscriptionLifecycleNotice
