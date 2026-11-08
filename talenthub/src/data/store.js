import { ApiError, getToken, onUnauthorized, queryString, request, setToken } from '../api/client.js'
import { childView, eventView, FORMAT_VALUES, notificationView, partnershipViews, REGISTRATION_VALUES, registrationView, studentView, userView } from './normalizers.js'

export let GRADES = []
export let CITIES = []
export let INTERESTS = []
export let COMPANIES = []
const empty = () => ({ ready: false, error: '', user: null, rawUser: null, profile: null,
  organizations: [], reference: null, catalog: [], events: [], upcoming: [], recommendations: [],
  applications: [], notifications: [], student: null, students: [], participants: {}, dashboard: null,
  partnerships: [], marketplace: [], children: [], activeId: null, suggestions: [], schools: [], queue: null })
let state = empty()
let revision = 0
let epoch = 0
let initialization
let refreshPromise
let authentication
const listeners = new Set()
const pendingMutations = new Map()
const emit = () => { revision += 1; for (const listener of listeners) listener() }
export const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
export const getRevision = () => revision
export const getState = () => state
export const currentUser = () => state.user
const DEMO_ORG_TOKENS = new Set(['th_demo_school_1f85ed08247f646e3309082eee04b85f885a4db17382d06fc82ebf95dee030f','th_demo_company_71a1140475560d032a232e3fb660700021e5d7106ad006026366d71e6e2adcd3'])
const DEMO_ORG_KEY = 'talenthub_demo_organization'
export const isDemoOrganization = () => globalThis.sessionStorage?.getItem(DEMO_ORG_KEY) === '1' || DEMO_ORG_TOKENS.has(getToken())
export const listSchools = () => state.organizations.filter(o => o.kind === 'school').map(o => o.name)
export const listEvents = () => state.events
export const listUpcoming = () => state.upcoming
export const listPartnerships = () => state.partnerships
export const listMarketplace = () => state.marketplace
export const schoolStudents = () => state.students
export const eventRegistrations = id => state.participants[id] || []
export const moderationQueue = () => state.queue
export const dashboard = () => state.dashboard
export const studentCabinet = () => ({ demo: false, loggedIn: state.user?.role === 'student',
  user: state.user?.role === 'student' ? state.user : null, student: state.student,
  applications: state.applications, notifications: state.notifications })
export const parentCabinet = () => ({ ready: state.ready, error: state.error, loggedIn: state.user?.role === 'parent', role: state.user?.role,
  user: state.user, children: state.children, activeId: state.activeId,
  suggestions: state.suggestions, events: state.events, schools: state.schools })
function clearSession() {
  epoch += 1; refreshPromise = null; globalThis.sessionStorage?.removeItem(DEMO_ORG_KEY); setToken(null)
  state = { ...empty(), ready: true, organizations: state.organizations, reference: state.reference,
    catalog: state.catalog.map(e => ({ ...e, my_registration: null })), events: state.catalog.map(e => ({ ...e, my_registration: null })), upcoming: state.upcoming }
  emit()
}
onUnauthorized(clearSession)
export const logout = () => { globalThis.sessionStorage?.removeItem(DEMO_ORG_KEY); clearSession() }

