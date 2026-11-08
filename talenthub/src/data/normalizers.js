export const REGISTRATION_LABELS = {
  submitted: 'подана', under_review: 'на рассмотрении', waitlisted: 'лист ожидания',
  approved: 'подтверждена', rejected: 'отклонена', cancelled: 'отменена',
}
export const REGISTRATION_VALUES = Object.fromEntries(Object.entries(REGISTRATION_LABELS).map(([value, label]) => [label, value]))
export const PROJECT_LABELS = { camp: 'смена', competition: 'конкурс', workshop: 'мастерская', hackathon: 'хакатон' }
export const FORMAT_LABELS = { offline: 'очно', online: 'онлайн', hybrid: 'смешанный' }
export const FORMAT_VALUES = Object.fromEntries(Object.entries(FORMAT_LABELS).map(([value, label]) => [label, value]))
export function userView(user, profile = null, organization = null) {
  if (!user) return null
  return { ...user, firstName: user.first_name, lastName: user.last_name,
    profileComplete: user.profile_complete, orgName: organization?.name || '',
    ...(profile ? { birthDate: profile.birth_date, school: profile.school.name, schoolId: profile.school.id,
      grade: String(profile.grade ?? ''), city: profile.city || '', interests: profile.interests,
      profileComplete: profile.profile_complete } : {}),
  }
}
export function eventView(event) {
  return { ...event, organizerId: event.organizer.id, organizer: event.organizer.name,
    category: event.kind, projectKind: PROJECT_LABELS[event.project_kind] || event.project_kind || '',
    grade: event.grade_min == null ? '' : event.grade_min === event.grade_max ? String(event.grade_min) : `${event.grade_min}–${event.grade_max}`,
    date: event.event_date, deadline: event.registration_deadline, place: event.venue || '',
    format: FORMAT_LABELS[event.format] || event.format,
    seats: event.capacity, remainingSeats: event.places_remaining,
  }
}
export function registrationView(row) {
  return { ...row, id: row.id, eventId: row.event_id, title: row.event.title,
    status: REGISTRATION_LABELS[row.status] || row.status, apiStatus: row.status,
    date: row.event.event_date, city: row.event.city, organizer: row.event.organizer.name,
    category: row.event.kind, format: FORMAT_LABELS[row.event.format] || row.event.format,
    eventStatus: row.event.status, attended: Boolean(row.attended_at),
  }
}
export function successView(success) {
  return {
    attended: success.attendances.map(item => ({ ...item, eventId: item.event_id, date: item.attended_at.slice(0, 10) })),
    achievements: success.achievements.map(item => ({ ...item, eventId: item.event_id, status: 'confirmed' })),
  }
}
export function studentView(profile, applications = [], success = { attendances: [], achievements: [] }) {
  return { id: profile.id, firstName: profile.first_name, lastName: profile.last_name,
    name: [profile.first_name, profile.last_name].join(' '), birthDate: profile.birth_date,
    school: profile.school.name, schoolId: profile.school.id, grade: String(profile.grade ?? ''),
    city: profile.city || '', interests: profile.interests, profileComplete: profile.profile_complete,
    signedUp: applications.map(registrationView), ...successView(success) }
}
export function childView(child) { return studentView(child.profile, child.applications, child) }
export function notificationView(item) { return { ...item, date: item.created_at.slice(0, 10), eventId: item.event_id } }
export function partnershipViews(rows, user) {
  const result = []
  for (const row of rows) {
    const mine = row.sender.id === user.organization_id
    const status = row.moderation_status === 'pending' ? 'moderation_pending'
      : row.moderation_status === 'rejected' ? 'rejected'
      : row.direct_decision || (!mine && row.visibility === 'direct' ? 'incoming' : 'pending')
    result.push({ ...row, from: row.sender.name, to: row.target?.name || '', text: row.description,
      visibility: row.visibility === 'direct' ? 'direct' : 'public', audience: row.visibility,
      status, date: row.created_at.slice(0, 10), city: row.sender.city, format: '',
      canDecide: !mine && row.visibility === 'direct' && row.moderation_status === 'approved' && !row.direct_decision,
    })
    for (const response of row.responses) {
      const responder = response.organization || response.school
      if (!responder) continue
      result.push({ ...response, id: `response:${response.id}`, responseId: response.id,
        parentRequestId: row.id, title: row.title, from: responder.name, to: row.sender.name,
        description: row.description, text: row.description,
        status: response.status === 'pending' && mine ? 'incoming' : response.status,
        canDecide: mine && response.status === 'pending', date: response.created_at.slice(0, 10),
      })
    }
  }
  return result
}
