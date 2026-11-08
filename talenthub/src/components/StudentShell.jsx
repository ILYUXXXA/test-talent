import CabinetNav from './CabinetNav.jsx'
import { Link, NavLink } from 'react-router-dom'

function TabIcon({ children }) {
  return <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
}

const TABS = [
  { to: '/events', label: 'Мероприятия', icon: <TabIcon><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></TabIcon> },
  { to: '/applications', label: 'Мои заявки', icon: <TabIcon><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9 3.5h6V7H9zM9 11h6M9 15h4" /></TabIcon> },
  { to: '/notifications', label: 'Уведомления', icon: <TabIcon><path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2h-15L6 16z" /><path d="M10 19a2 2 0 0 0 4 0" /></TabIcon> },
  { to: '/success', label: 'Достижения', icon: <TabIcon><circle cx="12" cy="9" r="5" /><path d="M8.5 13.2 7 21l5-2.4L17 21l-1.5-7.8" /></TabIcon> },
  { to: '/profile', label: 'Профиль', icon: <TabIcon><circle cx="12" cy="8" r="3.5" /><path d="M5 19.5c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" /></TabIcon> },
]

export default function StudentShell({ children }) {
  return (
    <>
      <header className="header student-header">
        <div className="header-inner">
          <Link to="/" className="brand-lockup" aria-label="TalentHub — главная"><span className="brand-mark">t.</span><span className="brand-word">Talent<span>Hub</span></span></Link>
          <CabinetNav className="nav student-tabs org-shell-tabs" aria-label="Разделы кабинета">
            {TABS.map((tab) => <NavLink key={tab.to} to={tab.to}>{tab.icon}{tab.label}</NavLink>)}
          </CabinetNav>
        </div>
      </header>
      {children}
    </>
  )
}