async function publicData() {
  const [reference, organizations, catalog, upcoming] = await Promise.all([
    request('/reference-data', { auth: false }), request('/organizations', { auth: false }),
    request('/events'), request('/events?upcoming=true'),
  ])
  return { reference, organizations: organizations.items,
    catalog: catalog.items.map(eventView), upcoming: upcoming.items.map(eventView) }
}
function references(data) {
  GRADES = data.reference.grades.map(String); CITIES = data.reference.cities
  INTERESTS = data.reference.interests.map(i => i.name)
  COMPANIES = data.organizations.filter(o => o.kind !== 'school').map(o => o.name)
}
async function roleData(rawUser, data) {
  const next = { ...empty(), ...data, rawUser, ready: true }
  next.events = [...data.catalog]
  next.user = userView(rawUser)
  if (!rawUser) return next
  if (rawUser.role === 'student') {
    const [profile, applications, success, notifications, recommendations] = await Promise.all([
      request('/students/me'), request('/registrations/me'), request('/students/me/success'),
      request('/notifications/me'), request('/recommendations'),
    ])
    next.profile = profile; next.user = userView(rawUser, profile)
    next.applications = applications.items.map(registrationView)
    next.student = studentView(profile, applications.items, success)
    next.notifications = notifications.items.map(notificationView)
    next.recommendations = recommendations.items.map(eventView)
    const historical = applications.items.map(r => r.event_id).filter(id => !next.events.some(e => e.id === id))
    const details = await Promise.all([...new Set(historical)].map(id => request(`/events/${id}`)))
    next.events.push(...details.map(eventView))
  } else if (rawUser.role === 'parent') {
    const [active, children, suggestions, schools] = await Promise.all([
      request('/parents/me/child'), request('/parents/me/children'), request('/parents/me/suggestions'), request('/schools'),
    ])
    next.children = children.items.map(childView)
    next.activeId = children.active_child_id || active.child?.profile.id || null
    next.suggestions = suggestions.items.map(s => ({ ...s, childId: s.student_user_id, eventId: s.event_id, date: s.created_at.slice(0, 10), status: 'предложено' }))
    next.schools = schools.items
    for (const child of children.items) for (const registration of child.applications) {
      if (!next.events.some(e => e.id === registration.event_id)) next.events.push(eventView(registration.event))
    }
  } else if (['school', 'company'].includes(rawUser.role)) {
    const [dashboard, events, mine, market, students, schools] = await Promise.all([
      request('/organizations/me/dashboard'), request('/organizations/me/events'), request('/partnership-requests?view=mine'),
      request('/partnership-requests?view=marketplace'), rawUser.role === 'school' ? request('/organizations/me/students') : Promise.resolve({ items: [] }), request('/schools'),
    ])
    next.dashboard = dashboard; next.user = userView(rawUser, null, dashboard.organization)
    next.events = events.items.map(eventView); next.marketplace = partnershipViews(market.items, rawUser).filter(row => !row.parentRequestId)
    next.partnerships = partnershipViews(mine.items, rawUser)
    next.schools = schools.items
    next.students = students.items.map(s => ({ ...s, firstName: s.first_name, lastName: s.last_name,
      grade: String(s.grade ?? ''), signedUp: s.applications.map(registrationView),
      attended: s.attendances.map(a => ({ ...a, eventId: a.event_id })), achievements: s.achievements }))
    const participants = await Promise.all(events.items.map(e => request(`/events/${e.id}/registrations`)))
    next.participants = Object.fromEntries(events.items.map((event, i) => [event.id, participants[i].items.map(r => ({ ...registrationView(r),
      studentId: r.student_user_id, name: [r.first_name, r.last_name].join(' '), grade: String(r.grade ?? '') }))]))
  } else if (rawUser.role === 'moderator') {
    const queue = await request('/moderation/queue')
    next.queue = { events: queue.events.items.map(eventView), partnerships: queue.partnership_requests.items.map(p => ({ ...partnershipViews([p], rawUser)[0], status: 'pending' })),
      achievements: queue.achievements.items.map(a => ({ ...a, student: `${a.student.first_name} ${a.student.last_name}`, school: a.student.school.name, categoryLabel: 'Внешнее достижение', date: '', text: a.title })),
      decided: { events: queue.events.decided_count, partnerships: queue.partnership_requests.decided_count, achievements: queue.achievements.decided_count } }
  }
  return next
}
export async function refresh() {
  if (refreshPromise) return refreshPromise
  const ownEpoch = epoch
  refreshPromise = (async () => {
    const data = await publicData()
    const rawUser = getToken() ? await request('/auth/me') : null
    const next = await roleData(rawUser, data)
    if (ownEpoch !== epoch) return
    references(data); state = next; emit()
  })().finally(() => { if (ownEpoch === epoch) refreshPromise = null })
  return refreshPromise
}
export function initialize() {
  if (!initialization) initialization = refresh().catch(async error => {
    if (error.status === 401) { await refresh(); return }
    state = { ...state, ready: true, error: error.message }; emit()
  })
  return initialization
}
export async function retry() { initialization = null; state = { ...state, ready: false, error: '' }; emit(); return initialize() }
function authenticate(path, body) {
  if (authentication) return authentication
  authentication = authenticateOnce(path, body).finally(() => { authentication = null })
  return authentication
}
async function authenticateOnce(path, body) {
  const authEpoch = ++epoch; refreshPromise = null
  const session = await request(path, { method: 'POST', body, auth: false })
  if (authEpoch !== epoch) throw new ApiError('Запрос входа отменён. Повторите вход.')
  clearSession(); setToken(session.access_token)
  await refresh()
  return state.user
}
export const login = (email, password, expectedRole) => authenticate('/auth/login', { email, password, ...(expectedRole ? { expected_role: expectedRole } : {}) })
export const loginOrganization = async (token, expectedRole) => {
  const result = await authenticate('/auth/organization-login', { token, expected_role: expectedRole })
  if (DEMO_ORG_TOKENS.has(token)) globalThis.sessionStorage?.setItem(DEMO_ORG_KEY, '1')
  else globalThis.sessionStorage?.removeItem(DEMO_ORG_KEY)
  return result
}
export const registerStudent = data => authenticate('/auth/register', { role: data.role || 'student',
  first_name: data.firstName, last_name: data.lastName, email: data.email, password: data.password,
  ...(data.role === 'parent' ? {} : { birth_date: data.birthDate, school_id: organizationId(data.school, 'school') }) })
