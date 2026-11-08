import { useDialogFocus } from '../components/useDialogFocus.js'
import { useStoreRevision } from '../data/hooks.js'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cancelRegistration, listEvents, registerForEvent, studentCabinet } from '../data/store.js'

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—'
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function categoryLabel(event) {
  if (event.category === 'project') {
    return event.projectKind ? `Проектная деятельность · ${event.projectKind}` : 'Проектная деятельность'
  }
  if (event.category === 'olympiad') return 'Олимпиада'
  return 'Мероприятие'
}

function dateParts(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { day: '—', month: '' }
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  const [, month, day] = value.split('-')
  return { day, month: months[Number(month) - 1] || '' }
}

function statusClass(status) {
  if (status === 'подтверждена') return 'badge badge-ok'
  if (status === 'отклонена') return 'badge badge-no'
  if (status === 'отменена' || status === 'лист ожидания') return 'badge badge-muted'
  return 'badge badge-pending'
}

export default function Applications() {
  const apiRevision = useStoreRevision()
  const navigate = useNavigate()
  const catalog = useMemo(() => {
    try {
      const loaded = listEvents()
      return Array.isArray(loaded) ? loaded : []
    } catch {
      return []
    }
  }, [apiRevision])
  const cabinet = studentCabinet()
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(null)

  const detailRef = useDialogFocus(Boolean(open), () => setOpen(null))

  function refresh() {
    try {
      studentCabinet()
    } catch {
      /* снимок остаётся */
    }
  }

  async function onCancel(eventId) {
    let result
    try {
      result = await cancelRegistration(eventId)
    } catch (error) {
      setMessage(error.message || 'Не удалось отменить заявку.')
      return
    }
    if (!result.ok && result.reason === 'auth') {
      setMessage('Чтобы отменить заявку, войдите в свой аккаунт.')
      return
    }
    if (!result.ok) {
      setMessage('Эту заявку отменить нельзя.')
      return
    }
    setMessage('Заявка отменена.')
    setOpen((current) => (current && current.eventId === eventId ? { ...current, status: 'отменена' } : current))
    refresh()
  }

  async function onRegister(event) {
    let result
    try {
      result = await registerForEvent(event.id)
    } catch (error) {
      setMessage(error.message || 'Не удалось отправить заявку.')
      return
    }
    if (!result.ok && result.reason === 'auth') {
      navigate('/auth')
      return
    }
    if (!result.ok) {
      setMessage('Регистрация на это мероприятие закрыта.')
      return
    }
    setMessage(result.already ? `Заявка уже есть: ${result.status}.` : 'Заявка подана.')
    setOpen((current) => (current ? { ...current, status: result.status || 'подана' } : current))
    refresh()
  }

  const items = cabinet.applications || []
  const opened = open
    ? catalog.find((event) => event.id === open.eventId) || {
      id: open.eventId,
      title: open.title,
      organizer: open.organizer,
      category: open.category,
      date: open.date,
      city: open.city,
      format: open.format,
    }
    : null

  return (
    <main>
      <div className="container">
        <p className="lead">Регистрации на мероприятия и их статусы.</p>
        {cabinet.demo ? (
          <p className="notice">Войдите, чтобы видеть и отменять свои заявки.</p>
        ) : null}
        {message ? <p className="notice">{message}</p> : null}
        {items.length === 0 ? (
          <p className="muted">Заявок пока нет. <Link to="/events">Выберите мероприятие</Link> и зарегистрируйтесь.</p>
        ) : (
          <div className="apply-grid">
            {items.map((item) => {
              const date = dateParts(item.date)
              return (
                <article
                  key={`${item.eventId}-${item.title}`}
                  className="card apply-card"
                  onClick={() => setOpen(item)}
                >
                  <div className="apply-date">
                    <span className="apply-day">{date.day}</span>
                    <span className="apply-month">{date.month}</span>
                  </div>
                  <div className="apply-body">
                    <div className="spread">
                      <h2 className="card-title">{item.title}</h2>
                      <span className={statusClass(item.status)}>{item.status}</span>
                    </div>
                    <p className="muted">
                      {item.organizer || 'Организатор не указан'}
                      {item.city ? ` · ${item.city}` : ''}
                    </p>
                    {cabinet.loggedIn && item.status !== 'отменена' && item.status !== 'отклонена' ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={item.attended || item.eventStatus === 'completed'}
                        onClick={(mouse) => {
                          mouse.stopPropagation()
                          onCancel(item.eventId)
                        }}
                      >
                        Отменить заявку
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
      {opened ? (
        <div className="detail-backdrop" onClick={() => setOpen(null)}>
          <div
            className="detail-panel"
            ref={detailRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-detail-title"
            onClick={(mouse) => mouse.stopPropagation()}
          >
            <div className="spread">
              <span className="badge badge-muted">{categoryLabel(opened)}</span>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(null)}>Закрыть</button>
            </div>
            <h2 id="application-detail-title">{opened.title}</h2>
            <dl className="detail-grid">
              <dt>Организатор</dt>
              <dd>{opened.organizer || '—'}</dd>
              <dt>Интересы</dt>
              <dd>{(opened.interests || []).join(', ') || '—'}</dd>
              <dt>Класс</dt>
              <dd>{opened.grade || '—'}</dd>
              <dt>Дата</dt>
              <dd>{formatDate(opened.date)}</dd>
              <dt>Место</dt>
              <dd>{[opened.city, opened.place].filter(Boolean).join(', ') || '—'}</dd>
              <dt>Формат</dt>
              <dd>{opened.format || '—'}</dd>
              <dt>Условия</dt>
              <dd>{opened.terms || '—'}</dd>
              <dt>Дедлайн</dt>
              <dd>{formatDate(opened.deadline)}</dd>
              <dt>Мест</dt>
              <dd>{opened.seats ?? '—'}</dd>
            </dl>
            {opened.description ? <p>{opened.description}</p> : null}
            {open.status && open.status !== 'отменена' ? (
              <p className="notice">Ваша заявка: {open.status}.</p>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={() => onRegister(opened)}>Подать заявку</button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
