import { currentUser as apiUser, listMarketplace, dashboard, schoolInfo, INTERESTS } from '../data/store.js'
import { useStoreRevision } from '../data/hooks.js'
import { useEffect, useMemo, useState } from 'react'
import OrganizationShell from '../components/OrganizationShell.jsx'
import { currentUser, listEvents, listPartnerships, listSchools, publishEvent, sendPartnership, respondPartnership, updateEvent, eventRegistrations, updateEventRegistration, isDemoOrganization } from '../data/store.js'

const DEFAULT_ORG = ''
const SCHOOL_LIST = ['Лицей БГУ', 'Гимназия №1 Минск', 'СШ №4 Гродно', 'Гимназия №2 Брест']
const statusText = { moderation_pending: 'На модерации', rejected: 'Отклонено модератором', incoming: 'Входящий запрос', pending: 'Ожидает ответа', accepted: 'Согласовано', declined: 'Отклонено' }
const statusClass = { moderation_pending: 'badge-pending', rejected: 'badge-no', incoming: 'badge-muted', pending: 'badge-pending', accepted: 'badge-ok', declined: 'badge-no' }
const safeRead = (fn, fallback) => { try { const value = fn(); return Array.isArray(value) ? value : fallback } catch { return fallback } }
const dateText = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Дата не указана'