export const registerParent = data => registerStudent({ ...data, role: 'parent' })
function organizationId(value, kind) {
  const matches = state.organizations.filter(o => (o.id === value || o.name === value) && (!kind || o.kind === kind))
  if (matches.length !== 1) throw new ApiError('Выберите организацию из справочника.', 422, 'invalid_organization')
  return matches[0].id
}
async function mutate(key, callback) {
  if (['school', 'company'].includes(state.user?.role) && isDemoOrganization()) {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('talenthub:demo-restriction', { detail: { role: state.user.role } }))
    throw new ApiError('Это действие недоступно в демо-аккаунте. Зарегистрируйте организацию.', 403, 'demo_restricted')
  }
  if (pendingMutations.has(key)) return pendingMutations.get(key)
  const ownEpoch = epoch
  const promise = (async () => {
    const result = await callback()
    if (epoch === ownEpoch) {
      await refresh()
    }
    return result
  })().finally(() => pendingMutations.delete(key))
  pendingMutations.set(key, promise)
  return promise
}
export const completeProfile = values => mutate('profile', async () => {
  await request('/students/me', { method: 'PATCH', body: { grade: Number(values.grade), city: values.city, interests: values.interests } })
  return true
})
export const changeSchool = school => mutate('profile', async () => { await request('/students/me', { method: 'PATCH', body: { school_id: organizationId(school, 'school') } }); return true })
export const registerForEvent = id => mutate(`registration:${id}`, async () => {
  const result = await request(`/events/${id}/registrations`, { method: 'POST', raw: true })
  const row = registrationView(result.data)
  return { ok: true, already: result.status === 200, status: row.status }
})
export const cancelRegistration = eventId => mutate(`registration:${eventId}`, async () => {
  const application = state.applications.find(r => r.eventId === eventId)
  if (!application) throw new ApiError('Заявка не найдена.', 404, 'not_found')
  await request(`/registrations/${application.id}/cancel`, { method: 'POST' }); return { ok: true }
})
export const publishEvent = data => mutate('create-event', async () => {
  const range = String(data.grade).match(/\d+/g)?.map(Number) || []
  return request('/events', { method: 'POST', body: { title: data.title, description: data.description, kind: data.category,
    ...(data.category === 'project' && data.projectKind ? { project_kind: data.projectKind } : {}), interests: data.interests,
    grade_min: range[0], grade_max: range.at(-1), event_date: data.date, registration_deadline: data.deadline,
    city: data.city, venue: data.place, format: FORMAT_VALUES[data.format] || data.format, terms: data.terms, capacity: Number(data.seats) } })
})
export const updateEvent = (id, values) => mutate(`event:${id}`, () => {
  const action = { registration_closed: 'close-registration', published: 'open-registration', completed: 'complete' }[values.status]
  if (!action) throw new ApiError('Недопустимое действие с мероприятием.')
  return request(`/events/${id}/${action}`, { method: 'POST' })
})
export const updateEventRegistration = (eventId, studentId, values) => mutate(`participant:${eventId}:${studentId}`, () => {
  const row = eventRegistrations(eventId).find(r => r.studentId === studentId)
  if (!row) throw new ApiError('Заявка не найдена.')
  return values.attended ? request(`/registrations/${row.id}/attendance`, { method: 'PUT' })
    : request(`/registrations/${row.id}/decision`, { method: 'PATCH', body: { decision: REGISTRATION_VALUES[values.status] || values.status } })
})
export const sendPartnership = data => mutate(`partnership:${data.parentRequestId || 'create'}`, () => {
  if (data.parentRequestId) return request(`/partnership-requests/${data.parentRequestId}/responses`, { method: 'POST' })
  const visibility = data.visibility === 'public' ? data.audience : 'direct'
  return request('/partnership-requests', { method: 'POST', body: { visibility, title: data.title, description: data.description || data.text,
    ...(visibility === 'direct' ? { target_org_id: organizationId(data.to) } : {}) } })
})
export const respondPartnership = (id, decision) => mutate(`partnership-decision:${id}`, () => request(id.startsWith('response:')
  ? `/partnership-responses/${id.slice(9)}/decision` : `/partnership-requests/${id}/decision`, { method: 'PATCH', body: { decision } }))
