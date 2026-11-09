import { ActionButton } from './ActionControls.jsx'
import { useEffect, useState } from 'react'
import { getFamilyInvitation, createFamilyInvitation, deleteFamilyInvitation } from '../data/store.js'

export default function FamilyInvitation() {
  const [invitation, setInvitation] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    let active = true
    getFamilyInvitation().then(data => { if (active) setInvitation(data.invitation) })
      .catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [])
  async function change(remove = false) {
    if (busy) return
    setBusy(true); setError(''); setNote('')
    try { const data = await (remove ? deleteFamilyInvitation() : createFamilyInvitation()); setInvitation(data.invitation); setConfirmDelete(false); setNote(remove ? 'Семейная ссылка удалена.' : 'Семейная ссылка создана.') }
    catch (e) { if (e.code === 'demo_restricted') return; setError(e.message) } finally { setBusy(false) }
  }
  const url = invitation ? `${window.location.origin}/family/join/${encodeURIComponent(invitation.token)}` : ''
  return <section className="card stack" aria-labelledby="family-invitation-title" aria-busy={busy}>
    <h2 id="family-invitation-title" className="card-title">Пригласить ребёнка</h2>
    <p>Отправьте ссылку ребёнку. После входа в аккаунт школьника он автоматически добавится в вашу семью. По одной ссылке можно пригласить нескольких детей.</p>
    {busy ? <p role="status">Загружаем…</p> : null}
    {error ? <p className="notice" role="alert">{error}</p> : null}
    {invitation ? <>
      <label className="field"><span>Семейная ссылка</span><input readOnly value={url} onFocus={e => e.target.select()} /></label>
      <div className="row"><ActionButton className="btn btn-primary" disabled={busy} onClick={async () => {
        try { await navigator.clipboard.writeText(url); setNote('Ссылка скопирована.'); setError('') } catch { setError('Не удалось скопировать. Выделите ссылку и скопируйте её вручную.') }
      }}>Скопировать ссылку</ActionButton><ActionButton className="btn btn-ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>Удалить ссылку</ActionButton></div>
      {confirmDelete ? <div className="notice stack"><p>Ссылка перестанет работать. Уже добавленные дети останутся в семье.</p><div className="row"><ActionButton className="btn btn-primary" disabled={busy} onClick={() => change(true)}>Удалить</ActionButton><ActionButton className="btn btn-ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>Отмена</ActionButton></div></div> : null}
    </> : <ActionButton className="btn btn-primary" disabled={busy} onClick={() => change()}>Создать ссылку</ActionButton>}
    {note ? <p role="status">{note}</p> : null}
  </section>
}
