import { ActionButton } from '../components/ActionControls.jsx'
import { useDialogFocus } from '../components/useDialogFocus.js'
import CabinetNav from '../components/CabinetNav.jsx'
import { useStoreRevision } from '../data/hooks.js'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EventFeed from '../components/EventFeed.jsx'
import FamilyInvitation from '../components/FamilyInvitation.jsx'
import { parentCabinet, selectChild, suggestToChild } from '../data/store.js'

function categoryId(item) {
  return `${item.subject}|${item.direction}`
}

function categoryTitle(id) {
  const [subject, direction = ''] = String(id).split('|')
  if (!direction) return subject || id
  return `${subject} · ${direction.charAt(0).toUpperCase()}${direction.slice(1)}`
}

function factFor(school, category) {
  if (!school || !category) return null
  return (school.indicators || []).find((item) => categoryId(item) === category) || null
}

const EMPTY_CABINET = {
  loggedIn: false,
  role: null,
  user: null,
  children: [],
  activeId: null,
  suggestions: [],
  events: [],
  schools: [],
}

function readCabinet() {
  try {
    const data = parentCabinet()
    return data && typeof data === 'object' ? data : EMPTY_CABINET
  } catch {
    return EMPTY_CABINET
  }
}

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—'
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function personName(person) {
  if (!person) return ''
  if (person.name) return person.name
  return [person.firstName, person.lastName].filter(Boolean).join(' ')
}

function entryTitle(item) {
  if (item == null || item === '') return ''
  if (typeof item === 'string') return item
  return item.title || item.name || ''
}

function visibleStatus(item) {
  if (!item || typeof item !== 'object' || !item.status) return ''
  const title = entryTitle(item).toLowerCase()
  if (item.status === 'confirmed' && title.includes('диплом ii степени')) return ''
  return item.status
}

function statusLabel(status) {
  if (status === 'confirmed') return 'подтверждено'
  if (status === 'pending') return 'на проверке'
  return status || ''
}

function statusClass(status) {
  if (status === 'подтверждена' || status === 'confirmed') return 'badge badge-ok'
  if (status === 'подана' || status === 'pending') return 'badge badge-pending'
  if (status === 'отклонена' || status === 'rejected') return 'badge badge-no'
  return 'badge badge-muted'
}

function joinList(list) {
  if (!Array.isArray(list) || list.length === 0) return ''
  return list.map((item) => (typeof item === 'string' ? item : entryTitle(item))).filter(Boolean).join(', ')
}

function TabIcon({ children }) {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  )
}

const PARENT_TABS = [
  {
    id: 'progress',
    label: 'Прогресс',
    icon: (
      <TabIcon>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M9 3.5h6V7H9zM9 11h6M9 15h4" />
      </TabIcon>
    ),
  },
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
    id: 'schools',
    label: 'Школы',
    icon: (
      <TabIcon>
        <path d="M4 20V10l8-6 8 6v10" />
        <path d="M9 20v-6h6v6" />
      </TabIcon>
    ),
  },
  {
    id: 'child',
    label: 'Ребёнок',
    icon: (
      <TabIcon>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19c1.2-3 3.4-4.5 7-4.5s5.8 1.5 7 4.5" />
      </TabIcon>
    ),
  },
]

