import { ActionButton, ActionForm } from '../components/ActionControls.jsx'
import { useStoreRevision } from '../data/hooks.js'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GRADES, INTERESTS, changeSchool, completeProfile, listSchools, logout, studentCabinet } from '../data/store.js'

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—'
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function readCabinet() {
  try {
    return studentCabinet()
  } catch {
    return { loggedIn: false, demo: false, user: null, student: null }
  }
}

export default function Profile() {
  const apiRevision = useStoreRevision()
  const navigate = useNavigate()
  const cabinet = readCabinet()
  const user = cabinet.user
  const student = cabinet.student
  const profileName = [user?.firstName || student?.firstName, user?.lastName || student?.lastName].filter(Boolean).join(' ')
  const [grade, setGrade] = useState(user?.grade || student?.grade || '')
  const [interests, setInterests] = useState(user?.interests || student?.interests || [])
  const [schoolOpen, setSchoolOpen] = useState(false)
  const [schoolDraft, setSchoolDraft] = useState(user?.school || student?.school || '')
  const schools = listSchools()
  const city = user?.city || student?.city || ''
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const query = draft.trim().toLowerCase()
  const suggestions = query
    ? INTERESTS.filter((name) => (
      name.toLowerCase().includes(query)
      && !interests.some((item) => item.toLowerCase() === name.toLowerCase())
    ))
    : []

  function addInterest(value = draft) {
    const name = String(value).trim()
    if (!name) return
    setInterests((prev) => (
      prev.some((item) => item.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]
    ))
    setDraft('')
  }

  function removeInterest(name) {
    setInterests((prev) => prev.filter((item) => item !== name))
  }

  async function onSave(event) {
    event.preventDefault()
    if (!cabinet.loggedIn) {
      navigate('/auth')
      return
    }
    if (interests.length === 0) {
      setMessage('Добавьте хотя бы один интерес: по ним фильтруются мероприятия.')
      return
    }
    let saved
    try { saved = await completeProfile({ grade, city, interests }) } catch (error) { if (error.code === 'demo_restricted') return; setMessage(error.message); return }
    if (!saved) {
      setMessage('Сохранить настройки может только вошедший школьник.')
      return
    }
    readCabinet()
    setMessage('Настройки сохранены. Список мероприятий подстроится под интересы.')
  }

  function onLogout() {
    logout()
    navigate('/auth')
  }

  async function onChangeSchool() {
    if (!cabinet.loggedIn) {
      navigate('/auth')
      return
    }
    let saved
    try { saved = await changeSchool(schoolDraft) } catch (error) { if (error.code === 'demo_restricted') return; setMessage(error.message); return }
    if (!saved) {
      setMessage('Сменить учреждение может только вошедший школьник.')
      return
    }
    readCabinet()
    setSchoolOpen(false)
    setMessage('Учреждение образования обновлено.')
  }

  return (
    <main className="student-workspace">
      <div className="container">
        <div className="grid-2">
          <section className="card">
            <h1>{profileName || 'Школьник'}</h1>
            {!user && !student ? <p className="muted">Профиль не найден. <Link to="/auth">Войти</Link></p> : (
              <dl className="profile-facts">
                <div>
                  <dt>Дата рождения</dt>
                  <dd>{formatDate(user?.birthDate || student?.birthDate)}</dd>
                </div>
                <div>
                  <dt>Почта</dt>
                  <dd>{user?.email || '—'}</dd>
                </div>
                <div>
                  <dt>Школа</dt>
                  <dd>{user?.school || student?.school || '—'}</dd>
                </div>
                <div>
                  <dt>Город</dt>
                  <dd>{city || '—'}</dd>
                </div>
              </dl>
            )}
            <ActionButton
              type="button"
              className="btn btn-ghost profile-switch"
              onClick={() => {
                if (!cabinet.loggedIn) {
                  navigate('/auth')
                  return
                }
                setSchoolOpen((open) => !open)
              }}
            >
              Сменить учреждение образования
            </ActionButton>
            {schoolOpen ? (
              <div className="field profile-school">
                <select value={schoolDraft} onChange={(event) => setSchoolDraft(event.target.value)}>
                  {schools.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <ActionButton type="button" className="btn btn-primary" onClick={onChangeSchool}>Сохранить изменения</ActionButton>
              </div>
            ) : null}
          </section>
          <ActionForm id="profile-form" className="card" onSubmit={onSave}>
            <h2>Настройки</h2>
            <p className="muted">Класс и интересы. Имя, дата рождения, почта, школа и город здесь не меняются.</p>
            <label className="field">
              <span>Класс</span>
              <select value={grade} onChange={(event) => setGrade(event.target.value)} disabled={!cabinet.loggedIn}>
                <option value="">Не выбран</option>
                {GRADES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <div className="field">
              <span>Интересы</span>
              {interests.length > 0 ? (
                <div className="chips">
                  {interests.map((name) => (
                    <span key={name} className="chip interest-chip">
                      {name}
                      <ActionButton
                        type="button"
                        className="chip-remove"
                        aria-label={`Убрать ${name}`}
                        disabled={!cabinet.loggedIn}
                        onClick={() => removeInterest(name)}
                      >
                        ×
                      </ActionButton>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">Пока ничего не добавлено.</p>
              )}
              <div className="interest-add">
                <input
                  type="text"
                  value={draft}
                  placeholder="Введите интерес"
                  disabled={!cabinet.loggedIn}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={suggestions.length > 0}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addInterest()
                    }
                  }}
                />
                <ActionButton type="button" className="btn btn-ghost" disabled={!cabinet.loggedIn} onClick={() => addInterest()}>
                  Добавить
                </ActionButton>
              </div>
              {suggestions.length > 0 ? (
                <ul className="suggest" role="listbox">
                  {suggestions.map((name) => (
                    <li key={name}>
                      <ActionButton type="button" onClick={() => addInterest(name)}>{name}</ActionButton>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {message ? <p className="notice">{message}</p> : null}
            {cabinet.loggedIn ? (
              <div className="profile-actions">
                <ActionButton type="submit" className="btn btn-primary">Сохранить профиль</ActionButton>
                <ActionButton type="button" className="btn btn-ghost" onClick={onLogout}>Выйти</ActionButton>
              </div>
            ) : (
              <div className="profile-actions">
                <Link className="btn btn-primary" to="/auth">Войти и настроить</Link>
              </div>
            )}
          </ActionForm>
        </div>
      </div>
    </main>
  )
}
