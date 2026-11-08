import test from 'node:test'
import assert from 'node:assert/strict'
import { getToken } from '../../src/api/client.js'
import { currentUser, logout, parentCabinet, registerParent } from '../../src/data/store.js'

const account = { id: 'parent-id', role: 'parent', first_name: 'Иван', last_name: 'Коваль', email: 'parent@example.org' }
const fields = { firstName: 'Иван', lastName: 'Коваль', email: account.email, password: 'password123' }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })

test('parent signup sends the backend contract and opens an authenticated empty parent cabinet', async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  logout()
  try {
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname.replace('/api/v1', '')
      calls.push(path)
      if (path === '/auth/register') {
        assert.equal(options.method, 'POST')
        assert.equal(options.headers.has('Authorization'), false)
        assert.deepEqual(JSON.parse(options.body), {
          role: 'parent', first_name: 'Иван', last_name: 'Коваль', email: account.email, password: fields.password,
        })
        return json({ access_token: 'test-parent-token', token_type: 'bearer', user: account }, 201)
      }
      assert.equal(options.headers.get('Authorization'), path === '/reference-data' || path === '/organizations' ? null : 'Bearer test-parent-token')
      if (path === '/reference-data') return json({ grades: [], cities: [], interests: [] })
      if (path === '/auth/me') return json(account)
      if (path === '/parents/me/child') return json({ child: null })
      if (path === '/parents/me/children') return json({ items: [], active_child_id: null })
      if (['/organizations', '/events', '/schools', '/parents/me/suggestions'].includes(path)) return json({ items: [] })
      throw new Error(`Unexpected request: ${path}`)
    }
    const user = await registerParent({ ...fields, birthDate: '1980-01-01', school: 'ignored-school' })
    assert.equal(user.role, 'parent')
    assert.equal(currentUser().firstName, 'Иван')
    assert.equal(getToken(), 'test-parent-token')
    assert.equal(parentCabinet().loggedIn, true)
    assert.deepEqual(parentCabinet().children, [])
    assert.equal(calls.filter(path => path === '/auth/register').length, 1)
    assert.ok(calls.includes('/parents/me/children'))
    assert.equal(calls.includes('/students/me'), false)
  } finally {
    logout()
    globalThis.fetch = originalFetch
  }
})

test('parent signup preserves duplicate-email errors without creating a session', async () => {
  const originalFetch = globalThis.fetch
  logout()
  try {
    globalThis.fetch = async () => json({ error: { code: 'email_taken', message: 'Email уже занят' } }, 409)
    await assert.rejects(registerParent(fields), error => error.status === 409 && error.code === 'email_taken' && error.message === 'Email уже занят')
    assert.equal(getToken(), null)
    assert.equal(currentUser(), null)
  } finally {
    logout()
    globalThis.fetch = originalFetch
  }
})
