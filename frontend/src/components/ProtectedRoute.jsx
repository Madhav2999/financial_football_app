import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ isAllowed, redirectTo = '/', redirectState = {}, children }) {
  const location = useLocation()

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ ...redirectState, from: location }} />
  }

  return children
}