function Metric({ value, label, note }) { return <article className="card org-metric"><strong>{value}</strong><span>{label}</span>{note ? <small>{note}</small> : null}</article> }
function SectionTitle({ eyebrow, title, children }) { return <div className="org-section-head"><div><span className="org-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{children}</div> }

export default function Company() {
  const apiRevision = useStoreRevision()
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState('overview')
  const [expandedEvent, setExpandedEvent] = useState('')
  const [notice, setNotice] = useState('')
  const [demoNotice, setDemoNotice] = useState(false)
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 4200)
    return () => window.clearTimeout(timeout)
  }, [notice])
  const [pendingAction, setPendingAction] = useState('')
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [tab])
  const [query, setQuery] = useState('')
  const [eventTitle, setEventTitle] = useState('Практикум по алгоритмам и программированию')
  const [category, setCategory] = useState('project')
  const [interest, setInterest] = useState('Информатика')
  const [grade, setGrade] = useState('9–11')
  const [date, setDate] = useState('2026-12-19')
  const [deadline, setDeadline] = useState('2026-12-10')
  const [format, setFormat] = useState('смешанный')
  const [city, setCity] = useState('Минск')
  const [seats, setSeats] = useState('30')
  const [description, setDescription] = useState('Практическая программа для школьников: участники разберут алгоритмические задачи, поработают в командах и представят итоговый проект.')
  const [school, setSchool] = useState('Лицей БГУ')
  const [requestAudience, setRequestAudience] = useState('school')
  const [requestTitle, setRequestTitle] = useState('Практический IT-интенсив для школьников')
  const [requestText, setRequestText] = useState('Предлагаем провести в вашем учреждении бесплатный практический интенсив по программированию для учащихся 9–11 классов. Предоставим наставников и учебные материалы.')

  let user = null
  try { user = currentUser() } catch { user = null }
  const org = user?.orgName || DEFAULT_ORG
  const demoAccount = isDemoOrganization()
  const events = useMemo(() => safeRead(listEvents, []).filter((item) => item.organizer === org), [version, org, apiRevision])
  const partnerships = useMemo(() => safeRead(listPartnerships, []).filter((item) => item.from === org || item.to === org), [version, org, apiRevision])
  const marketplace = useMemo(() => listMarketplace(), [apiRevision])
  const schools = listSchools()
  const incoming = partnerships.filter((item) => item.to === org && item.status === 'incoming')
  const accepted = partnerships.filter((item) => item.status === 'accepted')
  const published = events.filter((item) => ['published', 'registration_closed', 'completed'].includes(item.status)).length
  const registrationsCount = events.reduce((sum, item) => sum + eventRegistrations(item.id).length, 0)
  const filteredSchools = schools.filter((item) => `${item} ${schoolInfo(item)?.city || ''}`.toLowerCase().includes(query.toLowerCase()))

  async function handlePublish(event) {
    event.preventDefault()
    if (demoAccount) { setDemoNotice(true); return }
    if (!eventTitle.trim() || !description.trim() || !date || !deadline || Number(seats) < 1 || pendingAction) return
    setPendingAction('publish')
    try {
      await publishEvent({ title: eventTitle.trim(), category, interests: [interest], grade, date, deadline, format, city, place: city, seats: Number(seats), description: description.trim(), organizer: org, terms: 'Регистрация через TalentHub.' })
      setVersion((value) => value + 1)
      setNotice('Успешно создано! Мероприятие отправлено на модерацию. Оно отображается во вкладке «Мои мероприятия» со статусом «На модерации».')
      setTab('events')
    } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message || 'Не удалось сохранить инициативу. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }
  async function handleRequest(event) {
    event.preventDefault()
    if (demoAccount) { setDemoNotice(true); return }
    if (!requestTitle.trim() || !requestText.trim() || pendingAction) return
    setPendingAction('request')
    try {
      const isPublic = requestAudience === 'marketplace'
      await sendPartnership({
        from: org,
        to: isPublic ? '' : school,
        title: requestTitle.trim(),
        text: requestText.trim(),
        description: requestText.trim(),
        visibility: isPublic ? 'public' : 'direct',
        audience: isPublic ? 'all_schools' : 'selected_school',
      })
      setVersion((value) => value + 1)
      setNotice(isPublic ? 'Запрос отправлен на модерацию. После допуска его увидят все школы.' : `Предложение отправлено: ${school}.`)
      setTab('partners')
    } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message || 'Не удалось отправить предложение. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }
  async function handleRespond(id, decision) {
    if (demoAccount) { setDemoNotice(true); return }

    if (pendingAction) return
    setPendingAction(`respond-${id}`)
    try {
      await respondPartnership(id, decision)
      setVersion((value) => value + 1)
      setNotice(decision === 'accepted' ? 'Запрос принят. Можно согласовать детали инициативы.' : 'Запрос отклонён.')
    } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message || 'Не удалось обновить запрос.') }
    finally { setPendingAction('') }
  }

  async function handleMarketplaceRespond(item) {
    if (demoAccount) { setDemoNotice(true); return }

    const alreadyResponded = partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === org)
    if (alreadyResponded) {
      setNotice('Вы уже отправили отклик на этот открытый запрос.')
      return
    }
    if (pendingAction) return
    setPendingAction(`market-${item.id}`)
    try {
      await sendPartnership({ from: org, to: item.from, title: item.title, text: `${org} заинтересована в сотрудничестве по запросу «${item.title}». Свяжитесь с нами, чтобы обсудить детали.`, description: `Отклик на публичный запрос «${item.title}». ${item.description || ''}`.trim(), status: 'incoming', parentRequestId: item.id })
      setVersion((value) => value + 1)
      setNotice(`Отклик отправлен организации «${item.from}».`)
    } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message || 'Не удалось отправить отклик. Попробуйте ещё раз.') }
    finally { setPendingAction('') }
  }

  return <OrganizationShell tabs={[['overview','Обзор','overview'],['events','Мои мероприятия','events'],['partners','Сотрудничество','partners'],['market','Запросы школ','market'],['schools','Учреждения','schools'],['create','Опубликовать мероприятие','create']]} activeTab={tab} onTabChange={(id) => { setTab(id); setNotice('') }}>
    <main className="org-page"><div className="container org-container">
      <section className="org-page-heading"><h1>Кабинет компании</h1><p>Управляйте образовательными инициативами, партнёрствами и предложениями для учреждений образования.</p></section>
      {demoNotice ? <div className="demo-action-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDemoNotice(false) }}><section className="demo-action-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-action-title"><button className="demo-action-close" type="button" aria-label="Закрыть" onClick={() => setDemoNotice(false)}>×</button><div className="demo-action-icon"><span>✦</span></div><span className="demo-action-kicker">TALENTHUB · ДЕМО-АККАУНТ</span><h2 id="demo-action-title">Эта возможность пока недоступна</h2><p>Вы можете знакомиться с кабинетом, но для этого действия нужна зарегистрированная организация. Создайте аккаунт школы или компании, чтобы пользоваться всеми возможностями TalentHub.</p><a className="demo-action-register" href="/organization-registration?role=company">Зарегистрировать организацию <span>→</span></a><button className="demo-action-back" type="button" onClick={() => setDemoNotice(false)}>Вернуться в демо-кабинет</button></section></div> : null}


    {notice ? <div className="notice org-notice action-toast" role="status"><span className="action-toast-check">✓</span>{notice}</div> : null}

    {tab === 'overview' ? <>
      <div className="org-metrics"><Metric value={events.length} label="Всего мероприятий" note={`${published} опубликовано`}/><Metric value={dashboard()?.counters.incoming_requests ?? incoming.length} label="Новых предложений" note="Запросы от учреждений"/><Metric value={dashboard()?.counters.total_requests ?? partnerships.length} label="Партнёрских запросов" note="Входящие и исходящие"/><Metric value={dashboard()?.counters.agreed_initiatives ?? accepted.length} label="Согласованных партнёрств" note="История сотрудничества"/><Metric value={registrationsCount} label="Регистраций" note="На ваши мероприятия"/></div>
      <div className="org-dashboard-grid"><section className="card org-panel"><SectionTitle eyebrow="ОБРАЗОВАТЕЛЬНЫЕ ПРОГРАММЫ" title="Ваши инициативы"/><div className="org-list">{events.slice(0,3).map((item) => <article className="org-list-item" key={item.id}><div className="org-list-icon">↗</div><div className="org-list-main"><strong>{item.title}</strong><small>{dateText(item.date)} · {item.city || 'Онлайн'}</small></div><span className={`badge ${item.status === 'published' ? 'badge-ok' : item.status === 'rejected' ? 'badge-no' : 'badge-pending'}`}>{item.status === 'published' ? 'Опубликовано' : item.status === 'registration_closed' ? 'Регистрация закрыта' : item.status === 'completed' ? 'Завершено' : item.status === 'rejected' ? 'Отклонено' : 'На модерации'}</span></article>)}{events.length === 0 ? <p className="muted">Опубликуйте первую инициативу, чтобы привлечь учащихся и учреждения.</p> : null}</div><button className="btn btn-ghost btn-small" onClick={() => setTab('events')}>Все мероприятия</button></section>
      <section className="card org-panel"><SectionTitle eyebrow="СОВМЕСТНАЯ РАБОТА" title="Сотрудничество"/><div className="org-list">{partnerships.slice(0,3).map((item) => <article className="org-list-item" key={item.id}><div className="org-list-icon">⇄</div><div className="org-list-main"><strong>{item.title}</strong><small>{item.from === org ? `Для: ${item.to}` : `От: ${item.from}`}</small></div><span className={`badge ${statusClass[item.status] || 'badge-muted'}`}>{statusText[item.status] || 'В обработке'}</span></article>)}{partnerships.length === 0 ? <p className="muted">Запросов пока нет.</p> : null}</div><button className="btn btn-ghost btn-small" onClick={() => setTab('partners')}>К сотрудничеству</button></section></div>
      <section className="org-quick-actions"><div><span className="org-eyebrow">РАСШИРЯЙТЕ СОТРУДНИЧЕСТВО</span><h2>Найдите учреждение для следующей инициативы</h2><p>Выберите школу или лицей, отправьте предложение и отслеживайте его статус в кабинете.</p></div><button className="btn btn-primary" onClick={() => setTab('schools')}>Найти учреждение →</button></section>
      <section className="card org-prestige"><div className="org-prestige-mark">✦</div><div><span className="org-eyebrow">РЕПУТАЦИЯ TALENTHUB</span><h2>Подтверждённый вклад важнее количества публикаций</h2><p>История согласованных и подтверждённых образовательных инициатив помогает партнёрам оценивать опыт организации. Публикация мероприятия или получение заявок сами по себе не повышают престиж.</p><button className="btn btn-ghost btn-small" onClick={() => setTab('partners')}>История сотрудничества</button></div></section>
    </> : null}

    {tab === 'events' ? <section className="card org-panel"><SectionTitle eyebrow="УПРАВЛЕНИЕ ИНИЦИАТИВАМИ" title="Мои мероприятия"><button className="btn btn-primary btn-small" onClick={() => setTab('create')}>＋ Опубликовать мероприятие</button></SectionTitle><div className="org-list">{events.map((item) => <article className="org-event-row" key={item.id}><div className="org-event-top"><span className="org-eyebrow">{item.category === 'project' ? 'ПРОЕКТНАЯ ДЕЯТЕЛЬНОСТЬ' : 'ОЛИМПИАДА'}</span><span className={`badge ${item.status === 'published' ? 'badge-ok' : item.status === 'rejected' ? 'badge-no' : 'badge-pending'}`}>{item.status === 'published' ? 'Опубликовано' : item.status === 'registration_closed' ? 'Регистрация закрыта' : item.status === 'completed' ? 'Завершено' : item.status === 'rejected' ? 'Отклонено' : 'На модерации'}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="org-event-meta"><span>◷ {dateText(item.date)}</span><span>⌖ {item.city || '—'}</span><span>Лимит: {item.seats || '—'}</span><span>{item.format || '—'}</span><span>Регистраций: {eventRegistrations(item.id).length}</span></div><div className="row org-event-actions"><button className="btn btn-ghost btn-small" type="button" onClick={() => setExpandedEvent(expandedEvent === item.id ? '' : item.id)}>{expandedEvent === item.id ? 'Скрыть участников' : 'Управлять участниками'}</button>{item.status === 'published' ? <button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'registration_closed' }); setVersion((v) => v + 1); setNotice('Регистрация на мероприятие закрыта.') } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message) } }}>Закрыть регистрацию</button> : null}{item.status === 'registration_closed' ? <button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'published' }); setVersion((v) => v + 1); setNotice('Регистрация снова открыта.') } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message) } }}>Открыть регистрацию</button> : null}{['published','registration_closed'].includes(item.status) ? <button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEvent(item.id, { status: 'completed' }); setVersion((v) => v + 1); setNotice('Мероприятие отмечено завершённым.') } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message) } }}>Завершить</button> : null}</div>{expandedEvent === item.id ? <div className="org-participants"><strong>Заявки участников</strong>{eventRegistrations(item.id).map((person) => <div className="org-participant-row" key={person.studentId}><div><b>{person.name}</b><small>{person.grade ? `${person.grade} класс` : 'Класс не указан'} · {person.status}{person.attended ? ' · Посещение подтверждено' : ''}</small></div><div className="row">{['подана', 'на рассмотрении', 'лист ожидания'].includes(person.status) ? <><button className="btn btn-primary btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { status: 'подтверждена' }); setVersion((v) => v + 1) } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message) } }}>Подтвердить</button><button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { status: 'отклонена' }); setVersion((v) => v + 1) } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message) } }}>Отклонить</button></> : null}{person.status === 'подтверждена' && !person.attended ? <button className="btn btn-ghost btn-small" type="button" onClick={async () => { try { await updateEventRegistration(item.id, person.studentId, { attended: true }); setVersion((v) => v + 1); setNotice(`Посещение подтверждено: ${person.name}.`) } catch (error) { if (error.code !== 'demo_restricted') setNotice(error.message) } }}>Отметить посещение</button> : null}</div></div>)}{eventRegistrations(item.id).length === 0 ? <p className="muted">Заявок пока нет. Они появятся после регистрации школьников.</p> : null}</div> : null}</article>)}{events.length === 0 ? <div className="org-empty"><strong>Пока нет опубликованных инициатив</strong><p>Создайте образовательную программу или мероприятие для учащихся.</p><button className="btn btn-primary" onClick={() => setTab('create')}>Опубликовать мероприятие</button></div> : null}</div></section> : null}

    {tab === 'market' ? <section className="card org-panel"><SectionTitle eyebrow="ОТКРЫТЫЙ РЫНОК TALENTHUB" title="Открытые запросы школ"/><p className="muted">Публичные запросы школ и лицеев, открытые для компаний и академий. Откликнитесь, если готовы предложить ресурсы, экспертов или совместную программу.</p><div className="org-list">{marketplace.map((item) => { const responded = partnerships.some((entry) => entry.parentRequestId === item.id && entry.from === org); return <article className="org-partner-card" key={item.id}><div className="org-market-card-head"><span className="org-eyebrow">ОТКРЫТЫЙ ЗАПРОС · {item.from}</span><span className="badge badge-pending">Открыт</span></div><h3>{item.title}</h3><p>{item.description || item.text || 'Описание не добавлено.'}</p><button className="btn btn-primary btn-small" disabled={responded || Boolean(pendingAction)} onClick={() => handleMarketplaceRespond(item)}>{pendingAction === `market-${item.id}` ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : responded ? 'Отклик отправлен' : 'Откликнуться'}</button></article>})}{marketplace.length === 0 ? <div className="org-empty"><strong>Пока нет открытых запросов</strong><p>Публичные запросы образовательных учреждений появятся здесь.</p></div> : null}</div></section> : null}

    {tab === 'partners' ? <div className="org-dashboard-grid org-partner-layout"><section className="card org-panel"><SectionTitle eyebrow="ВХОДЯЩИЕ И ИСХОДЯЩИЕ" title="Запросы на сотрудничество"/><div className="org-list">{partnerships.map((item) => <article className="org-partner-card" key={item.id}><div className="row spread"><span className="org-eyebrow">{item.parentRequestId ? 'ОТКЛИК ШКОЛЫ НА ПУБЛИЧНЫЙ ЗАПРОС' : item.to === org ? 'ВХОДЯЩИЙ ЗАПРОС' : item.visibility === 'public' ? 'ПУБЛИЧНЫЙ ЗАПРОС' : 'ВАШЕ ПРЕДЛОЖЕНИЕ'}</span><span className={`badge ${statusClass[item.status] || 'badge-muted'}`}>{statusText[item.status] || 'В обработке'}</span></div><h3>{item.title}</h3><p className="muted">{item.from || '—'} <span aria-hidden="true">→</span> {item.visibility === 'public' ? 'Общий рынок · все школы' : item.to || '—'}</p><p>{item.description || item.text || 'Описание не добавлено.'}</p>{item.canDecide ? <div className="row"><button className="btn btn-primary btn-small" disabled={Boolean(pendingAction)} onClick={() => handleRespond(item.id, 'accepted')}>{pendingAction === 'respond-' + item.id ? <><span className="th-spinner" aria-hidden="true" /> Обрабатываем…</> : 'Принять запрос'}</button><button className="btn btn-ghost btn-small" disabled={Boolean(pendingAction)} onClick={() => handleRespond(item.id, 'declined')}>Отклонить</button></div> : null}</article>)}{partnerships.length === 0 ? <p className="muted">Пока нет запросов. Выберите школу и отправьте предложение о сотрудничестве.</p> : null}</div></section>
      <section className="card org-panel"><SectionTitle eyebrow="НОВОЕ СОТРУДНИЧЕСТВО" title="Предложить сотрудничество"/><p className="muted">Отправьте адресное предложение выбранной школе или опубликуйте его для всех учреждений. Это запрос о сотрудничестве, а не публикация мероприятия.</p><form className="stack" onSubmit={handleRequest}><div className="field"><span>Кому адресовать предложение</span><div className="org-audience-options" role="group" aria-label="Получатели предложения"><button type="button" className={requestAudience === 'school' ? 'selected' : ''} aria-pressed={requestAudience === 'school'} onClick={() => setRequestAudience('school')}><strong>Конкретному учреждению</strong><small>Выбрать школу или гимназию и отправить адресно</small></button><button type="button" className={requestAudience === 'marketplace' ? 'selected' : ''} aria-pressed={requestAudience === 'marketplace'} onClick={() => setRequestAudience('marketplace')}><strong>Общий рынок</strong><small>Опубликовать предложение для всех учреждений</small></button></div></div>{requestAudience === 'school' ? <label className="field"><span>Образовательное учреждение</span><select value={school} onChange={(e) => setSchool(e.target.value)}>{schools.map((item) => <option key={item}>{item}</option>)}</select></label> : <p className="notice">Публикацию увидят все образовательные учреждения. Школы смогут отправить отклик, а вы — принять или отклонить его.</p>}<label className="field"><span>Тема предложения</span><input value={requestTitle} onChange={(e) => setRequestTitle(e.target.value)} required/></label><label className="field"><span>Формат и условия</span><textarea rows={5} value={requestText} onChange={(e) => setRequestText(e.target.value)} required/></label><button className="btn btn-primary" type="submit" disabled={Boolean(pendingAction)}>{pendingAction === 'request' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : requestAudience === 'marketplace' ? 'Опубликовать предложение для всех школ' : 'Отправить предложение школе'}</button></form></section></div> : null}

    {tab === 'schools' ? <section className="card org-panel"><SectionTitle eyebrow="КАТАЛОГ ОРГАНИЗАЦИЙ" title="Образовательные учреждения"/><p className="muted">Выберите потенциального партнёра для совместной образовательной инициативы.</p><label className="field org-search"><span>Поиск учреждения</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Название или город"/></label><div className="org-school-grid">{filteredSchools.map((item, index) => <article className="org-school-card" key={item}><div className="org-school-avatar">{item.slice(0,1)}</div><div className="org-school-content"><strong>{item}</strong><small>{schoolInfo(item)?.city || '—'}</small><p>Потенциальный партнёр для олимпиад, проектных смен и образовательных программ.</p><button className="btn btn-ghost btn-small" onClick={() => { setSchool(item); setTab('partners') }}>Предложить сотрудничество →</button></div></article>)}</div>{filteredSchools.length === 0 ? <p className="muted">Учреждений по вашему запросу не найдено.</p> : null}</section> : null}

    {tab === 'create' ? <section className="card org-panel org-form-panel"><SectionTitle eyebrow="НОВАЯ ОБРАЗОВАТЕЛЬНАЯ ПРОГРАММА" title="Опубликовать мероприятие"/><p className="muted">Опишите мероприятие для учащихся. После проверки оно станет доступно в общем каталоге TalentHub.</p><form className="stack" onSubmit={handlePublish}><div className="grid-2"><label className="field"><span>Название мероприятия</span><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required/></label><label className="field"><span>Тип</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="project">Проектная деятельность</option><option value="olympiad">Олимпиада</option></select></label><label className="field"><span>Направление</span><select value={interest} onChange={(e) => setInterest(e.target.value)}>{INTERESTS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Целевая аудитория</span><select value={grade} onChange={(e) => setGrade(e.target.value)}>{['7–8','8–9','9–10','9–11','10–11','7–11'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Город / площадка</span><input value={city} onChange={(e) => setCity(e.target.value)} required/></label><label className="field"><span>Формат</span><select value={format} onChange={(e) => setFormat(e.target.value)}><option value="очно">Очно</option><option value="онлайн">Онлайн</option><option value="смешанный">Смешанный</option></select></label><label className="field"><span>Дата проведения</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} min="2026-11-06" required/></label><label className="field"><span>Дедлайн регистрации</span><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required/></label><label className="field"><span>Количество мест</span><input type="number" min="1" max="10000" value={seats} onChange={(e) => setSeats(e.target.value)} required/></label></div><label className="field"><span>Описание инициативы</span><textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required/></label><div className="org-form-footer"><span className="muted">Организатор: {org}</span><button className="btn btn-primary" type="submit" disabled={Boolean(pendingAction)}>{pendingAction === 'publish' ? <><span className="th-spinner" aria-hidden="true" /> Отправляем…</> : 'Отправить на проверку →'}</button></div></form></section> : null}
    </div></main>
  </OrganizationShell>
}
