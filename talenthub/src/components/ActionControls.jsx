import { createContext, useContext, useRef, useState } from 'react'
const FormBusy = createContext(false)
const label = children => {
  const text = typeof children === 'string' ? children : ''
  return /сохран|профил|показать мероприятия/i.test(text) ? 'Сохраняем…' : /отправ|подать|отклик|создать/i.test(text) ? 'Отправляем…' : 'Обрабатываем…'
}
export function ActionForm({ onSubmit, children, ...props }) {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await onSubmit?.(event) } finally { lock.current = false; setBusy(false) }
  }
  return <FormBusy.Provider value={busy}><form {...props} aria-busy={busy} onSubmit={submit}>{children}</form></FormBusy.Provider>
}
export function ActionButton({ onClick, children, disabled, ...props }) {
  const formBusy = useContext(FormBusy)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const pending = busy || formBusy
  function click(event) {
    if (lock.current) { event.preventDefault(); return }
    const result = onClick?.(event)
    if (result && typeof result.then === 'function') {
      lock.current = true; setBusy(true)
      Promise.resolve(result).finally(() => { lock.current = false; setBusy(false) }).catch(() => {})
    }
  }
  return <button {...props} disabled={disabled || pending} aria-busy={pending} onClick={click}>{(busy || (formBusy && props.type !== 'button')) ? <><span className="th-spinner" aria-hidden="true" />{label(children)}</> : children}</button>
}
