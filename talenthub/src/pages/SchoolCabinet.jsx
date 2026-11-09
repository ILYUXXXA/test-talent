import { ActionButton, ActionForm } from '../components/ActionControls.jsx'
import { currentUser as apiUser, listMarketplace, dashboard, schoolInfo } from '../data/store.js'
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
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState('overview')
  const [expandedEvent, setExpandedEvent] = useState('')
  const [notice, setRawNotice] = useState('')
  function setNotice(message) {
    if (message === 'Это действие недоступно на демо-аккаунте') return
    setRawNotice(message)
  }
  function handleSchoolActionError(error, fallback) {
    if (error.code !== 'demo_restricted') setNotice(error.message || fallback)
  }
  const [pendingAction, setPendingAction] = useState('')
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [tab])
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
    if (!eventTitle.trim() || !description.trim() || !eventDate || !deadline || Number(seats) < 1 || pendingAction) return
    setPendingAction('publish')
    try {
      await publishEvent({ title: eventTitle.trim(), category, interests: [interest], grade, city, date: eventDate, deadline, format, seats: Number(seats), description: description.trim(), organizer: SCHOOL, place: city, terms: 'Регистрация через TalentHub.' })
      setVersion((value) => value + 1)
      setNotice('')
      setTab('events')
    } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error, 'Не удалось сохранить мероприятие. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }
  async function handleRespond(id, decision) {
    if (pendingAction) return
    setPendingAction('respond')
    try {
      await respondPartnership(id, decision)
      setVersion((value) => value + 1)
      setNotice('')
    } catch (error) {
      if (error.code !== 'demo_restricted') handleSchoolActionError(error)
    } finally {
      setPendingAction('')
    }
  }
  async function handleRequest(event) {
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
    } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error, 'Не удалось отправить запрос. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }

  async function handleMarketplaceRespond(item) {

    if (pendingAction) return
    setPendingAction('market')
    const alreadyResponded = partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === SCHOOL)
    if (alreadyResponded) {
      setNotice('')
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
      setNotice('')
    } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error, 'Не удалось отправить отклик. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }

  return <><OrganizationShell tabs={[['overview','Обзор','overview'],['events','Мои мероприятия','events'],['prestige','Престиж','prestige'],['partners','Сотрудничество','partners'],['market','Предложения компаний','market'],['create','Опубликовать мероприятие','create']]} activeTab={tab} onTabChange={(id) => { setTab(id); setNotice('') }}>
    <main className="org-page"><div className="container org-container">
      <section className="org-page-heading"><h1>Кабинет образовательного учреждения</h1><p>Управляйте мероприятиями, отслеживайте активность учащихся и взаимодействуйте с компаниями-партнёрами.</p></section>


    {notice && !/демо|зарегистрируйте организацию|demo_restricted/i.test(String(notice)) ? <div className="notice org-notice action-toast" role="status"><span className="action-toast-check">✓</span>{notice}</div> : null}

    {tab === 'overview' ? <>
      <div className="org-metrics"><Metric value={students.length} label="Учеников в профиле" note="Учащиеся лицея"/><Metric value={events.length} label="Всего мероприятий" note={`${activeEvents} опубликовано`}/><Metric value={pendingEvents} label="На модерации" note="Ожидают проверки"/><Metric value={dashboard()?.counters.incoming_requests ?? incoming.length} label="Новых запросов" note="От компаний и академий"/><Metric value={publishedRegistrations} label="Регистраций" note="По вашим мероприятиям"/></div>
      <div className="org-dashboard-grid">
        <section className="card org-panel"><SectionTitle eyebrow="ВАША АКТИВНОСТЬ" title="Мероприятия"/><div className="org-list">{events.slice(0,3).map((item) => <article className="org-list-item" key={item.id}><div className="org-list-icon">{item.category === 'project' ? '↗' : '✳'}</div><div className="org-list-main"><strong>{item.title}</strong><small>{dateText(item.date)} · {item.format || 'Формат не указан'}</small></div><span className={`badge ${item.status === 'published' ? 'badge-ok' : item.status === 'rejected' ? 'badge-no' : 'badge-pending'}`}>{item.status === 'published' ? 'Опубликовано' : item.status === 'registration_closed' ? 'Регистрация закрыта' : item.status === 'completed' ? 'Завершено' : item.status === 'rejected' ? 'Отклонено' : 'На модерации'}</span></article>)}{events.length === 0 ? <p className="muted">Пока нет мероприятий. Создайте первое, чтобы привлечь участников.</p> : null}</div><ActionButton className="btn btn-ghost btn-small" onClick={() => setTab('events')}>Все мероприятия</ActionButton></section>
        <section className="card org-panel"><SectionTitle eyebrow="СОВМЕСТНЫЕ ВОЗМОЖНОСТИ" title="Сотрудничество"/><div className="org-list">{partnerships.slice(0,3).map((item) => <article className="org-list-item" key={item.id}><div className="org-list-icon">⇄</div><div className="org-list-main"><strong>{item.title}</strong><small>{item.from === SCHOOL ? `Для: ${item.to}` : `От: ${item.from}`}</small></div><span className={`badge ${statusClass[item.status] || 'badge-muted'}`}>{statusText[item.status] || 'В обработке'}</span></article>)}{partnerships.length === 0 ? <p className="muted">Запросов пока нет.</p> : null}</div><ActionButton className="btn btn-ghost btn-small" onClick={() => setTab('partners')}>К сотрудничеству</ActionButton></section>
      </div>
      <section className="org-quick-actions"><div><span className="org-eyebrow">СЛЕДУЮЩИЙ ШАГ</span><h2>Создайте новую возможность для учеников</h2><p>Опубликуйте олимпиаду или проектную инициативу, а затем отслеживайте её статус и регистрации.</p></div><ActionButton className="btn btn-primary" onClick={() => setTab('create')}>Опубликовать мероприятие <span aria-hidden="true">→</span></ActionButton></section>
    </> : null}

    {tab === 'events' ? <section className="card org-panel"><SectionTitle eyebrow="УПРАВЛЕНИЕ ПУБЛИКАЦИЯМИ" title="Мероприятия лицея"><ActionButton className="btn btn-primary btn-small" onClick={() => setTab('create')}>＋ Опубликовать мероприятие</ActionButton></SectionTitle><div className="org-list">{events.map((item) => <article className="org-event-row" key={item.id}><div className="org-event-top"><span className="org-eyebrow">{item.category === 'project' ? 'ПРОЕКТНАЯ ДЕЯТЕЛЬНОСТЬ' : 'ОЛИМПИАДА'}</span><span className={`badge ${item.status === 'published' ? 'badge-ok' : item.status === 'rejected' ? 'badge-no' : 'badge-pending'}`}>{item.status === 'published' ? 'Опубликовано' : item.status === 'registration_closed' ? 'Регистрация закрыта' : item.status === 'completed' ? 'Завершено' : item.status === 'rejected' ? 'Отклонено' : 'На модерации'}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="org-event-meta"><span>◷ {dateText(item.date)}</span><span>⌖ {item.city || 'Минск'}</span><span>Лимит: {item.seats || '—'}</span><span>Формат: {item.format || '—'}</span><span>Регистраций: {eventRegistrations(item.id).length}</span></div><div className="row org-event-actions"><ActionButton className="btn btn-ghost btn-small" type="button" onClick={() => setExpandedEvent(expandedEvent === item.id ? '' : item.id)}>{expandedEvent === item.id ? 'Скрыть участников' : 'Управлять участниками'}</ActionButton>{item.status === 'published' ? <ActionButton className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'registration_closed' }); setVersion((v) => v + 1); setNotice('') } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error) } }}>Закрыть регистрацию</ActionButton> : null}{item.status === 'registration_closed' ? <ActionButton className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'published' }); setVersion((v) => v + 1); setNotice('') } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error) } }}>Открыть регистрацию</ActionButton> : null}{['published','registration_closed'].includes(item.status) ? <ActionButton className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'completed' }); setVersion((v) => v + 1); setNotice('') } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error) } }}>Завершить</ActionButton> : null}</div>{expandedEvent === item.id ? <div className="org-participants"><strong>Заявки участников</strong>{eventRegistrations(item.id).map((person) => <div className="org-participant-row" key={person.studentId}><div><b>{person.name}</b><small>{person.grade ? `${person.grade} класс` : 'Класс не указан'} · {person.status}{person.attended ? ' · Посещение подтверждено' : ''}</small></div><div className="row">{['подана', 'на рассмотрении', 'лист ожидания'].includes(person.status) ? <><ActionButton className="btn btn-primary btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { status: 'подтверждена' }); setVersion((v) => v + 1) } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error) } }}>Подтвердить</ActionButton><ActionButton className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { status: 'отклонена' }); setVersion((v) => v + 1) } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error) } }}>Отклонить</ActionButton></> : null}{person.status === 'подтверждена' && !person.attended ? <ActionButton className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { attended: true }); setVersion((v) => v + 1); setNotice('') } catch (error) { if (error.code === 'demo_restricted') return; handleSchoolActionError(error) } }}>Отметить посещение</ActionButton> : null}</div></div>)}{eventRegistrations(item.id).length === 0 ? <p className="muted">Заявок пока нет. Они появятся после регистрации школьников.</p> : null}</div> : null}</article>)}{events.length === 0 ? <div className="org-empty"><strong>Здесь появятся ваши мероприятия</strong><p>Создайте первую публикацию — она будет отправлена на модерацию.</p><ActionButton className="btn btn-primary" onClick={() => setTab('create')}>Опубликовать мероприятие</ActionButton></div> : null}</div></section> : null}

    {tab === 'prestige' ? <><section className="card org-panel org-prestige-details"><SectionTitle eyebrow="РЕПУТАЦИЯ TALENTHUB" title="Престиж образовательного учреждения"/><p className="muted">Престиж отражает подтверждённую образовательную активность: участие учеников, достижения, посещённые мероприятия и устойчивое сотрудничество. Ниже показана фактическая статистика кабинета, а не условный рейтинг.</p><div className="org-metrics"><Metric value={students.length} label="Учеников в профиле"/><Metric value={achievementCount} label="Достижений учеников"/><Metric value={publishedRegistrations} label="Регистраций на мероприятия"/><Metric value={students.reduce((sum, student) => sum + (student.attended || []).length, 0)} label="Посещений мероприятий"/><Metric value={partnerships.filter((item) => item.status === 'accepted').length} label="Согласованных партнёрств"/></div></section><section className="card org-panel"><SectionTitle eyebrow="СООБЩЕСТВО ЛИЦЕЯ" title="Ученики и их активность"/><p className="muted">Интересы, регистрации, посещённые мероприятия и достижения учащихся. Персональные данные доступны только представителям учреждения.</p><label className="field org-search"><span>Найти ученика или направление</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Например, информатика или Алина"/></label><div className="org-student-grid">{filteredStudents.map((student) => <article className="org-student-card" key={student.id}><div className="org-student-avatar">{personName(student).split(' ').map((part) => part[0]).slice(0,2).join('')}</div><div><strong>{personName(student)}</strong><small>{student.grade ? `${student.grade} класс` : 'Класс не указан'}</small></div><div className="org-student-facts"><span><b>{(student.signedUp || student.registered || []).length}</b> регистраций</span><span><b>{(student.attended || []).length}</b> посещений</span><span><b>{(student.achievements || []).length}</b> достижений</span></div><div className="chips">{(student.interests || []).map((item) => <span className="chip" key={item}>{item}</span>)}</div></article>)}</div>{filteredStudents.length === 0 ? <p className="muted">По вашему запросу учеников не найдено.</p> : null}</section></> : null}

    {tab === 'market' ? <section className="card org-panel"><SectionTitle eyebrow="ОТКРЫТЫЙ РЫНОК TALENTHUB" title="Предложения компаний"/><p className="muted">Публичные предложения компаний и академий для всех образовательных учреждений. Выберите подходящее и отправьте отклик.</p><div className="org-list">{marketplace.map((item) => { const responded = partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === SCHOOL); return <article className="org-partner-card" key={item.id}><div className="row spread"><span className="org-eyebrow">ОТКРЫТОЕ ПРЕДЛОЖЕНИЕ · {item.from}</span><span className="badge badge-pending">Открыто</span></div><h3>{item.title}</h3><p>{item.description || item.text || 'Описание не добавлено.'}</p><ActionButton className="btn btn-primary btn-small" disabled={responded || Boolean(pendingAction)} onClick={() => handleMarketplaceRespond(item)}>{pendingAction === 'market' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : responded ? 'Отклик отправлен' : 'Откликнуться'}</ActionButton></article>})}{marketplace.length === 0 ? <div className="org-empty"><strong>Пока нет открытых предложений</strong><p>Публичные предложения компаний появятся здесь.</p></div> : null}</div></section> : null}

    {tab === 'partners' ? <div className="org-dashboard-grid org-partner-layout"><section className="card org-panel"><SectionTitle eyebrow="ВХОДЯЩИЕ И ИСХОДЯЩИЕ" title="История сотрудничества"/><div className="org-list">{partnerships.map((item) => <article className="org-partner-card" key={item.id}><div className="row spread"><span className="org-eyebrow">{item.visibility === 'public' ? 'ПУБЛИЧНЫЙ ЗАПРОС ДЛЯ ШКОЛ' : item.parentRequestId ? 'ВАШ ОТКЛИК НА ПУБЛИЧНЫЙ ЗАПРОС' : item.from === SCHOOL ? 'ИСХОДЯЩИЙ ЗАПРОС' : 'ПРЕДЛОЖЕНИЕ ПАРТНЁРА'}</span><span className={`badge ${statusClass[item.status] || 'badge-muted'}`}>{statusText[item.status] || 'В обработке'}</span></div><h3>{item.title}</h3><p className="muted">{item.from || '—'} <span aria-hidden="true">→</span> {item.visibility === 'public' ? 'Все образовательные учреждения' : item.to || '—'}</p><p>{item.description || item.text || 'Описание не добавлено.'}</p>{['incoming', 'pending'].includes(item.status) && item.to === SCHOOL ? <div className="row"><ActionButton className="btn btn-primary btn-small" disabled={Boolean(pendingAction)} onClick={() => handleRespond(item.id, 'accepted')}>{pendingAction === 'respond' ? <><span className="th-spinner" aria-hidden="true" /> Обрабатываем…</> : 'Принять запрос'}</ActionButton><ActionButton className="btn btn-ghost btn-small" disabled={Boolean(pendingAction)} onClick={() => handleRespond(item.id, 'declined')}>Отклонить</ActionButton></div> : null}{item.visibility === 'public' && item.audience === 'all_schools' && item.status === 'pending' ? <div className="row"><ActionButton className="btn btn-primary btn-small" onClick={() => handleMarketplaceRespond(item)} disabled={Boolean(pendingAction) || partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === SCHOOL)}>{pendingAction === 'market' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === SCHOOL) ? 'Отклик отправлен' : 'Откликнуться'}</ActionButton></div> : null}</article>)}{partnerships.length === 0 ? <p className="muted">Пока нет обращений. Отправьте запрос компании или опубликуйте его для всех партнёров.</p> : null}</div></section>
      <section className="card org-panel"><SectionTitle eyebrow="ПОИСК ПАРТНЁРА" title="Запросить сотрудничество"/><p className="muted">Опишите, какая компания может помочь школе: например, провести мастер-класс, предоставить экспертов или поддержать проект.</p><ActionForm className="stack" onSubmit={handleRequest}><div className="field"><span>Кому адресовать запрос</span><div className="org-audience-options" role="group" aria-label="Получатели запроса"><ActionButton type="button" className={requestAudience === "company" ? "selected" : ""} aria-pressed={requestAudience === "company"} onClick={() => setRequestAudience("company")}><strong>Конкретной компании</strong><small>Адресный запрос выбранной организации</small></ActionButton><ActionButton type="button" className={requestAudience === "marketplace" ? "selected" : ""} aria-pressed={requestAudience === "marketplace"} onClick={() => setRequestAudience("marketplace")}><strong>Открытый рынок</strong><small>Публикация для всех компаний и академий</small></ActionButton></div></div>{requestAudience === "company" ? <label className="field"><span>Компания или академия</span><select value={partner} onChange={(e) => setPartner(e.target.value)}>{COMPANIES.map((item) => <option key={item}>{item}</option>)}</select></label> : <p className="notice">Публичный запрос увидят компании и академии, которые смогут отправить отклик.</p>}<label className="field"><span>Тема сотрудничества</span><input value={requestTitle} onChange={(e) => setRequestTitle(e.target.value)} required/></label><label className="field"><span>Описание и условия</span><textarea rows={5} value={requestText} onChange={(e) => setRequestText(e.target.value)} required/></label><ActionButton className="btn btn-primary" type="submit" disabled={Boolean(pendingAction)}>{pendingAction === 'request' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : requestAudience === 'marketplace' ? 'Опубликовать запрос для компаний' : 'Отправить запрос компании'}</ActionButton></ActionForm></section></div> : null}

    {tab === 'create' ? <section className="card org-panel org-form-panel"><SectionTitle eyebrow="НОВАЯ ПУБЛИКАЦИЯ" title="Опубликовать мероприятие"/><p className="muted">Заполните основные сведения. После отправки мероприятие получит статус «На модерации» и появится в каталоге после проверки.</p><ActionForm className="stack" onSubmit={handlePublish}><div className="grid-2"><label className="field"><span>Название мероприятия</span><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required/></label><label className="field"><span>Тип мероприятия</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="olympiad">Олимпиада</option><option value="project">Проектная деятельность</option></select></label><label className="field"><span>Направление</span><select value={interest} onChange={(e) => setInterest(e.target.value)}>{INTERESTS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Целевая аудитория</span><select value={grade} onChange={(e) => setGrade(e.target.value)}>{['7–8','8–9','9–10','10–11','7–11'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Город</span><select value={city} onChange={(e) => setCity(e.target.value)}>{CITIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Формат</span><select value={format} onChange={(e) => setFormat(e.target.value)}><option value="очно">Очно</option><option value="онлайн">Онлайн</option><option value="смешанный">Смешанный</option></select></label><label className="field"><span>Дата проведения</span><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} min="2026-11-06" required/></label><label className="field"><span>Дедлайн регистрации</span><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required/></label><label className="field"><span>Количество мест</span><input type="number" min="1" max="10000" value={seats} onChange={(e) => setSeats(e.target.value)} required/></label></div><label className="field"><span>Описание</span><textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required/></label><div className="org-form-footer"><span className="muted">Организатор: {SCHOOL}</span><ActionButton className="btn btn-primary" type="submit" disabled={Boolean(pendingAction)}>{pendingAction === 'publish' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : 'Отправить на проверку →'}</ActionButton></div></ActionForm></section> : null}
    </div></main>
    </OrganizationShell></>
}
