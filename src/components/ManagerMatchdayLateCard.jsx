import { Clock3 } from 'lucide-react'
import useMatchdayLateStatuses from '../hooks/useMatchdayLateStatuses'
import './ManagerMatchdayLateCard.css'

function personName(status) {
  return [status.user?.first_name, status.user?.last_name]
    .filter(Boolean)
    .join(' ') || 'Team member'
}

function ManagerMatchdayLateCard({ teamId }) {
  const { match, statuses } = useMatchdayLateStatuses(teamId)

  if (!match) return null

  return (
    <section className="manager-late-card">
      <div className="manager-late-card-heading">
        <span className="manager-late-card-icon">
          <Clock3 size={20} aria-hidden="true" />
        </span>

        <div>
          <span>MATCHDAY LIVE</span>
          <h2>Running late</h2>
          <p>vs {match.opponent}</p>
        </div>

        <strong className="manager-late-card-count">
          {statuses.length}
        </strong>
      </div>

      {statuses.length === 0 ? (
        <div className="manager-late-card-clear">
          No one has reported a delay.
        </div>
      ) : (
        <div className="manager-late-card-list">
          {statuses.map((status) => (
            <div className="manager-late-card-row" key={status.id}>
              <span>
                <strong>{personName(status)}</strong>
                <small>
                  {status.role === 'manager' ? 'Manager' : 'Player'}
                  {status.note ? ` • ${status.note}` : ''}
                </small>
              </span>
              <strong>{status.minutes_late} min late</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default ManagerMatchdayLateCard
