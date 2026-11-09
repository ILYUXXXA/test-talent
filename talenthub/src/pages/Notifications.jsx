import { ActionButton } from '../components/ActionControls.jsx'
import { useStoreRevision } from '../data/hooks.js'
import { useState } from 'react'
import { markNotificationRead, studentCabinet } from '../data/store.js'

const TYPE_LABELS = {
  confirmation: 'Подтверждение заявки',
  deadline: 'Дедлайн',
  interest: 'По интересам',
  invite: 'Приглашение',
}

function TypeIcon({ type }) {
  const props = { className: 'inbox-svg', viewBox: '0 0 24 24', 'aria-hidden': true }
  if (type === 'deadline') {
    return <svg {...props}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>
  }
  if (type === 'interest') {
    return <svg {...props}><path d="m12 3 2.2 4.6L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.6L12 3z" /></svg>
  }
  if (type === 'invite') {
    return <svg {...props}><path d="M4 7h16v10H4z" /><path d="m4 7 8 6 8-6" /></svg>
  }
  return <svg {...props}><circle cx="12" cy="12" r="8" /><path d="m8.5 12.5 2.2 2.2 4.8-5" /></svg>
}

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—'
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

export default function Notifications() {
  const apiRevision = useStoreRevision()
  const items = studentCabinet().notifications || []
  const [error, setError] = useState('')
  const unread = items.filter((item) => !item.read).length

  async function openNotification(item) {
    if (item.read) return
    try { await markNotificationRead(item.id); setError('') } catch (error) { if (error.code === 'demo_restricted') return; setError(error.message) }
  }

  return (
    <main className="student-workspace">
      <div className="container">
        <p className="lead">
          {error || (items.length === 0
            ? 'Сообщений пока нет.'
            : unread > 0
              ? `Непрочитанных: ${unread}. Нажмите на уведомление, чтобы отметить его прочитанным.`
              : 'Все уведомления прочитаны.')}
        </p>
        {items.length === 0 ? (
          <p className="muted">Когда школа, администратор или организатор напишут, сообщение появится здесь.</p>
        ) : (
          <ul className="inbox">
            {items.map((item) => (
              <li key={item.id}>
                <ActionButton
                  type="button"
                  className={item.read ? 'inbox-row' : 'inbox-row unread'}
                  onClick={() => openNotification(item)}
                  aria-label={`${item.read ? 'Прочитано' : 'Непрочитано'}: ${item.title}. Отметить прочитанным`}
                >
                  <span className="inbox-icon" title={TYPE_LABELS[item.type] || 'Сообщение'}>
                    <TypeIcon type={item.type} />
                  </span>
                  <span className="inbox-content">
                    <span className="inbox-title">{item.title}</span>
                    <span className="inbox-body">{item.body}</span>
                    {!item.read ? <span className="inbox-unread-label"><span className="inbox-unread-dot" />Непрочитано · нажмите, чтобы прочитать</span> : null}
                  </span>
                  <time className="inbox-time" dateTime={item.date}>{formatDate(item.date)}</time>
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
