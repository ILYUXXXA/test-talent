import { ActionButton } from '../components/ActionControls.jsx'
import { useDialogFocus } from '../components/useDialogFocus.js'
import OrganizationAccounts from '../components/OrganizationAccounts.jsx'
import CabinetNav from '../components/CabinetNav.jsx'
import { moderationQueue, moderate } from '../data/store.js'
import { useStoreRevision } from '../data/hooks.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function TabIcon({ children }) {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  )
}

const TABS = [
  { id: 'accounts', label: 'Аккаунты организаций', icon: <TabIcon><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h4" /></TabIcon> },
  {
    id: 'events',
    label: 'Мероприятия',
    icon: (
      <TabIcon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </TabIcon>
    ),
  },
  {
    id: 'partnerships',
    label: 'Партнёрство',
    icon: (
      <TabIcon>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
      </TabIcon>
    ),
  },
  {
    id: 'achievements',
    label: 'Достижения',
    icon: (
      <TabIcon>
        <circle cx="12" cy="9" r="5" />
        <path d="M8.5 13.2 7 21l5-2.4L17 21l-1.5-7.8" />
      </TabIcon>
    ),
  },
]

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—'
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function categoryLabel(category) {
  if (category === 'project' || category === 'Проектная деятельность') return 'Проектная деятельность'
  return 'Олимпиада'
}

function pendingOf(list) {
  return list.filter((item) => item.status === 'pending')
}

function ModeratorBar({ section, onSection, counts }) {
  return (
    <header className="header student-header">
      <div className="header-inner parent-bar">
        <Link to="/" className="brand-lockup" aria-label="TalentHub — главная"><span className="brand-mark">t.</span><span className="brand-word">Talent<span>Hub</span></span></Link>
        <p className="header-greet">Здравствуйте!</p>
        <CabinetNav activeKey={section} className="nav student-tabs mod-tabs" aria-label="Разделы модерации">
          {TABS.map((tab) => {
            const count = counts[tab.id]
            return (
              <ActionButton
                key={tab.id}
                type="button"
                className={section === tab.id ? 'active' : undefined}
                aria-current={section === tab.id ? 'page' : undefined}
                onClick={() => onSection(tab.id)}
              >
                {tab.icon}
                {tab.label}
                {count > 0 ? <span className="tab-count">{count}</span> : null}
              </ActionButton>
            )
          })}
        </CabinetNav>
      </div>
    </header>
  )
}

function QueueCard({ item, kind, onOpen }) {
  return (
    <ActionButton type="button" className="card mod-card" onClick={onOpen}>
      <span className="badge badge-pending">На проверке</span>
      <span className="card-title">{item.title}</span>
      {kind === 'events' ? (
        <>
          <p>{categoryLabel(item.category)}. Организатор — {item.organizer}.</p>
          <p className="muted">
            {formatDate(item.date)} · {item.city}, {item.place}. {item.format}, классы {item.grade}. Дедлайн {formatDate(item.deadline)}, мест {item.seats}.
          </p>
          <p>{item.description}</p>
        </>
      ) : null}
      {kind === 'partnerships' ? (
        <>
          <p>Запрос: {item.from} → {item.to}.</p>
          <p className="muted">{formatDate(item.date)} · {item.city} · {item.format}</p>
          <p>{item.text}</p>
        </>
      ) : null}
      {kind === 'achievements' ? (
        <>
          <p>{item.student}, {item.school}. {item.categoryLabel}.</p>
          <p className="muted">{formatDate(item.date)}</p>
          <p>{item.text}</p>
        </>
      ) : null}
    </ActionButton>
  )
}

function Detail({ item, kind, onClose, onDecide }) {
  const detailRef = useDialogFocus(true, onClose)
  const actions = kind === 'events'
    ? [
      { status: 'published', label: 'Опубликовать', tone: 'btn btn-primary btn-small' },
      { status: 'rejected', label: 'Отклонить', tone: 'btn btn-danger btn-small' },
    ]
    : kind === 'partnerships'
      ? [
        { status: 'incoming', label: 'Допустить', tone: 'btn btn-primary btn-small' },
        { status: 'rejected', label: 'Отклонить', tone: 'btn btn-danger btn-small' },
      ]
      : [
        { status: 'confirmed', label: 'Подтвердить', tone: 'btn btn-primary btn-small' },
        { status: 'rejected', label: 'Отклонить', tone: 'btn btn-danger btn-small' },
      ]

  const note = kind === 'events'
    ? 'Публикация добавит мероприятие в каталог.'
    : kind === 'partnerships'
      ? 'Допуск передаст запрос школе.'
      : 'Подтверждение добавит достижение в профиль ученика.'

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div
        className="detail-panel"
        ref={detailRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="moderator-detail-title"
        onClick={(mouse) => mouse.stopPropagation()}
      >
        <div className="spread">
          <span className="badge badge-pending">На проверке</span>
          <ActionButton type="button" className="btn btn-ghost btn-small" onClick={onClose}>Закрыть</ActionButton>
        </div>
        <h2 id="moderator-detail-title">{item.title}</h2>
        {kind === 'events' ? (
          <dl className="detail-grid">
            <dt>Категория</dt>
            <dd>{categoryLabel(item.category)}</dd>
            <dt>Организатор</dt>
            <dd>{item.organizer}</dd>
            <dt>Интересы</dt>
            <dd>{item.interests.join(', ')}</dd>
            <dt>Класс</dt>
            <dd>{item.grade}</dd>
            <dt>Дата</dt>
            <dd>{formatDate(item.date)}</dd>
            <dt>Место</dt>
            <dd>{[item.city, item.place].filter(Boolean).join(', ')}</dd>
            <dt>Формат</dt>
            <dd>{item.format}</dd>
            <dt>Условия</dt>
            <dd>{item.terms}</dd>
            <dt>Дедлайн</dt>
            <dd>{formatDate(item.deadline)}</dd>
            <dt>Мест</dt>
            <dd>{item.seats}</dd>
          </dl>
        ) : null}
        {kind === 'partnerships' ? (
          <dl className="detail-grid">
            <dt>От кого</dt>
            <dd>{item.from}</dd>
            <dt>Кому</dt>
            <dd>{item.to}</dd>
            <dt>Дата</dt>
            <dd>{formatDate(item.date)}</dd>
            <dt>Город</dt>
            <dd>{item.city}</dd>
            <dt>Формат</dt>
            <dd>{item.format}</dd>
          </dl>
        ) : null}
        {kind === 'achievements' ? (
          <dl className="detail-grid">
            <dt>Ученик</dt>
            <dd>{item.student}</dd>
            <dt>Школа</dt>
            <dd>{item.school}</dd>
            <dt>Категория</dt>
            <dd>{item.categoryLabel}</dd>
            <dt>Дата</dt>
            <dd>{formatDate(item.date)}</dd>
          </dl>
        ) : null}
        {item.description ? <p>{item.description}</p> : null}
        {item.text ? <p>{item.text}</p> : null}
        <p className="muted">{note}</p>
        <div className="row">
          {actions.map((action) => (
            <ActionButton
              key={action.status}
              type="button"
              className={action.tone}
              onClick={() => onDecide(action.status)}
            >
              {action.label}
            </ActionButton>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const apiRevision = useStoreRevision()
  const { events = [], partnerships = [], achievements = [] } = moderationQueue() || {}
  const [error, setError] = useState('')
  const [section, setSection] = useState('events')
  const [open, setOpen] = useState(null)

  const queues = {
    events: pendingOf(events),
    partnerships: pendingOf(partnerships),
    achievements: pendingOf(achievements),
  }
  const counts = {
    events: queues.events.length,
    partnerships: queues.partnerships.length,
    achievements: queues.achievements.length,
  }
  const visible = queues[section] || []


  function onSection(id) {
    setSection(id)
    setOpen(null)
  }

  async function onDecide(status) {
    if (!open) return
    try { await moderate(open.kind, open.id, status); setOpen(null); setError('') }
    catch (error) { if (error.code === 'demo_restricted') return; setError(error.message) }
  }

  return (
    <>
      <ModeratorBar section={section} onSection={onSection} counts={counts} />
      <main>
        <div className="container">
          
          {error ? <p className="notice" role="alert">{error}</p> : null}
          {section === 'accounts' ? <OrganizationAccounts /> : visible.length === 0 ? <p className="muted">Нет заявок</p> : (
            <div className="mod-grid">
              {visible.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  kind={section}
                  onOpen={() => setOpen({ ...item, kind: section })}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      {open ? (
        <Detail
          item={open}
          kind={open.kind}
          onClose={() => setOpen(null)}
          onDecide={onDecide}
        />
      ) : null}
    </>
  )
}
