import { useNavigate } from 'react-router-dom'

function BackButton({ to, label = 'Back' }) {
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
      className="app-back-button"
      type="button"
      onClick={handleBack}
      aria-label={label}
    >
      {label}
    </button>
  )
}

export default BackButton
