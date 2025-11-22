import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ isAllowed, redirectTo = '/', isLoading = false, children }) {
  const location = useLocation()

  if (isLoading) {
    return null
  }

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return children
}
