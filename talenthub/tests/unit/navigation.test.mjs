import test from 'node:test'
import assert from 'node:assert/strict'
import { revealNavigationItem } from '../../src/components/navigation.js'

function strip({ left = 100, width = 300, scrollWidth = 900 } = {}) {
  const calls = []
  return {
    calls, scrollWidth, clientWidth: width,
    getBoundingClientRect: () => ({ left, right: left + width }),
    scrollBy: options => calls.push(options),
  }
}
const tab = (left, right) => ({ getBoundingClientRect: () => ({ left, right }) })

test('a selected tab outside the right edge scrolls only its navigation strip', () => {
  const nav = strip()
  revealNavigationItem(nav, tab(360, 510))
  assert.deepEqual(nav.calls, [{ left: 114, top: 0, behavior: 'instant' }])
})
test('returning to a tab hidden on the left reveals its beginning', () => {
  const nav = strip()
  revealNavigationItem(nav, tab(40, 190))
  assert.deepEqual(nav.calls, [{ left: -64, top: 0, behavior: 'instant' }])
})
test('visible tabs and a fully fitting navigation bar do not move', () => {
  const nav = strip()
  revealNavigationItem(nav, tab(110, 260))
  assert.deepEqual(nav.calls, [])
  const fitting = strip({ scrollWidth: 300 })
  revealNavigationItem(fitting, tab(110, 260))
  assert.deepEqual(fitting.calls, [])
})
