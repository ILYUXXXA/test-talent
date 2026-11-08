import { pendingInvitationPath } from '../data/family-invitation.js'
import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getState, initialize, refresh, retry } from '../data/store.js'
import { useStoreRevision } from '../data/hooks.js'

export function ApiBoundary({ children }) {
  useStoreRevision()
  const state = getState()
  useEffect(() => {
    initialize()
    const onFocus = () => { if (getState().ready && !getState().error) refresh().catch(() => {}) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  if (!state.ready) return <main className="app-loading" aria-live="polite"><div className="app-loading-content"><span className="th-spinner th-spinner-large" aria-hidden="true" /><p>Загружаем TalentHub…</p></div></main>
  if (state.error) return <main><div className="container"><p className="notice" role="alert">{state.error}</p><button className="btn btn-primary" onClick={retry}>Повторить</button></div></main>
  return children
}
export function RequireRole({ role, onboarding = false, children }) {
  useStoreRevision()
  const location = useLocation()
  const user = getState().user
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to={rolePath(user)} replace />
  if (role === 'student') {
    if (!onboarding && !user.profileComplete) return <Navigate to="/welcome" replace />
    if (onboarding && user.profileComplete) return <Navigate to={pendingInvitationPath() || '/events'} replace />
  }
  return children
}
export function rolePath(user) {
  return { student: user.profileComplete ? '/events' : '/welcome', parent: '/parent', school: '/school', company: '/company', moderator: '/admin' }[user.role] || '/auth'
}

export function CatalogGuard({ children }) {
  useStoreRevision()
  const user = getState().user
  return user?.role === 'student' && !user.profileComplete ? <Navigate to="/welcome" replace /> : children
}
