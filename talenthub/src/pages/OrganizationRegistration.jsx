import { Link, useSearchParams } from 'react-router-dom'
import { contacts } from '../data/contacts.js'
export default function OrganizationRegistration() {
  const [params] = useSearchParams()
  const role = params.get('role') === 'school' ? 'school' : 'company'
  return <main className="auth-page"><div className="container narrow auth-container"><section className="card stack">
    <h1>{role === 'school' ? 'Подключение школы' : 'Подключение компании'}</h1>
    <p>Чтобы зарегистрировать организацию в TalentHub, свяжитесь с нашей командой. Мы обсудим подключение и создадим аккаунт после согласования.</p>
    <p>Модератор выдаст токен доступа. Используйте его для входа в кабинет организации.</p>
    {contacts.map(item => <div key={item.label}><strong>{item.label}</strong><p>{item.href ? <a href={item.href}>{item.value}</a> : item.value || 'Скоро добавим'}</p></div>)}
    <a className="btn btn-primary" href="/#contacts">Контакты команды</a><Link className="btn btn-ghost" to={`/auth?role=${role}`}>Вернуться ко входу</Link>
  </section></div></main>
}
