import {
  teamPlanPresentation,
} from '../utils/subscriptionPresentation'

import './TeamPlanBadge.css'

function TeamPlanBadge({
  team,
  compact = false,
}) {
  if (!team) {
    return null
  }

  const plan =
    teamPlanPresentation(
      team,
    )

  return (
    <span
      className={`team-plan-badge team-plan-badge--${plan.tone}${
        compact
          ? ' team-plan-badge--compact'
          : ''
      }`}
    >
      {plan.label}
    </span>
  )
}

export default TeamPlanBadge
