import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Build the actual JSX with the project's Vite configuration, then render it.
// A production build alone cannot catch a component shadowing an imported button.
test('event feed renders ordinary controls without requiring an event prop', async () => {
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--ssr', 'src/components/EventFeed.jsx', '--outDir', 'dist/render-test', '--emptyOutDir'], { stdio: 'pipe' })
  const { default: EventFeed } = await import('../../dist/render-test/EventFeed.js')
  const html = renderToStaticMarkup(createElement(EventFeed, {}))
  assert.match(html, /<button/)
  assert.match(html, /Фильтры/)
})

// The same status replaces the action in both catalog cards and event details.
test('suggested event confirmation has no repeated suggestion button', async () => {
  const { EventSuggestionStatus } = await import('../../dist/render-test/EventFeed.js')
  const html = renderToStaticMarkup(createElement(EventSuggestionStatus))
  assert.match(html, /Уже предложено ребёнку/)
  assert.doesNotMatch(html, /<button/)
})
