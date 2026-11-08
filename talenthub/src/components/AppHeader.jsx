import { Link } from 'react-router-dom'

function Brand() {
  return <Link to="/" className="brand-lockup" aria-label="TalentHub — главная"><span className="brand-mark">t.</span><span className="brand-word">Talent<span>Hub</span></span></Link>
}

export default function AppHeader({ children }) {
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Brand />

        </div>
      </header>
      {children}
    </>
  )
}
