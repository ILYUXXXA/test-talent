import { useEffect, useState } from 'react'
import { currentUser, isDemoOrganization } from '../data/store.js'

export default function DemoRestrictionDialog() {
  const [mode, setMode] = useState('demo')
  const [role, setRole] = useState('school')
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const showDemo = (event) => {
      setMode('demo')
      setRole(event.detail?.role === 'company' ? 'company' : 'school')
      setMessage('')
      setOpen(true)
    }
    const showSuccess = (event) => {
      if (isDemoOrganization()) {
        setMode('demo')
        setRole(currentUser()?.role === 'company' ? 'company' : 'school')
        setMessage('')
        setOpen(true)
        return
      }
      setMode('success')
      setMessage(event.detail?.message || 'Действие успешно выполнено. Изменения сохранены.')
      setOpen(true)
    }
    window.addEventListener('talenthub:demo-restriction', showDemo)
    window.addEventListener('talenthub:action-success', showSuccess)
    return () => {
      window.removeEventListener('talenthub:demo-restriction', showDemo)
      window.removeEventListener('talenthub:action-success', showSuccess)
    }
  }, [])

  if (!open) return null
  const isDemo = mode === 'demo'
  return (
    <div className="demo-action-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className={`demo-action-dialog ${isDemo ? '' : 'success-action-dialog'}`} role="dialog" aria-modal="true" aria-labelledby="demo-action-title">
        <button className="demo-action-close" type="button" aria-label="Закрыть" onClick={() => setOpen(false)}>×</button>
        <div className={`demo-action-icon ${isDemo ? '' : 'success-action-icon'}`}><span>{isDemo ? '✦' : '✓'}</span></div>
        <span className="demo-action-kicker">{isDemo ? 'TALENTHUB · ДЕМО-АККАУНТ' : 'TALENTHUB · УСПЕШНО'}</span>
        <h2 id="demo-action-title">{isDemo ? 'Это действие недоступно на демо-аккаунте' : 'Всё получилось!'}</h2>
        <p>{isDemo ? 'Это действие недоступно на демо-аккаунте школы или компании. Зарегистрируйте организацию, чтобы пользоваться всеми возможностями TalentHub.' : message}</p>
        {isDemo ? <>
          <a className="demo-action-register" href={`/organization-registration?role=${role}`}>Зарегистрировать организацию <span>→</span></a>
          <button className="demo-action-back" type="button" onClick={() => setOpen(false)}>Вернуться в демо-кабинет</button>
        </> : <button className="demo-action-register success-action-button" type="button" onClick={() => setOpen(false)}>Отлично</button>}
      </section>
    </div>
  )
}
