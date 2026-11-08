import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStoreRevision } from '../data/hooks.js'
import { currentUser, acceptFamilyInvitation } from '../data/store.js'
import { rememberInvitation, clearInvitation, rejectInvitation } from '../data/family-invitation.js'

export default function FamilyJoin() {
  const { token } = useParams()
  const navigate = useNavigate()
  useStoreRevision()
  const user = currentUser()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    rememberInvitation(token)
    setError(''); setResult(null)
    if (user?.role === 'student') {
      if (!user.profileComplete) { navigate('/welcome', { replace: true }); return }
      acceptFamilyInvitation(token).then(data => { if (active) { clearInvitation(token); setResult(data) } })
        .catch(e => { if (active) { rejectInvitation(token, e); setError(e.message) } })
    }
    return () => { active = false }
  }, [token, user?.id, user?.role, user?.profileComplete, attempt, navigate])
  return <main><div className="container narrow"><section className="card stack">
    <h1>Приглашение в семью</h1>
    {!user ? <><p>Войдите или зарегистрируйтесь как школьник. После входа мы автоматически добавим вас в семью по этой ссылке.</p><Link className="btn btn-primary" to="/auth?role=student">Войти или зарегистрироваться</Link></>
      : user.role !== 'student' ? <><p>Эта ссылка предназначена для школьника. Сейчас вы вошли с другой ролью.</p><Link className="btn btn-primary" to="/auth?role=student">Войти как школьник</Link></>
      : error ? <><p className="notice" role="alert">{error}</p><button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>Повторить</button><Link className="btn btn-ghost" to="/events">Открыть кабинет</Link></>
      : result ? <><p role="status">{result.already_joined ? 'Вы уже добавлены в эту семью.' : 'Вы добавлены в семью.'}</p><Link className="btn btn-primary" to="/events">Открыть кабинет</Link></>
      : <p role="status">Присоединяемся к семье…</p>}
  </section></div></main>
}
