import { ActionButton, ActionForm } from './ActionControls.jsx'
import { useEffect, useState } from 'react'
import { getState, listOrganizationAccounts, createOrganizationAccount, rotateOrganizationToken } from '../data/store.js'
import { useDialogFocus } from './useDialogFocus.js'

export default function OrganizationAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [source, setSource] = useState('existing')
  const [secret, setSecret] = useState(null)
  const [rotation, setRotation] = useState(null)
  const organizations = getState().organizations
  const close = () => { if (!busy) { setSecret(null); setRotation(null); setNote('') } }
  const dialogRef = useDialogFocus(Boolean(secret || rotation), close)
  useEffect(() => {
    let active = true
    listOrganizationAccounts().then(data => { if (active) setAccounts(data.items) })
      .catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  function updateAccount(result) {
    setAccounts(rows => [...rows.filter(row => row.user.id !== result.account.user.id), result.account])
    setRotation(null); setSecret(result); setNote('')
  }
  async function create(event) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const body = { first_name: fields.get('first_name').trim(), last_name: fields.get('last_name').trim(), email: fields.get('email').trim(),
      ...(source === 'existing' ? { organization_id: fields.get('organization_id') } : { organization: { kind: fields.get('kind'), name: fields.get('name').trim(), city: fields.get('city').trim() } }) }
    setBusy(true); setError('')
    try { updateAccount(await createOrganizationAccount(body)); form.reset() }
    catch (e) { if (e.code === 'demo_restricted') return; setError(e.message) } finally { setBusy(false) }
  }
  async function rotate() {
    if (busy || !rotation) return
    setBusy(true); setError('')
    try { updateAccount(await rotateOrganizationToken(rotation.user.id)) }
    catch (e) { if (e.code === 'demo_restricted') return; setError(e.message) } finally { setBusy(false) }
  }
  return <div className="stack">
    <h1>Аккаунты организаций</h1>
    <p className="lead">Создавайте доступ для школ и компаний после согласования подключения. Контактная почта не используется для входа.</p>
    {error ? <p className="notice" role="alert">{error}</p> : null}
    <ActionForm className="card stack" onSubmit={create} aria-busy={busy}>
      <h2 className="card-title">Создать аккаунт</h2>
      <label className="field"><span>Организация</span><select value={source} onChange={e => setSource(e.target.value)} disabled={busy}><option value="existing">Из каталога</option><option value="new">Новая организация</option></select></label>
      {source === 'existing' ? <label className="field"><span>Организация из каталога</span><select name="organization_id" required disabled={busy}><option value="">Выберите организацию</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name} · {org.city} · {org.kind === 'school' ? 'Школа' : org.kind === 'academy' ? 'Академия' : 'Компания'}</option>)}</select></label> : <div className="grid-3">
        <label className="field"><span>Тип</span><select name="kind" disabled={busy}><option value="school">Школа</option><option value="company">Компания</option><option value="academy">Академия</option></select></label>
        <label className="field"><span>Название</span><input name="name" required maxLength={200} disabled={busy} /></label>
        <label className="field"><span>Город</span><input name="city" required maxLength={100} disabled={busy} /></label>
      </div>}
      <div className="grid-3"><label className="field"><span>Имя представителя</span><input name="first_name" required maxLength={100} disabled={busy} /></label><label className="field"><span>Фамилия представителя</span><input name="last_name" required maxLength={100} disabled={busy} /></label><label className="field"><span>Контактная почта</span><input name="email" type="email" required disabled={busy} /></label></div>
      <ActionButton className="btn btn-primary" disabled={busy} type="submit">{busy ? 'Сохраняем…' : 'Создать и выдать токен'}</ActionButton>
    </ActionForm>
    <section className="stack" aria-labelledby="organization-accounts-title"><h2 id="organization-accounts-title">Созданные аккаунты</h2>
      {loading ? <p role="status">Загружаем аккаунты…</p> : accounts.length ? accounts.map(account => <article className="card spread" key={account.user.id}>
        <div><h3 className="card-title">{account.organization.name}</h3><p>{account.user.first_name} {account.user.last_name} · {account.user.email}</p><p className="muted">{account.user.role === 'school' ? 'Школа' : 'Компания'} · {account.organization.city} · {account.has_token ? 'Токен выдан' : 'Токен ещё не выдан'}</p></div>
        <ActionButton className="btn btn-ghost" disabled={busy} onClick={() => { setError(''); setRotation(account) }}>{account.has_token ? 'Перевыпустить токен' : 'Выдать токен'}</ActionButton>
      </article>) : <p>Аккаунтов пока нет.</p>}
    </section>
    {secret || rotation ? <div className="detail-backdrop"><section className="detail-panel stack" role="dialog" aria-modal="true" aria-labelledby="organization-token-title" tabIndex={-1} ref={dialogRef}>
      <div className="spread"><h2 id="organization-token-title">{secret ? 'Токен доступа' : 'Перевыпустить токен?'}</h2><ActionButton className="btn btn-ghost" disabled={busy} onClick={close}>Закрыть</ActionButton></div>
      {secret ? <><p>{secret.account.organization.name}. Передайте токен представителю. Он показывается только сейчас; сохраните его перед закрытием.</p><label className="field"><span>Токен доступа</span><input readOnly value={secret.token} onFocus={e => e.target.select()} /></label><ActionButton className="btn btn-primary" onClick={async () => {
        try { await navigator.clipboard.writeText(secret.token); setNote('Токен скопирован.') } catch { setNote('Скопируйте токен вручную из поля выше.') }
      }}>Скопировать токен</ActionButton>{note ? <p role="status">{note}</p> : null}</> : <><p>{rotation.organization.name}: старый токен и все текущие сеансы этого аккаунта перестанут работать.</p><p>После выпуска сохраните новый токен и передайте представителю.</p>{error ? <p className="notice" role="alert">{error}</p> : null}<ActionButton className="btn btn-primary" disabled={busy} onClick={rotate}>{busy ? 'Выпускаем…' : 'Выпустить новый токен'}</ActionButton><ActionButton className="btn btn-ghost" disabled={busy} onClick={close}>Отмена</ActionButton></>}
    </section></div> : null}
  </div>
}
