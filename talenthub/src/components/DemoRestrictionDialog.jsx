import { useEffect, useState } from 'react'
import { useDialogFocus } from './useDialogFocus.js'
import { currentUser } from '../data/store.js'

export default function DemoRestrictionDialog() {
  const [mode, setMode] = useState('demo')
  const [role, setRole] = useState('school')
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)
  const dialogRef = useDialogFocus(open, close)
  useEffect(() => {
    const showDemo = (event) => {
      setMode('demo')
      setRole(currentUser()?.role || 'school')
      setMessage('')
      setOpen(true)
    }
    const showSuccess = (event) => {
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
      <section ref={dialogRef} tabIndex={-1} className={`demo-action-dialog ${isDemo ? '' : 'success-action-dialog'}`} role="dialog" aria-modal="true" aria-labelledby="demo-action-title">
        <button className="demo-action-close" type="button" aria-label="Закрыть" onClick={() => setOpen(false)}>×</button>
        <div className={`demo-action-icon ${isDemo ? '' : 'success-action-icon'}`}><span>{isDemo ? '✦' : '✓'}</span></div>
        <span className="demo-action-kicker">{isDemo ? 'TALENTHUB · ДЕМО-АККАУНТ' : 'TALENTHUB · УСПЕШНО'}</span>
        <h2 id="demo-action-title">{isDemo ? 'Недоступно в демо-режиме' : 'Всё получилось!'}</h2>
        <p>{isDemo ? (role === 'moderator' ? 'Изменение данных недоступно в демо-кабинете модератора.' : 'Зарегистрируйте организацию, чтобы пользоваться всеми возможностями TalentHub.') : message}</p>
        {isDemo ? <>
          {role !== 'moderator' && <a className="demo-action-register" href={`/organization-registration?role=${role}`}>Зарегистрировать организацию <span>→</span></a>}
          <button className="demo-action-back" type="button" onClick={() => setOpen(false)}>Вернуться в демо-кабинет</button>
        </> : <button className="demo-action-register success-action-button" type="button" onClick={() => setOpen(false)}>Отлично</button>}
      </section>
    </div>
  )
}
