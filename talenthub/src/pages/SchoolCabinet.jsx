import { currentUser as apiUser, listMarketplace, dashboard, schoolInfo, isDemoOrganization } from '../data/store.js'
import { useStoreRevision } from '../data/hooks.js'
import { useEffect, useMemo, useState } from 'react'
import OrganizationShell from '../components/OrganizationShell.jsx'
import {
  schoolStudents,
  listEvents,
  listPartnerships,
  sendPartnership,
  respondPartnership,
  publishEvent,
  updateEvent,
  eventRegistrations,
  updateEventRegistration,
  COMPANIES,
  INTERESTS,
  CITIES,
  GRADES,
} from '../data/store.js'

const statusText = { moderation_pending: 'На модерации', rejected: 'Отклонено модератором', incoming: 'Входящий запрос', pending: 'Ожидает ответа', accepted: 'Согласовано', declined: 'Отклонено' }
const statusClass = { moderation_pending: 'badge-pending', rejected: 'badge-no', incoming: 'badge-muted', pending: 'badge-pending', accepted: 'badge-ok', declined: 'badge-no' }
const safeRead = (fn, fallback) => { try { const value = fn(); return Array.isArray(value) ? value : fallback } catch { return fallback } }
const personName = (student) => [student.firstName, student.lastName].filter(Boolean).join(' ') || student.name || 'Ученик'
const itemText = (items) => (items || []).map((item) => typeof item === 'string' ? item : item?.title || item?.name || '').filter(Boolean).join(', ') || '—'
const dateText = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Дата не указана'

function Metric({ value, label, note }) {
  return <article className="card org-metric"><strong>{value}</strong><span>{label}</span>{note ? <small>{note}</small> : null}</article>
}
function SectionTitle({ eyebrow, title, children }) {
  return <div className="org-section-head"><div><span className="org-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{children}</div>
}

