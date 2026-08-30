import { MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './SquadMemberTools.css'

function SquadMemberTools({
  teamId,
  userId,
  currentUserId,
  lateStatus,
}) {
  const navigate = useNavigate()
  const sameUser = String(userId) === String(currentUserId)

  return (
    <div className="squad-member-tools">
      {lateStatus && (
        <span className="squad-late-badge">
          {lateStatus.minutes_late} min late
        </span>
      )}

      {!sameUser && (
        <button
          className="squad-message-button"
          type="button"
          onClick={() =>
            navigate(`/teams/${teamId}/messages?recipient_id=${userId}`)
          }
          aria-label="Message team member"
          title="Message"
        >
          <MessageCircle size={18} aria-hidden="true" />
          <span>Message</span>
        </button>
      )}
    </div>
  )
}

export default SquadMemberTools
