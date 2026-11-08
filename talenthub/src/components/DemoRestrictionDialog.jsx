import { useEffect, useState } from 'react'

export default function DemoRestrictionDialog() {
  const [role, setRole] = useState('school')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const show = (event) => {
      setRole(event.detail?.role === 'company' ? 'company' : 'school')
      setOpen(true)
    }
    window.addEventListener('talenthub:demo-restriction', show)
    return () => window.removeEventListener('talenthub:demo-restriction', show)
  }, [])

  if (!open) return null
  return (
    <div className="demo-action-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="demo-action-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-action-title">
        <button className="demo-action-close" type="button" aria-label="Закрыть" onClick={() => setOpen(false)}>×</button>
        <div className="demo-action-icon"><span>✦</span></div>
        <span className="demo-action-kicker">TALENTHUB · ДЕМО-АККАУНТ</span>
        <h2 id="demo-action-title">Эта возможность пока недоступна</h2>
        <p>Вы можете знакомиться с кабинетом, но для этого действия нужна зарегистрированная организация. Создайте аккаунт школы или компании, чтобы пользоваться всеми возможностями TalentHub.</p>
        <a className="demo-action-register" href={`/organization-registration?role=${role}`}>Зарегистрировать организацию <span>→</span></a>
        <button className="demo-action-back" type="button" onClick={() => setOpen(false)}>Вернуться в демо-кабинет</button>
      </section>
    </div>
  )
}