export default function SchoolCabinet() {
  const apiRevision = useStoreRevision()
  const SCHOOL = apiUser()?.orgName || ''
  const demoAccount = isDemoOrganization()
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState('overview')
  const [expandedEvent, setExpandedEvent] = useState('')
  const [notice, setNotice] = useState('')
  const [demoNotice, setDemoNotice] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 4200)
    return () => window.clearTimeout(timeout)
  }, [notice])
  const [query, setQuery] = useState('')
  const [eventTitle, setEventTitle] = useState('Открытая олимпиада по математике')
  const [category, setCategory] = useState('olympiad')
  const [interest, setInterest] = useState('Математика')
  const [grade, setGrade] = useState('10–11')
  const [city, setCity] = useState('Минск')
  const [eventDate, setEventDate] = useState('2026-12-12')
  const [deadline, setDeadline] = useState('2026-12-05')
  const [format, setFormat] = useState('очно')
  const [seats, setSeats] = useState('40')
  const [description, setDescription] = useState('Открытый тур для учащихся 10–11 классов. Участников ждут задачи повышенной сложности и разбор решений.')
  const [partner, setPartner] = useState(COMPANIES[0])
  const [requestAudience, setRequestAudience] = useState('company')
  const [requestTitle, setRequestTitle] = useState('Менторы для проектной мастерской')
  const [requestText, setRequestText] = useState('Ищем партнёра для практической мастерской: ученики 10 класса создадут собственные проекты под руководством специалистов.')

  const students = useMemo(() => schoolStudents(), [apiRevision])
  const events = useMemo(() => listEvents(), [apiRevision])
  const partnerships = useMemo(() => listPartnerships(), [apiRevision])
  const incoming = partnerships.filter((item) => item.canDecide)
  const marketplace = useMemo(() => listMarketplace(), [apiRevision])
  const achievementCount = students.reduce((sum, student) => sum + (student.achievements || []).length, 0)
  const activeEvents = events.filter((item) => ['published', 'registration_closed', 'completed'].includes(item.status)).length
  const pendingEvents = events.filter((item) => item.status === 'pending').length
  const publishedRegistrations = events.reduce((sum, item) => sum + eventRegistrations(item.id).length, 0)
  const filteredStudents = students.filter((student) => `${personName(student)} ${student.grade || ''} ${itemText(student.interests)}`.toLowerCase().includes(query.toLowerCase()))

  async function handlePublish(event) {
    event.preventDefault()
    if (demoAccount) { setDemoNotice(true); return }
    if (!eventTitle.trim() || !description.trim() || !eventDate || !deadline || Number(seats) < 1 || pendingAction) return
    setPendingAction('publish')
    try {
      await publishEvent({ title: eventTitle.trim(), category, interests: [interest], grade, city, date: eventDate, deadline, format, seats: Number(seats), description: description.trim(), organizer: SCHOOL, place: city, terms: 'Регистрация через TalentHub.' })
      setVersion((value) => value + 1)
      setNotice('Успешно создано! Олимпиада отправлена на модерацию. Она отображается во вкладке «Мероприятия» со статусом «На модерации».')
      setTab('events')
    } catch (error) { setNotice(error.message || 'Не удалось сохранить мероприятие. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }
  async function handleRespond(id, decision) {
    if (demoAccount) { setDemoNotice(true); return }

    if (pendingAction) return
    setPendingAction('respond')
    try { await respondPartnership(id, decision) } catch (error) { setNotice(error.message); setPendingAction(''); return }
    setPendingAction('')
    setVersion((value) => value + 1)
    setNotice(decision === 'accepted' ? 'Запрос принят. Можно переходить к согласованию деталей.' : 'Запрос отклонён.')
  }
  async function handleRequest(event) {
    if (demoAccount) { setDemoNotice(true); return }

    event.preventDefault()
    if (!requestTitle.trim() || !requestText.trim() || pendingAction) return
    setPendingAction('request')
    try {
      const isPublic = requestAudience === 'marketplace'
      await sendPartnership({ from: SCHOOL, to: isPublic ? '' : partner, title: requestTitle.trim(), text: requestText.trim(), description: requestText.trim(), visibility: isPublic ? 'public' : 'direct', audience: isPublic ? 'all_companies' : 'selected_company' })
      setVersion((value) => value + 1)
      setNotice(isPublic ? 'Запрос отправлен на модерацию. После допуска компании смогут откликнуться.' : `Запрос отправлен организации «${partner}».`)
      setRequestTitle('')
      setRequestText('')
      setTab('partners')
    } catch (error) { setNotice(error.message || 'Не удалось отправить запрос. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }

  async function handleMarketplaceRespond(item) {
    if (demoAccount) { setDemoNotice(true); return }

    if (pendingAction) return
    setPendingAction('market')
    const alreadyResponded = partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === SCHOOL)
    if (alreadyResponded) {
      setNotice('Вы уже отправили отклик на этот запрос.')
      setPendingAction('')
      return
    }
    try {
      await sendPartnership({
        from: SCHOOL,
        to: item.from,
        title: item.title,
        text: `Лицей БГУ заинтересован в сотрудничестве по запросу «${item.title}». Свяжитесь с нами, чтобы обсудить детали.`,
        description: `Отклик на публичный запрос «${item.title}». ${item.description || ''}`.trim(),
        status: 'incoming',
        parentRequestId: item.id,
      })
      setVersion((value) => value + 1)
      setNotice(`Отклик отправлен организации «${item.from}».`)
    } catch (error) { setNotice(error.message || 'Не удалось отправить отклик. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }

  return <OrganizationShell tabs={[['overview','Обзор','overview'],['events','Мои мероприятия','events'],['prestige','Престиж','prestige'],['partners','Сотрудничество','partners'],['market','Предложения компаний','market'],['create','Опубликовать мероприятие','create']]} activeTab={tab} onTabChange={(id) => { setTab(id); setNotice('') }}>
    <main className="org-page"><div className="container org-container">
      <section className="org-page-heading"><h1>Кабинет образовательного учреждения</h1><p>Управляйте мероприятиями, отслеживайте активность учащихся и взаимодействуйте с компаниями-партнёрами.</p></section>
      {demoNotice ? <div className="demo-action-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDemoNotice(false) }}><section className="demo-action-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-action-title"><button className="demo-action-close" type="button" aria-label="Закрыть" onClick={() => setDemoNotice(false)}>×</button><div className="demo-action-icon"><span>✦</span></div><span className="demo-action-kicker">TALENTHUB · ДЕМО-АККАУНТ</span><h2 id="demo-action-title">Эта возможность пока недоступна</h2><p>Вы можете знакомиться с кабинетом, но для этого действия нужна зарегистрированная организация. Создайте аккаунт школы или компании, чтобы пользоваться всеми возможностями TalentHub.</p><a className="demo-action-register" href="/organization-registration?role=school">Зарегистрировать организацию <span>→</span></a><button className="demo-action-back" type="button" onClick={() => setDemoNotice(false)}>Вернуться в демо-кабинет</button></section></div> : null}


    {notice ? <div className="notice org-notice action-toast" role="status"><span className="action-toast-check">✓</span>{notice}</div> : null}

    {tab === 'overview' ? <>
      <div className="org-metrics"><Metric value={students.length} label="Учеников в профиле" note="Учащиеся лицея"/><Metric value={events.length} label="Всего мероприятий" note={`${activeEvents} опубликовано`}/><Metric value={pendingEvents} label="На модерации" note="Ожидают проверки"/><Metric value={dashboard()?.counters.incoming_requests ?? incoming.length} label="Новых запросов" note="От компаний и академий"/><Metric value={publishedRegistrations} label="Регистраций" note="По вашим мероприятиям"/></div>
      <div className="org-dashboard-grid">
        <section className="card org-panel"><SectionTitle eyebrow="ВАША АКТИВНОСТЬ" title="Мероприятия"/><div className="org-list">{events.slice(0,3).map((item) => <article className="org-list-item" key={item.id}><div className="org-list-icon">{item.category === 'project' ? '↗' : '✳'}</div><div className="org-list-main"><strong>{item.title}</strong><small>{dateText(item.date)} · {item.format || 'Формат не указан'}</small></div><span className={`badge ${item.status === 'published' ? 'badge-ok' : item.status === 'rejected' ? 'badge-no' : 'badge-pending'}`}>{item.status === 'published' ? 'Опубликовано' : item.status === 'registration_closed' ? 'Регистрация закрыта' : item.status === 'completed' ? 'Завершено' : item.status === 'rejected' ? 'Отклонено' : 'На модерации'}</span></article>)}{events.length === 0 ? <p className="muted">Пока нет мероприятий. Создайте первое, чтобы привлечь участников.</p> : null}</div><button className="btn btn-ghost btn-small" onClick={() => setTab('events')}>Все мероприятия</button></section>
        <section className="card org-panel"><SectionTitle eyebrow="СОВМЕСТНЫЕ ВОЗМОЖНОСТИ" title="Сотрудничество"/><div className="org-list">{partnerships.slice(0,3).map((item) => <article className="org-list-item" key={item.id}><div className="org-list-icon">⇄</div><div className="org-list-main"><strong>{item.title}</strong><small>{item.from === SCHOOL ? `Для: ${item.to}` : `От: ${item.from}`}</small></div><span className={`badge ${statusClass[item.status] || 'badge-muted'}`}>{statusText[item.status] || 'В обработке'}</span></article>)}{partnerships.length === 0 ? <p className="muted">Запросов пока нет.</p> : null}</div><button className="btn btn-ghost btn-small" onClick={() => setTab('partners')}>К сотрудничеству</button></section>
      </div>
      <section className="org-quick-actions"><div><span className="org-eyebrow">СЛЕДУЮЩИЙ ШАГ</span><h2>Создайте новую возможность для учеников</h2><p>Опубликуйте олимпиаду или проектную инициативу, а затем отслеживайте её статус и регистрации.</p></div><button className="btn btn-primary" onClick={() => setTab('create')}>Опубликовать мероприятие <span aria-hidden="true">→</span></button></section>
    </> : null}

    {tab === 'events' ? <section className="card org-panel"><SectionTitle eyebrow="УПРАВЛЕНИЕ ПУБЛИКАЦИЯМИ" title="Мероприятия лицея"><button className="btn btn-primary btn-small" onClick={() => setTab('create')}>＋ Опубликовать мероприятие</button></SectionTitle><div className="org-list">{events.map((item) => <article className="org-event-row" key={item.id}><div className="org-event-top"><span className="org-eyebrow">{item.category === 'project' ? 'ПРОЕКТНАЯ ДЕЯТЕЛЬНОСТЬ' : 'ОЛИМПИАДА'}</span><span className={`badge ${item.status === 'published' ? 'badge-ok' : item.status === 'rejected' ? 'badge-no' : 'badge-pending'}`}>{item.status === 'published' ? 'Опубликовано' : item.status === 'registration_closed' ? 'Регистрация закрыта' : item.status === 'completed' ? 'Завершено' : item.status === 'rejected' ? 'Отклонено' : 'На модерации'}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="org-event-meta"><span>◷ {dateText(item.date)}</span><span>⌖ {item.city || 'Минск'}</span><span>Лимит: {item.seats || '—'}</span><span>Формат: {item.format || '—'}</span><span>Регистраций: {eventRegistrations(item.id).length}</span></div><div className="row org-event-actions"><button className="btn btn-ghost btn-small" type="button" onClick={() => setExpandedEvent(expandedEvent === item.id ? '' : item.id)}>{expandedEvent === item.id ? 'Скрыть участников' : 'Управлять участниками'}</button>{item.status === 'published' ? <button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'registration_closed' }); setVersion((v) => v + 1); setNotice('Регистрация на мероприятие закрыта.') } catch (error) { setNotice(error.message) } }}>Закрыть регистрацию</button> : null}{item.status === 'registration_closed' ? <button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'published' }); setVersion((v) => v + 1); setNotice('Регистрация снова открыта.') } catch (error) { setNotice(error.message) } }}>Открыть регистрацию</button> : null}{['published','registration_closed'].includes(item.status) ? <button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'completed' }); setVersion((v) => v + 1); setNotice('Мероприятие отмечено завершённым.') } catch (error) { setNotice(error.message) } }}>Завершить</button> : null}</div>{expandedEvent === item.id ? <div className="org-participants"><strong>Заявки участников</strong>{eventRegistrations(item.id).map((person) => <div className="org-participant-row" key={person.studentId}><div><b>{person.name}</b><small>{person.grade ? `${person.grade} класс` : 'Класс не указан'} · {person.status}{person.attended ? ' · Посещение подтверждено' : ''}</small></div><div className="row">{['подана', 'на рассмотрении', 'лист ожидания'].includes(person.status) ? <><button className="btn btn-primary btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { status: 'подтверждена' }); setVersion((v) => v + 1) } catch (error) { setNotice(error.message) } }}>Подтвердить</button><button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { status: 'отклонена' }); setVersion((v) => v + 1) } catch (error) { setNotice(error.message) } }}>Отклонить</button></> : null}{person.status === 'подтверждена' && !person.attended ? <button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { attended: true }); setVersion((v) => v + 1); setNotice(`Посещение подтверждено: ${person.name}.`) } catch (error) { setNotice(error.message) } }}>Отметить посещение</button> : null}</div></div>)}{eventRegistrations(item.id).length === 0 ? <p className="muted">Заявок пока нет. Они появятся после регистрации школьников.</p> : null}</div> : null}</article>)}{events.length === 0 ? <div className="org-empty"><strong>Здесь появятся ваши мероприятия</strong><p>Создайте первую публикацию — она будет отправлена на модерацию.</p><button className="btn btn-primary" onClick={() => setTab('create')}>Опубликовать мероприятие</button></div> : null}</div></section> : null}

    {tab === 'prestige' ? <><section className="card org-panel org-prestige-details"><SectionTitle eyebrow="РЕПУТАЦИЯ TALENTHUB" title="Престиж образовательного учреждения"/><p className="muted">Престиж отражает подтверждённую образовательную активность: участие учеников, достижения, посещённые мероприятия и устойчивое сотрудничество. Ниже показана фактическая статистика кабинета, а не условный рейтинг.</p><div className="org-metrics"><Metric value={students.length} label="Учеников в профиле"/><Metric value={achievementCount} label="Достижений учеников"/><Metric value={publishedRegistrations} label="Регистраций на мероприятия"/><Metric value={students.reduce((sum, student) => sum + (student.attended || []).length, 0)} label="Посещений мероприятий"/><Metric value={partnerships.filter((item) => item.status === 'accepted').length} label="Согласованных партнёрств"/></div></section><section className="card org-panel"><SectionTitle eyebrow="СООБЩЕСТВО ЛИЦЕЯ" title="Ученики и их активность"/><p className="muted">Интересы, регистрации, посещённые мероприятия и достижения учащихся. Персональные данные доступны только представителям учреждения.</p><label className="field org-search"><span>Найти ученика или направление</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Например, информатика или Алина"/></label><div className="org-student-grid">{filteredStudents.map((student) => <article className="org-student-card" key={student.id}><div className="org-student-avatar">{personName(student).split(' ').map((part) => part[0]).slice(0,2).join('')}</div><div><strong>{personName(student)}</strong><small>{student.grade ? `${student.grade} класс` : 'Класс не указан'}</small></div><div className="org-student-facts"><span><b>{(student.signedUp || student.registered || []).length}</b> регистраций</span><span><b>{(student.attended || []).length}</b> посещений</span><span><b>{(student.achievements || []).length}</b> достижений</span></div><div className="chips">{(student.interests || []).map((item) => <span className="chip" key={item}>{item}</span>)}</div></article>)}</div>{filteredStudents.length === 0 ? <p className="muted">По вашему запросу учеников не найдено.</p> : null}</section></> : null}

    {tab === 'market' ? <section className="card org-panel"><SectionTitle eyebrow="ОТКРЫТЫЙ РЫНОК TALENTHUB" title="Предложения компаний"/><p className="muted">Публичные предложения компаний и академий для всех образовательных учреждений. Выберите подходящее и отправьте отклик.</p><div className="org-list">{marketplace.map((item) => { const responded = partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === SCHOOL); return <article className="org-partner-card" key={item.id}><div className="row spread"><span className="org-eyebrow">ОТКРЫТОЕ ПРЕДЛОЖЕНИЕ · {item.from}</span><span className="badge badge-pending">Открыто</span></div><h3>{item.title}</h3><p>{item.description || item.text || 'Описание не добавлено.'}</p><button className="btn btn-primary btn-small" disabled={responded || Boolean(pendingAction)} onClick={() => handleMarketplaceRespond(item)}>{pendingAction === 'market' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : responded ? 'Отклик отправлен' : 'Откликнуться'}</button></article>})}{marketplace.length === 0 ? <div className="org-empty"><strong>Пока нет открытых предложений</strong><p>Публичные предложения компаний появятся здесь.</p></div> : null}</div></section> : null}

    {tab === 'partners' ? <div className="org-dashboard-grid org-partner-layout"><section className="card org-panel"><SectionTitle eyebrow="ВХОДЯЩИЕ И ИСХОДЯЩИЕ" title="История сотрудничества"/><div className="org-list">{partnerships.map((item) => <article className="org-partner-card" key={item.id}><div className="row spread"><span className="org-eyebrow">{item.visibility === 'public' ? 'ПУБЛИЧНЫЙ ЗАПРОС ДЛЯ ШКОЛ' : item.parentRequestId ? 'ВАШ ОТКЛИК НА ПУБЛИЧНЫЙ ЗАПРОС' : item.from === SCHOOL ? 'ИСХОДЯЩИЙ ЗАПРОС' : 'ПРЕДЛОЖЕНИЕ ПАРТНЁРА'}</span><span className={`badge ${statusClass[item.status] || 'badge-muted'}`}>{statusText[item.status] || 'В обработке'}</span></div><h3>{item.title}</h3><p className="muted">{item.from || '—'} <span aria-hidden="true">→</span> {item.visibility === 'public' ? 'Все образовательные учреждения' : item.to || '—'}</p><p>{item.description || item.text || 'Описание не добавлено.'}</p>{['incoming', 'pending'].includes(item.status) && item.to === SCHOOL ? <div className="row"><button className="btn btn-primary btn-small" disabled={Boolean(pendingAction)} onClick={() => handleRespond(item.id, 'accepted')}>{pendingAction === 'respond' ? <><span className="th-spinner" aria-hidden="true" /> Обрабатываем…</> : 'Принять запрос'}</button><button className="btn btn-ghost btn-small" disabled={Boolean(pendingAction)} onClick={() => handleRespond(item.id, 'declined')}>Отклонить</button></div> : null}{item.visibility === 'public' && item.audience === 'all_schools' && item.status === 'pending' ? <div className="row"><button className="btn btn-primary btn-small" onClick={() => handleMarketplaceRespond(item)} disabled={Boolean(pendingAction) || partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === SCHOOL)}>{pendingAction === 'market' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === SCHOOL) ? 'Отклик отправлен' : 'Откликнуться'}</button></div> : null}</article>)}{partnerships.length === 0 ? <p className="muted">Пока нет обращений. Отправьте запрос компании или опубликуйте его для всех партнёров.</p> : null}</div></section>
      <section className="card org-panel"><SectionTitle eyebrow="ПОИСК ПАРТНЁРА" title="Запросить сотрудничество"/><p className="muted">Опишите, какая компания может помочь школе: например, провести мастер-класс, предоставить экспертов или поддержать проект.</p><form className="stack" onSubmit={handleRequest}><div className="field"><span>Кому адресовать запрос</span><div className="org-audience-options" role="group" aria-label="Получатели запроса"><button type="button" className={requestAudience === "company" ? "selected" : ""} aria-pressed={requestAudience === "company"} onClick={() => setRequestAudience("company")}><strong>Конкретной компании</strong><small>Адресный запрос выбранной организации</small></button><button type="button" className={requestAudience === "marketplace" ? "selected" : ""} aria-pressed={requestAudience === "marketplace"} onClick={() => setRequestAudience("marketplace")}><strong>Открытый рынок</strong><small>Публикация для всех компаний и академий</small></button></div></div>{requestAudience === "company" ? <label className="field"><span>Компания или академия</span><select value={partner} onChange={(e) => setPartner(e.target.value)}>{COMPANIES.map((item) => <option key={item}>{item}</option>)}</select></label> : <p className="notice">Публичный запрос увидят компании и академии, которые смогут отправить отклик.</p>}<label className="field"><span>Тема сотрудничества</span><input value={requestTitle} onChange={(e) => setRequestTitle(e.target.value)} required/></label><label className="field"><span>Описание и условия</span><textarea rows={5} value={requestText} onChange={(e) => setRequestText(e.target.value)} required/></label><button className="btn btn-primary" type="submit" disabled={Boolean(pendingAction)}>{pendingAction === 'request' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : requestAudience === 'marketplace' ? 'Опубликовать запрос для компаний' : 'Отправить запрос компании'}</button></form></section></div> : null}

    {tab === 'create' ? <section className="card org-panel org-form-panel"><SectionTitle eyebrow="НОВАЯ ПУБЛИКАЦИЯ" title="Опубликовать мероприятие"/><p className="muted">Заполните основные сведения. После отправки мероприятие получит статус «На модерации» и появится в каталоге после проверки.</p><form className="stack" onSubmit={handlePublish}><div className="grid-2"><label className="field"><span>Название мероприятия</span><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required/></label><label className="field"><span>Тип мероприятия</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="olympiad">Олимпиада</option><option value="project">Проектная деятельность</option></select></label><label className="field"><span>Направление</span><select value={interest} onChange={(e) => setInterest(e.target.value)}>{INTERESTS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Целевая аудитория</span><select value={grade} onChange={(e) => setGrade(e.target.value)}>{['7–8','8–9','9–10','10–11','7–11'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Город</span><select value={city} onChange={(e) => setCity(e.target.value)}>{CITIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Формат</span><select value={format} onChange={(e) => setFormat(e.target.value)}><option value="очно">Очно</option><option value="онлайн">Онлайн</option><option value="смешанный">Смешанный</option></select></label><label className="field"><span>Дата проведения</span><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} min="2026-11-06" required/></label><label className="field"><span>Дедлайн регистрации</span><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required/></label><label className="field"><span>Количество мест</span><input type="number" min="1" max="10000" value={seats} onChange={(e) => setSeats(e.target.value)} required/></label></div><label className="field"><span>Описание</span><textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required/></label><div className="org-form-footer"><span className="muted">Организатор: {SCHOOL}</span><button className="btn btn-primary" type="submit" disabled={Boolean(pendingAction)}>{pendingAction === 'publish' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : 'Отправить на проверку →'}</button></div></form></section> : null}
    </div></main>
  </OrganizationShell>
}
