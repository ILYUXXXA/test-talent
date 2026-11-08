import { useStoreRevision } from '../data/hooks.js'
import { useMemo, useState } from 'react'
import { listEvents, studentCabinet } from '../data/store.js'

function entries(list) {
  return (list || []).map((item, index) => {
    if (typeof item === 'string') return { id: `entry-${index}-${item}`, title: item }
    return { ...item, id: item.id || `${item.eventId || 'entry'}-${index}`, title: item.title || item.name || 'Результат' }
  }).filter((item) => item.title)
}

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || ''
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function EventDetails({ item, event }) {
  return (
    <div className="success-detail">
      {event?.date || item.date ? <p><strong>Дата:</strong> {formatDate(event?.date || item.date)}</p> : null}
      {event?.organizer || item.organizer ? <p><strong>Организатор:</strong> {event?.organizer || item.organizer}</p> : null}
      {event?.place || item.place ? <p><strong>Место:</strong> {event?.place || item.place}</p> : null}
      {event?.format ? <p><strong>Формат:</strong> {event.format}</p> : null}
      {item.level ? <p><strong>Уровень:</strong> {item.level}</p> : null}
      {item.status ? <p><strong>Статус:</strong> {item.status === 'confirmed' ? 'Подтверждено' : item.status}</p> : null}
      {event?.description || item.description || item.note
        ? <p className="success-detail-description">{event?.description || item.description || item.note}</p>
        : <p className="success-detail-description">Дополнительные сведения об этом результате пока не добавлены.</p>}
    </div>
  )
}

function SuccessList({ title, empty, items, events, expanded, onToggle, kind }) {
  return (
    <section className="card success-section">
      <h2>{title}</h2>
      {items.length === 0 ? <p className="muted">{empty}</p> : (
        <ul className="success-interactive-list">
          {items.map((item) => {
            const event = events.find((entry) => entry.id === item.eventId)
            const isOpen = expanded === item.id
            return (
              <li className={isOpen ? 'success-item is-open' : 'success-item'} key={item.id}>
                <button
                  type="button"
                  className="success-item-trigger"
                  onClick={() => onToggle(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                >
                  <span className="success-item-mark">{kind === 'visit' ? '↗' : '★'}</span>
                  <span className="success-item-copy">
                    <span className="success-item-title">{item.title}</span>
                    <span className="success-item-meta">
                      {item.date ? formatDate(item.date) : (event?.date ? formatDate(event.date) : (kind === 'visit' ? 'Посещение' : 'Достижение'))}
                      {item.level ? ` · ${item.level}` : ''}
                    </span>
                  </span>
                  <span className="success-item-chevron">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen ? <EventDetails item={item} event={event} /> : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default function Success() {
  const apiRevision = useStoreRevision()
  const cabinet = studentCabinet()
  const [expanded, setExpanded] = useState(null)
  const events = useMemo(() => {
    try {
      return listEvents()
    } catch {
      return []
    }
  }, [apiRevision])
  const student = cabinet.student
  const attended = entries(student?.attended)
  const achievements = entries(student?.achievements)

  return (
    <main>
      <div className="container">
        <p className="lead">История участия в мероприятиях и подтверждённые результаты. Нажмите на запись, чтобы посмотреть подробности.</p>
        {!student ? (
          <p className="muted">Профиль ученика не найден.</p>
        ) : (
          <div className="grid-2 success-grid">
            <SuccessList
              title={`Посещения · ${attended.length}`}
              empty="Посещений пока нет."
              items={attended}
              events={events}
              expanded={expanded}
              onToggle={setExpanded}
              kind="visit"
            />
            <SuccessList
              title={`Достижения · ${achievements.length}`}
              empty="Подтверждённых достижений пока нет."
              items={achievements}
              events={events}
              expanded={expanded}
              onToggle={setExpanded}
              kind="achievement"
            />
          </div>
        )}
      </div>
    </main>
  )
}