export const getFamilyInvitation = () => request('/parents/me/invitation')
export const createFamilyInvitation = () => request('/parents/me/invitation', { method: 'POST' })
export const deleteFamilyInvitation = () => request('/parents/me/invitation', { method: 'DELETE' })
export const acceptFamilyInvitation = token => mutate(`family:${token}`, () => request('/family-invitations/accept', { method: 'POST', body: { token } }))
export const listOrganizationAccounts = () => request('/moderation/organization-accounts')
export const createOrganizationAccount = body => mutate('organization-account', () => request('/moderation/organization-accounts', { method: 'POST', body }))
export const rotateOrganizationToken = id => request(`/moderation/organization-accounts/${id}/token`, { method: 'POST' })
export const selectChild = id => mutate('children', async () => { await request(`/parents/me/children/${id}/select`, { method: 'PUT' }); return { ok: true } })
export const suggestToChild = ({ childId, eventId }) => mutate(`suggestion:${childId}:${eventId}`, async () => {
  const already = state.suggestions.some(s => s.childId === childId && s.eventId === eventId)
  await request(`/parents/me/children/${childId}/suggestions`, { method: 'POST', body: { event_id: eventId } })
  return { ok: true, already }
})
export const markNotificationRead = id => mutate(`notification:${id}`, () => request(`/notifications/${id}/read`, { method: 'PUT' }))
export const moderate = (kind, id, status) => mutate(`moderation:${kind}:${id}`, () => request(`/moderation/${kind === 'partnerships' ? 'partnership-requests' : kind}/${id}/decision`,
  { method: 'POST', body: { decision: status === 'rejected' ? 'reject' : 'approve' } }))
export async function fetchCatalog(filters, signal) {
  const isStudent = state.user?.role === 'student'
  const query = { q: filters.query, kind: filters.category, interest: filters.directions,
    ...(isStudent ? { application_status: REGISTRATION_VALUES[filters.status] || filters.status } : {}) }
  return (await request(`/events${queryString(query)}`, { signal })).items.map(eventView)
}
export async function fetchRecommendations(directions = [], childId, signal) {
  if (state.user?.role !== 'student' && !childId) return []
  const path = childId ? `/parents/me/children/${childId}/recommendations` : '/recommendations'
  return (await request(`${path}${queryString({ interest: directions })}`, { signal })).items.map(eventView)
}
export async function fetchEvent(id) { return eventView(await request(`/events/${id}`)) }

export const schoolInfo = name => state.organizations.find(o => o.name === name)
