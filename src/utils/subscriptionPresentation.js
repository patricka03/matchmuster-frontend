export function teamPlanPresentation(team) {
  const subscription =
    team?.subscription || {}

  const launchClub =
    subscription.launch_club ===
      true

  const plusActive =
    subscription.plus_active ===
    true

  const days =
    subscription.days_remaining

  if (
    launchClub &&
    subscription.source ===
      'founder' &&
    plusActive
  ) {
    return {
      label:
        Number.isFinite(days)
          ? `Launch Plus · ${days}d`
          : 'Launch Plus',
      tone: 'launch',
    }
  }

  if (
    subscription.source ===
      'standard_trial' &&
    plusActive
  ) {
    return {
      label:
        Number.isFinite(days)
          ? `Plus Preview · ${days}d`
          : 'Plus Preview',
      tone: 'preview',
    }
  }

  if (
    subscription.status ===
      'grace_period' &&
    plusActive
  ) {
    return {
      label:
        launchClub
          ? 'Launch Club · Plus'
          : 'Plus · Grace',
      tone:
        launchClub
          ? 'launch'
          : 'plus',
    }
  }

  if (plusActive) {
    return {
      label:
        launchClub
          ? 'Launch Club · Plus'
          : 'Plus',
      tone:
        launchClub
          ? 'launch'
          : 'plus',
    }
  }

  if (launchClub) {
    return {
      label:
        'Launch Club · Free',
      tone:
        'launch-free',
    }
  }

  return {
    label: 'Free',
    tone: 'free',
  }
}