function ParentBar({ section, onSection }) {
  return (
    <header className="header student-header">
      <div className="header-inner parent-bar">
        <Link to="/" className="brand-lockup" aria-label="TalentHub — главная"><span className="brand-mark">t.</span><span className="brand-word">Talent<span>Hub</span></span></Link>
        <CabinetNav activeKey={section} className="nav student-tabs org-shell-tabs" aria-label="Разделы родительского кабинета">
          {PARENT_TABS.map((tab) => (
            <ActionButton
              key={tab.id}
              type="button"
              className={section === tab.id ? 'active' : undefined}
              aria-current={section === tab.id ? 'page' : undefined}
              onClick={() => onSection(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </ActionButton>
          ))}
        </CabinetNav>
      </div>
    </header>
  )
}

export default function ParentLink() {
  const apiRevision = useStoreRevision()
  const cabinet = readCabinet()
  const [section, setSection] = useState('progress')
  const [ownCategory, setOwnCategory] = useState('Математика|олимпиады')
  const [rankCategory, setRankCategory] = useState('Математика|олимпиады')
  const [selectedSchoolId, setSelectedSchoolId] = useState(null)
  const [progressOpen, setProgressOpen] = useState(null)
  const [selectingChild, setSelectingChild] = useState(null)
  const [suggestingEvent, setSuggestingEvent] = useState(null)

  const active = cabinet.children.find((child) => child.id === cabinet.activeId) || cabinet.children[0] || null

  useEffect(() => {
    setProgressOpen(null)
    setSelectedSchoolId(null)
  }, [active?.id])

  const detailRef = useDialogFocus(Boolean(progressOpen), () => setProgressOpen(null))

  async function onSelect(childId) {
    if (selectingChild) return
    setSelectingChild(childId)
    try {
      await selectChild(childId)
    } catch (error) { if (error.code === 'demo_restricted') return; setLinkNote(error.message) }
    finally { setSelectingChild(null) }
  }

  function openProgress(item, kind) {
    const title = entryTitle(item) || 'Запись'
    const eventId = item && typeof item === 'object' ? item.eventId : ''
    const event = cabinet.events.find((entry) => eventId && entry.id === eventId)
      || cabinet.events.find((entry) => entry.title === title)
      || null
    setProgressOpen({ item, kind, title, event })
  }

  async function onSuggestEvent(event) {
    if (!active) return { ok: false, message: 'Сначала выберите ребёнка.' }
    setSuggestingEvent(event.id)
    try {
      const result = await suggestToChild({ childId: active.id, eventId: event.id })
      if (!result || result.ok !== true) return { ok: false, message: 'Не удалось предложить мероприятие.' }
      return {
        ok: true,
        already: result.already,
        message: result.already ? 'Это мероприятие уже предложено.' : 'Мероприятие предложено ребёнку.',
      }
    } catch (error) { if (error.code === 'demo_restricted') return;
      return { ok: false, message: error.message || 'Не удалось предложить мероприятие.' }
    } finally {
      setSuggestingEvent(null)
    }
  }

  const prestigeCategories = useMemo(() => {
    const seen = []
    cabinet.schools.forEach((school) => {
      ;(school.indicators || []).forEach((item) => {
        const id = categoryId(item)
        if (!seen.some((row) => row.id === id)) seen.push({ id, title: categoryTitle(id) })
      })
    })
    return seen
  }, [cabinet.schools])

  useEffect(() => {
    if (!prestigeCategories.length) return
    if (!prestigeCategories.some(item => item.id === ownCategory)) setOwnCategory(prestigeCategories[0].id)
    if (!prestigeCategories.some(item => item.id === rankCategory)) setRankCategory(prestigeCategories[0].id)
  }, [prestigeCategories, ownCategory, rankCategory])

  const childSchool = cabinet.schools.find((school) => school.name === active?.school) || null
  const selectedSchool = cabinet.schools.find((school) => school.id === selectedSchoolId) || childSchool
  const ownFact = factFor(selectedSchool, ownCategory)

  const ranking = useMemo(() => {
    const ranked = []
    const unknown = []
    cabinet.schools.forEach((school) => {
      const fact = factFor(school, rankCategory)
      if (!fact || !fact.count) unknown.push(school)
      else ranked.push({ school, fact })
    })
    ranked.sort((a, b) => b.fact.count - a.fact.count)
    return { ranked, unknown }
  }, [cabinet.schools, rankCategory])

  const parentName = personName(cabinet.user)

  if (!cabinet.ready) {
    return (
      <>
        <ParentBar section={section} onSection={setSection} />
        <main className="parent-workspace parent-loading" aria-busy="true">
          <div className="container">
            <div className="parent-loading-heading"><span className="skeleton skeleton-kicker" /><span className="skeleton skeleton-heading" /><span className="skeleton skeleton-copy" /></div>
            <div className="parent-loading-grid"><span className="skeleton skeleton-panel" /><span className="skeleton skeleton-panel" /><span className="skeleton skeleton-panel" /></div>
            <p className="loading-caption"><span className="spinner" /> Загружаем данные кабинета…</p>
          </div>
        </main>
      </>
    )
  }

  if (!cabinet.loggedIn) {
    return (
      <>
        <ParentBar section={section} onSection={setSection} />
        <main className="parent-workspace">
        <div className="container narrow">
          <h1>Кабинет родителя</h1>
          <p className="lead">Сначала войдите в свой аккаунт. Детей в нём нет, пока вы сами не добавите ребёнка.</p>
          {cabinet.role ? (
            <p className="notice">Сейчас открыт профиль другой роли. Переключитесь на родительский профиль, чтобы продолжить.</p>
          ) : null}
          <p className="muted">Войдите в родительский профиль, чтобы продолжить работу с кабинетом.</p>
          <Link className="btn btn-primary" to="/auth">Войти</Link>
        </div>
        </main>
      </>
    )
  }

  return (
    <>
      <ParentBar section={section} onSection={setSection} />
      <main>
      <div className="container">
        <div className="parent-dashboard-toolbar">
          <div className="parent-greeting">
            <span className="parent-greeting-eyebrow">ЛИЧНЫЙ КАБИНЕТ</span>
            <h1>Здравствуйте, {cabinet.user.firstName || parentName.split(' ')[0] || 'родитель'}!</h1>
            <p>Управляйте профилями детей и следите за их возможностями.</p>
          </div>
          <div className="parent-child-switcher" aria-label="Выбор ребёнка">
            {cabinet.children.map((child) => (
              <ActionButton
                key={child.id}
                type="button"
                className={child.id === active?.id ? 'parent-child-pill active' : 'parent-child-pill'}
                onClick={() => onSelect(child.id)}
                disabled={Boolean(selectingChild)}
                aria-busy={selectingChild === child.id}
                aria-pressed={child.id === active?.id}
              >
                <span className="parent-child-avatar">{personName(child).split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                <span>{personName(child)}</span>
                {selectingChild === child.id ? <span className="spinner spinner-small" aria-label="Загрузка" /> : child.id === active?.id ? <span className="parent-child-check">✓</span> : null}
              </ActionButton>
            ))}

          </div>
        </div>
        <div className="stack">
          {section === 'child' || cabinet.children.length === 0 ? <FamilyInvitation /> : null}
          {cabinet.children.length === 0 ? <section className="card stack"><h2 className="card-title">Детей пока нет</h2><p>Поделитесь семейной ссылкой. Когда ребёнок присоединится, здесь появятся его прогресс, мероприятия и достижения.</p></section> : null}

          {active ? (
            <>
              {section === 'child' ? (
                <section className="card child-card">
                  <h2 className="card-title">{personName(active)}</h2>
                  <dl className="child-facts">
                    <div>
                      <dt>Дата рождения</dt>
                      <dd>{formatDate(active.birthDate)}</dd>
                    </div>
                    <div>
                      <dt>Школа</dt>
                      <dd>{active.school || 'не указана'}</dd>
                    </div>
                    <div>
                      <dt>Класс</dt>
                      <dd>{active.grade ? `${active.grade} класс` : 'не указан'}</dd>
                    </div>
                    <div>
                      <dt>Город</dt>
                      <dd>{active.city || 'не указан'}</dd>
                    </div>
                  </dl>
                  <div className="child-interests">
                    <p>Интересы</p>
                    {Array.isArray(active.interests) && active.interests.length > 0 ? (
                      <div className="chips">
                        {active.interests.map((item) => {
                          const name = typeof item === 'string' ? item : entryTitle(item)
                          if (!name) return null
                          return <span key={name} className="chip">{name}</span>
                        })}
                      </div>
                    ) : <p className="muted">не заполнены</p>}
                  </div>
                </section>
              ) : null}

              {section === 'progress' ? (
                <div className="grid-3">
                  <ProgressCard title="Куда записался" items={active.signedUp} empty="Записей пока нет." onOpen={(item) => openProgress(item, 'Запись')} />
                  <ProgressCard title="Куда сходил" items={active.attended} empty="Посещений пока нет." onOpen={(item) => openProgress(item, 'Посещение')} />
                  <ProgressCard title="Достижения" items={active.achievements} empty="Достижений пока нет." onOpen={(item) => openProgress(item, 'Достижение')} />
                </div>
              ) : null}

              {section === 'events' ? (
                <EventFeed
                  key={active.id}
                  childId={active.id}
                  className="parent-feed"
                  recommendTitle="Рекомендуем для вашего ребёнка"
                  interests={active.interests || []}
                  applications={(active.signedUp || []).map((item) => (
                    typeof item === 'string'
                      ? { eventId: '', title: item, status: 'подана' }
                      : { eventId: item.eventId || '', title: item.title || '', status: item.status || 'подана' }
                  ))}
                  suggestedEventIds={(cabinet.suggestions || []).filter(item => item.childId === active.id).map(item => item.eventId)}
                  actionLabel="Предложить ребёнку"
                  onAction={onSuggestEvent}
                  pendingActionId={suggestingEvent}
                />
              ) : null}

              {section === 'schools' ? (
                <div className="school-split">
                  <div className="school-board">
                    <section className="card school-pane">
                      <header className="school-head">
                        <h2 className="card-title">{selectedSchool?.name || active.school || 'Школа не указана'}</h2>
                        <p className="school-note">{selectedSchool?.id === childSchool?.id ? 'Школа ребёнка' : 'Карточка школы из каталога'}</p>
                        {selectedSchool ? (
                          <div className="row">
                            <span className="badge badge-muted">{selectedSchool.type}</span>
                            <span className="badge">{selectedSchool.region}</span>
                            {selectedSchool.id !== childSchool?.id ? <ActionButton type="button" className="btn btn-ghost btn-small" onClick={() => setSelectedSchoolId(childSchool?.id || null)}>Вернуться к школе ребёнка</ActionButton> : null}
                          </div>
                        ) : null}
                      </header>
                    </section>
                    {childSchool ? (
                      <div className="school-tiles">
                        <section className="card school-tile">
                          <h3 className="card-title">Направления</h3>
                          {(selectedSchool.directions || []).length > 0 ? (
                            <div className="chips">
                              {selectedSchool.directions.map((name) => <span key={name} className="chip school-chip">{name}</span>)}
                            </div>
                          ) : <p className="muted">не указаны</p>}
                        </section>
                        <section className="card school-tile">
                          <h3 className="card-title">Партнёрства</h3>
                          {(selectedSchool.partnerships || []).length > 0 ? (
                            <div className="chips">
                              {selectedSchool.partnerships.map((name) => <span key={name} className="chip school-chip">{name}</span>)}
                            </div>
                          ) : <p className="muted">нет подтверждённых</p>}
                        </section>
                        <section className="card school-tile wide">
                          <h3 className="card-title">Достижения</h3>
                          <SchoolLines items={selectedSchool.achievements} empty="нет подтверждённых в открытых данных" />
                        </section>
                        <section className="card school-tile wide">
                          <h3 className="card-title">История</h3>
                          <SchoolLines items={selectedSchool.history} empty="недостаточно данных" />
                        </section>
                        <section className="card school-tile">
                          <h3 className="card-title">Программы</h3>
                          <SchoolLines items={selectedSchool.programs} empty="не указаны" />
                        </section>
                        <section className="card school-tile">
                          <h3 className="card-title">Мероприятия</h3>
                          <SchoolLines items={selectedSchool.events} empty="нет в карточке" />
                        </section>
                        <section className="card school-tile">
                          <h3 className="card-title">Поступление</h3>
                          <p>{selectedSchool.admission}</p>
                        </section>
                        <section className="card school-tile">
                          <h3 className="card-title">Контакты</h3>
                          <p>{selectedSchool.contacts}</p>
                        </section>
                        <section className="card school-tile wide school-prestige">
                          <h3 className="card-title">Престиж</h3>
                          <label className="field">
                            <span>Категория</span>
                            <select value={ownCategory} onChange={(event) => setOwnCategory(event.target.value)}>
                              {prestigeCategories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                            </select>
                          </label>
                          {ownFact ? (
                            <>
                              <div className="school-stat">
                                <span className="school-stat-num">{ownFact.count}</span>
                                <div>
                                  <p className="muted">подтверждённых результатов</p>
                                  <p>{ownFact.criterion}</p>
                                </div>
                              </div>
                              <dl className="school-facts">
                                <div>
                                  <dt>Уровень</dt>
                                  <dd>{ownFact.level}</dd>
                                </div>
                                <div>
                                  <dt>Период</dt>
                                  <dd>{ownFact.period}</dd>
                                </div>
                                <div>
                                  <dt>Подтверждение</dt>
                                  <dd>{ownFact.confirmation}</dd>
                                </div>
                                <div>
                                  <dt>Обновлено</dt>
                                  <dd>{formatDate(ownFact.updated)}</dd>
                                </div>
                                <div className="wide">
                                  <dt>Источник</dt>
                                  <dd>{ownFact.source}</dd>
                                </div>
                              </dl>
                            </>
                          ) : (
                            <p className="muted">По категории «{categoryTitle(ownCategory)}» подтверждённых данных нет. Это не значит, что школа слабее других.</p>
                          )}
                        </section>
                      </div>
                    ) : (
                      <p className="muted">В каталоге карточки этой школы нет.</p>
                    )}
                  </div>
                  <section className="card school-pane">
                    <header className="school-head">
                      <span className="school-kicker">СРАВНЕНИЕ ПО ПОДТВЕРЖДЁННЫМ ДАННЫМ</span>
                      <h2 className="card-title">Рейтинг школ</h2>
                      <p className="muted">Место рассчитывается только по выбранной категории и числу подтверждённых результатов за 2024–2026. Это не общий балл школы.</p>
                    </header>
                    <label className="field">
                      <span>Категория престижа</span>
                      <select value={rankCategory} onChange={(event) => setRankCategory(event.target.value)}>
                        {prestigeCategories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                      </select>
                    </label>
                    <ol className="school-rank">
                      {ranking.ranked.map(({ school, fact }, index) => (
                        <li key={school.id} className={`${school.id === childSchool?.id ? 'mine ' : ''}${school.id === selectedSchool?.id ? 'selected' : ''}`}>
                          <ActionButton type="button" className="school-rank-select" onClick={() => setSelectedSchoolId(school.id)} aria-pressed={school.id === selectedSchool?.id}>
                            <span className="school-place">{index + 1}</span>
                            <span className="school-rank-copy">
                              <span className="spread"><span className="school-rank-name">{school.name}</span>{school.id === childSchool?.id ? <span className="badge badge-ok">школа ребёнка</span> : null}</span>
                              <span className="muted">{school.type} · {school.region}</span>
                              <span>{fact.count} результатов · {fact.level}</span>
                              <span className="muted">{fact.confirmation}</span>
                              <span className="school-open-hint">Открыть карточку школы →</span>
                            </span>
                          </ActionButton>
                        </li>
                      ))}
                    </ol>
                    <div className="school-gap">
                      <h3 className="card-title">Недостаточно данных</h3>
                      <p className="muted">По категории «{categoryTitle(rankCategory)}» цифры нет. Эти школы не стоят ниже остальных.</p>
                      {ranking.unknown.length === 0 ? <p className="muted">Таких школ нет.</p> : (
                        <ul className="school-missing">
                          {ranking.unknown.map((school) => (
                            <li key={school.id} className={school.id === selectedSchool?.id ? 'selected' : undefined}>
                              <ActionButton type="button" className="school-missing-select" onClick={() => setSelectedSchoolId(school.id)} aria-pressed={school.id === selectedSchool?.id}>
                                <span className="school-rank-name">{school.name}</span>
                                <span className="muted">{school.type} · {school.region}</span>
                                <span className="school-open-hint">Открыть карточку школы →</span>
                              </ActionButton>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      </main>
      {progressOpen ? (
        <div className="detail-backdrop" onClick={() => setProgressOpen(null)}>
          <div
            className="detail-panel"
            ref={detailRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="progress-detail-title"
            onClick={(mouse) => mouse.stopPropagation()}
          >
            <div className="spread">
              <span className="badge badge-muted">{progressOpen.kind}</span>
              <ActionButton type="button" className="btn btn-ghost btn-small" onClick={() => setProgressOpen(null)}>Закрыть</ActionButton>
            </div>
            <h2 id="progress-detail-title">{progressOpen.title}</h2>
            {visibleStatus(progressOpen.item) ? (
              <p><span className={statusClass(visibleStatus(progressOpen.item))}>{statusLabel(visibleStatus(progressOpen.item))}</span></p>
            ) : null}
            {progressOpen.event ? (
              <>
                <dl className="detail-grid">
                  <dt>Организатор</dt>
                  <dd>{progressOpen.event.organizer || '—'}</dd>
                  <dt>Интересы</dt>
                  <dd>{joinList(progressOpen.event.interests) || '—'}</dd>
                  <dt>Класс</dt>
                  <dd>{progressOpen.event.grade || '—'}</dd>
                  <dt>Дата</dt>
                  <dd>{formatDate(progressOpen.event.date)}</dd>
                  <dt>Место</dt>
                  <dd>{[progressOpen.event.city, progressOpen.event.place].filter(Boolean).join(', ') || '—'}</dd>
                  <dt>Формат</dt>
                  <dd>{progressOpen.event.format || '—'}</dd>
                  <dt>Условия</dt>
                  <dd>{progressOpen.event.terms || '—'}</dd>
                  <dt>Дедлайн</dt>
                  <dd>{formatDate(progressOpen.event.deadline)}</dd>
                  <dt>Мест</dt>
                  <dd>{progressOpen.event.seats ?? '—'}</dd>
                </dl>
                {progressOpen.event.description ? <p>{progressOpen.event.description}</p> : null}
              </>
            ) : (
              <p className="muted">Отдельной карточки мероприятия в каталоге нет. Это запись из прогресса ребёнка.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

function SchoolLines({ items, empty }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : []
  if (list.length === 0) return <p className="muted">{empty}</p>
  return (
    <ul className="school-lines">
      {list.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

function ProgressCard({ title, items, empty, onOpen }) {
  const list = Array.isArray(items) ? items : []
  return (
    <section className="stack">
      <h2 className="card-title">{title}</h2>
      {list.length === 0 ? <p className="muted">{empty}</p> : null}
      {list.map((item, index) => {
        const status = visibleStatus(item)
        const label = entryTitle(item) || '—'
        return (
          <ActionButton
            key={`${label}-${index}`}
            type="button"
            className="card event-card"
            onClick={() => onOpen(item)}
          >
            <span className="card-title">{label}</span>
            {status ? <span className={statusClass(status)}>{statusLabel(status)}</span> : null}
          </ActionButton>
        )
      })}
    </section>
  )
}

