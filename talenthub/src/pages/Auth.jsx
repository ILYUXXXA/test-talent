import { ActionButton, ActionForm } from '../components/ActionControls.jsx'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { studentDestination } from '../data/family-invitation.js'
import { loginOrganization, login, registerStudent, registerParent, listSchools } from '../data/store.js'

const DEMO_TOKENS = {'school': 'th_demo_school_1f85ed08247f646e3309082eee04b85f885a4db17382d06fc82ebf95dee030f0', 'company': 'th_demo_company_71a1140475560d032a232e3fb660700021e5d7106ad006026366d71e6e2adcd3'}

const QUICK_ACCESS_PASSWORD = 'demo1234'

const ROLES = [
  { id: 'student', label: 'Войти как школьник', quickEmail: 'alina@demo.by' },
  { id: 'parent', label: 'Войти как родитель', quickEmail: 'olga@demo.by' },
  { id: 'school', label: 'Войти как администрация школы', quickEmail: 'school@demo.by' },
  { id: 'company', label: 'Войти как представитель компании', quickEmail: 'company@demo.by' },
  { id: 'moderator', label: 'Войти как модератор', quickEmail: 'admin@demo.by' },
]

function readSchools() {
  try {
    const list = listSchools()
    if (!Array.isArray(list) || list.length === 0) return []
    const names = list
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') return item.name || item.title || item.school || ''
        return ''
      })
      .filter(Boolean)
    return names
  } catch {
    return []
  }
}

function userFrom(result) {
  if (!result || result.ok === false) return null
  if (result.role) return result
  if (result.user && result.user.role) return result.user
  return null
}

function pathFor(user) {
  if (!user) return null
  if (user.role === 'student') return user.profileComplete ? '/events' : '/welcome'
  if (user.role === 'parent') return '/parent'
  if (user.role === 'school') return '/school'
  if (user.role === 'moderator') return '/admin'
  if (user.role === 'company') return '/company'
  return null
}

