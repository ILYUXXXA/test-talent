import { ApiBoundary, RequireRole, CatalogGuard } from './components/ApiBoundary.jsx'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppHeader from './components/AppHeader.jsx'
import StudentShell from './components/StudentShell.jsx'
import Landing from './pages/Landing.jsx'
import FamilyJoin from './pages/FamilyJoin.jsx'
import OrganizationRegistration from './pages/OrganizationRegistration.jsx'
import Auth from './pages/Auth.jsx'
import FirstLogin from './pages/FirstLogin.jsx'
import Events from './pages/Events.jsx'
import Applications from './pages/Applications.jsx'
import Notifications from './pages/Notifications.jsx'
import Success from './pages/Success.jsx'
import Profile from './pages/Profile.jsx'
import SchoolCabinet from './pages/SchoolCabinet.jsx'
import Admin from './pages/Admin.jsx'
import ParentLink from './pages/ParentLink.jsx'
import Company from './pages/Company.jsx'


function WithHeader({ children }) {
  return <AppHeader>{children}</AppHeader>
}

export default function App() {
  return (
    <ApiBoundary><BrowserRouter>
      <Routes>
        <Route path="/events" element={<CatalogGuard><StudentShell><Events /></StudentShell></CatalogGuard>} />
        <Route path="/applications" element={<RequireRole role="student"><StudentShell><Applications /></StudentShell></RequireRole>} />
        <Route path="/notifications" element={<RequireRole role="student"><StudentShell><Notifications /></StudentShell></RequireRole>} />
        <Route path="/success" element={<RequireRole role="student"><StudentShell><Success /></StudentShell></RequireRole>} />
        <Route path="/profile" element={<RequireRole role="student"><StudentShell><Profile /></StudentShell></RequireRole>} />
        <Route path="/" element={<Landing />} />
        <Route path="/family/join/:token" element={<WithHeader><FamilyJoin /></WithHeader>} />
        <Route path="/organization-registration" element={<WithHeader><OrganizationRegistration /></WithHeader>} />
        <Route path="/auth" element={<WithHeader><Auth /></WithHeader>} />
        <Route path="/welcome" element={<RequireRole role="student" onboarding><WithHeader><FirstLogin /></WithHeader></RequireRole>} />
        <Route path="/school" element={<RequireRole role="school"><SchoolCabinet /></RequireRole>} />
        <Route path="/admin" element={<RequireRole role="moderator"><Admin /></RequireRole>} />
        <Route path="/parent" element={<RequireRole role="parent"><ParentLink /></RequireRole>} />
        <Route path="/company" element={<RequireRole role="company"><Company /></RequireRole>} />
      </Routes>
    </BrowserRouter></ApiBoundary>
  )
}
