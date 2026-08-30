import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function BackButton({
  to,
  label = 'Back',
}) {
  const navigate = useNavigate()

  function handleBack() {
    if (to) {
      navigate(to)
    } else {
      navigate(-1)
    }
  }

  return (
    <button
      className="native-back-button"
      type="button"
      onClick={handleBack}
      aria-label={label}
      title={label}
    >
      <ChevronLeft
        size={28}
        strokeWidth={2.25}
        aria-hidden="true"
      />
    </button>
  )
}

export default BackButton