export default function Auth() {
  const navigate = useNavigate()
  const schoolList = readSchools()
  const [role, setRole] = useState(() => { const requested = new URLSearchParams(window.location.search).get('role'); return ROLES.some((item) => item.id === requested) ? requested : '' })
  const [mode, setMode] = useState('login')
  const [accessToken, setAccessToken] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [school, setSchool] = useState(schoolList[0] || '')

  const organizationRole = role === 'school' || role === 'company'
  const current = ROLES.find((item) => item.id === role)

  function choose(next) {
    if (busy) return
    setRole(next)
    setMode('login')
    setAccessToken('')
    setEmail('')
    setPassword('')
    setError('')
  }

  function fillDemoData() {
    if (busy || !current?.quickEmail) return
    if (organizationRole) setAccessToken(DEMO_TOKENS[role])
    else setEmail(current.quickEmail)
    setPassword(QUICK_ACCESS_PASSWORD)
    setError('')
  }

  async function onLogin(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const user = userFrom(await (organizationRole ? loginOrganization(accessToken.trim(), role) : login(email.trim(), password, role)))
      if (!user || user.role !== role) {
        setError('Неверная почта или пароль для этой роли.')
        return
      }
      const path = pathFor(user)
      if (!path) {
        setError('Для этой роли вход пока не открыт.')
        return
      }
      navigate(user.role === 'student' ? studentDestination(user) : path)
    } catch (error) { if (error.code === 'demo_restricted') return;
      setError(error.message || 'Неверная почта или пароль для этой роли.')
    } finally { setBusy(false) }
  }

  async function onRegister(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const register = role === 'parent' ? registerParent : registerStudent
      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        email: email.trim(),
        password,
        school: school || schoolList[0] || '',
      })
      if (result && result.ok === false) {
        setError('Не удалось зарегистрироваться. Проверьте данные.')
        return
      }
      navigate(role === 'parent' ? '/parent' : studentDestination(userFrom(result)))
    } catch (error) { if (error.code === 'demo_restricted') return;
      setError(error.message || 'Не удалось зарегистрироваться. Проверьте данные.')
    } finally { setBusy(false) }
  }

  if (!current) {
    return (
      <main className="auth-page">
        <div className="container narrow auth-container">
          <span className="org-eyebrow">TALENTHUB · ЕДИНАЯ ПЛАТФОРМА</span><h1>Выберите профиль</h1><p className="lead">Перейдите в кабинет своей роли или войдите по данным аккаунта.</p>
          <div className="role-pick">
            {ROLES.map((item) => (
              <ActionButton disabled={busy} key={item.id} type="button" className="btn btn-ghost" onClick={() => choose(item.id)}>
                {item.label}
              </ActionButton>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <div className="container narrow auth-container">
        <ActionButton disabled={busy} type="button" className="btn btn-ghost" onClick={() => choose('')}>К выбору роли</ActionButton>
        <h1>{mode === 'register' ? (role === 'parent' ? 'Регистрация родителя' : 'Регистрация школьника') : current.label}</h1>
        {mode === 'register' ? (
          <ActionForm className="card stack" onSubmit={onRegister} aria-busy={busy}>
            <label className="field">
              <span>Имя</span>
              <input value={firstName} autoComplete="given-name" maxLength={100} required onChange={(event) => setFirstName(event.target.value)} />
            </label>
            <label className="field">
              <span>Фамилия</span>
              <input value={lastName} autoComplete="family-name" maxLength={100} required onChange={(event) => setLastName(event.target.value)} />
            </label>
            {role === 'student' ? <label className="field">
              <span>Дата рождения</span>
              <input type="date" value={birthDate} required onChange={(event) => setBirthDate(event.target.value)} />
            </label> : null}
            <label className="field">
              <span>Электронная почта</span>
              <input type="email" value={email} autoComplete="email" required onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              <span>Пароль</span>
              <input type="password" value={password} autoComplete="new-password" minLength={8} maxLength={128} aria-describedby="registration-password-hint" required onChange={(event) => setPassword(event.target.value)} />
              <small id="registration-password-hint">От 8 до 128 символов</small>
            </label>
            {role === 'student' ? <label className="field">
              <span>Школа</span>
              <select value={school || schoolList[0] || ''} onChange={(event) => setSchool(event.target.value)}>
                {schoolList.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label> : null}
            {error ? <p className="notice" role="alert">{error}</p> : null}
            <ActionButton disabled={busy} className="btn btn-primary" type="submit">{busy ? <><span className="th-spinner" aria-hidden="true" /> Создаём аккаунт…</> : 'Зарегистрироваться'}</ActionButton>
            <ActionButton disabled={busy} type="button" className="btn btn-ghost" onClick={() => { setMode('login'); setError('') }}>Уже есть аккаунт</ActionButton>
          </ActionForm>
        ) : (
          <ActionForm className="card stack" onSubmit={onLogin} aria-busy={busy}>
            {organizationRole ? <label className="field"><span>Токен доступа</span><input type="password" value={accessToken} autoComplete="off" required onChange={event => setAccessToken(event.target.value)} /></label> : <>
            <label className="field">
              <span>Электронная почта</span>
              <input type="email" value={email} autoComplete="username" required onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              <span>Пароль</span>
              <input type="password" value={password} autoComplete="current-password" required onChange={(event) => setPassword(event.target.value)} />
            </label>
            </>}
            {error ? <p className="notice" role="alert">{error}</p> : null}
            <ActionButton disabled={busy} className="btn btn-primary" type="submit">{busy ? <><span className="th-spinner" aria-hidden="true" /> Входим…</> : 'Войти'}</ActionButton>
            <ActionButton disabled={busy} type="button" className="btn btn-ghost" onClick={fillDemoData}>Заполнить демо-данные</ActionButton>
            {role === 'student' || role === 'parent' ? (
              <ActionButton disabled={busy} type="button" className="btn btn-ghost" onClick={() => { setMode('register'); setError('') }}>Создать аккаунт</ActionButton>
            ) : organizationRole ? <Link className="btn btn-ghost" to={`/organization-registration?role=${role}`}>Зарегистрироваться</Link> : null}
          </ActionForm>
        )}
      </div>
    </main>
  )
}
