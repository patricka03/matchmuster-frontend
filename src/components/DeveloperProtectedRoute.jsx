import { Navigate } from 'react-router-dom'

function DeveloperProtectedRoute({ children }) {
  const developerToken =
    localStorage.getItem('developerToken')

  if (!developerToken) {
    return (
      <Navigate
        to="/developer/login"
        replace
      />
    )
  }

  return children
}

export default DeveloperProtectedRoute
