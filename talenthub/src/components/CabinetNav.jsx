import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { revealNavigationItem } from './navigation.js'

export default function CabinetNav({ activeKey, children, ...props }) {
  const ref = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const nav = ref.current
    const active = nav?.querySelector('[aria-current="page"], .active')
    if (!nav || !active) return
    const reveal = () => revealNavigationItem(nav, active)
    reveal()
    const observer = new ResizeObserver(reveal)
    observer.observe(nav)
    observer.observe(active)
    return () => observer.disconnect()
  }, [pathname, activeKey])

  return <nav ref={ref} {...props} onFocusCapture={event => {
    const item = event.target.closest('a, button')
    if (item) revealNavigationItem(ref.current, item)
  }}>{children}</nav>
}
