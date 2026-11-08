const KEY = 'talenthub_pending_family_invitation'
export function rememberInvitation(token) { globalThis.sessionStorage?.setItem(KEY, token) }
export function clearInvitation(expectedToken) {
  if (expectedToken !== undefined && globalThis.sessionStorage?.getItem(KEY) !== expectedToken) return
  globalThis.sessionStorage?.removeItem(KEY)
}
export function rejectInvitation(token, error) {
  if (error.code === 'invalid_invitation') clearInvitation(token)
}
export function pendingInvitationPath() {
  const token = globalThis.sessionStorage?.getItem(KEY)
  return token ? `/family/join/${encodeURIComponent(token)}` : null
}
export function studentDestination(user) {
  return !user.profileComplete ? '/welcome' : pendingInvitationPath() || '/events'
}
