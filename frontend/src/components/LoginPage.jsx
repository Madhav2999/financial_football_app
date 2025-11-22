import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import AuthenticationGateway from './AuthenticationGateway'

export default function LoginPage({
  authError,
  onTeamLogin,
  onAdminLogin,
  onModeratorLogin,
  onTeamRegister,
  onModeratorRegister,
  onTeamForgotPassword,
  onModeratorForgotPassword,
  onBack,
  session,
}) {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const allowedModes = new Set(['team', 'admin', 'moderator'])
  const requestedModeParam = searchParams.get('mode') ?? 'team'
  const requestedMode = allowedModes.has(requestedModeParam) ? requestedModeParam : 'team'

  const fromLocation = location.state?.from
  const pathToMode = [
    ['/admin', 'admin'],
    ['/team', 'team'],
    ['/moderator', 'moderator'],
  ]

  let inferredMode = requestedMode
  if (fromLocation?.pathname) {
    const match = pathToMode.find(([prefix]) => fromLocation.pathname.startsWith(prefix))
    if (match) {
      inferredMode = match[1]
    }
  }

  const redirectTarget = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search ?? ''}${fromLocation.hash ?? ''}`
    : null

  if (session.type === 'admin') {
    return <Navigate to="/admin" replace />
  }

  if (session.type === 'team') {
    return <Navigate to="/team" replace />
  }

  if (session.type === 'moderator') {
    return <Navigate to="/moderator" replace />
  }

  return (
    <AuthenticationGateway
      initialMode={inferredMode}
      onTeamLogin={(loginId, password) => onTeamLogin(loginId, password, { redirectTo: redirectTarget ?? '/team' })}
      onAdminLogin={(loginId, password) =>
        onAdminLogin(loginId, password, { redirectTo: redirectTarget ?? '/admin' })
      }
      onModeratorLogin={(loginId, password) =>
        onModeratorLogin(loginId, password, { redirectTo: redirectTarget ?? '/moderator' })
      }
      onTeamRegister={onTeamRegister}
      onModeratorRegister={onModeratorRegister}
      onTeamForgotPassword={onTeamForgotPassword}
      onModeratorForgotPassword={onModeratorForgotPassword}
      onBack={onBack}
      error={authError}
    />
  )
}
