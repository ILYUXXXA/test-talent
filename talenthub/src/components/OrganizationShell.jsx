import CabinetNav from './CabinetNav.jsx'
import { Link } from 'react-router-dom'

const ICONS = {
  overview: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></>,
  events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  prestige: <><path d="m12 3 2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6-4.8 2.6.9-5.5-4-3.9 5.5-.8z" /></>,
  partners: <><path d="m8 12 3 3a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-2 2" /><path d="m16 12-3-3a3 3 0 0 0-4 0l-4 4a3 3 0 0 0 4 4l2-2" /></>,
  market: <><path d="M4 7h16M4 12h16M4 17h10" /><circle cx="18" cy="17" r="2" /></>,
  schools: <><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-6h6v6" /></>,
  students: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
  create: <><path d="M12 5v14M5 12h14" /></>,
}

export default function OrganizationShell({ tabs, activeTab, onTabChange, children }) {
  return (
    <>
      <header className="header student-header">
        <div className="header-inner">
          <Link to="/" className="brand-lockup" aria-label="TalentHub — главная"><span className="brand-mark">t.</span><span className="brand-word">Talent<span>Hub</span></span></Link>
          <CabinetNav activeKey={activeTab} className="nav student-tabs org-shell-tabs" aria-label="Разделы кабинета">
            {tabs.map(([id, label, icon = id]) => (
              <button key={id} type="button" className={activeTab === id ? 'active' : ''} aria-current={activeTab === id ? 'page' : undefined} onClick={() => onTabChange(id)}>
                <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[icon] || ICONS.overview}</svg>
                {label}
              </button>
            ))}
          </CabinetNav>
        </div>
      </header>
      {children}
    </>
  )
}
