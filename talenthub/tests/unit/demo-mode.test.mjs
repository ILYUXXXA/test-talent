import test from 'node:test'
import assert from 'node:assert/strict'
import { request } from '../../src/api/client.js'
import { completeProfile, publishEvent, moderate, sendPartnership } from '../../src/data/store.js'

test('demo response stops raw normalization, refresh and success feedback', async () => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  const originalEvent = globalThis.CustomEvent
  const events = []
  const requests = []
  globalThis.window = { dispatchEvent: event => events.push(event.type) }
  globalThis.CustomEvent = class { constructor(type) { this.type = type } }
  globalThis.fetch = async url => { requests.push(url); return Response.json({demo_mode:true}) }
  try {
    await assert.rejects(completeProfile({grade:10,city:'Минск',interests:['Физика']}), e => e.code === 'demo_restricted')
    assert.equal(requests.length, 1)
    assert.deepEqual(events, ['talenthub:demo-restriction'])
    await assert.rejects(request('/events', {method:'POST', raw:true}), e => e.code === 'demo_restricted')
    assert.equal(events.length, 2)
    for (const action of [
      () => publishEvent({grade:'7–11',title:'Test',seats:10}),
      () => moderate('events','event-id','approved'),
      () => sendPartnership({parentRequestId:'offer-id'}),
    ]) {
      const before = requests.length
      await assert.rejects(action(), e => e.code === 'demo_restricted')
      assert.equal(requests.length, before + 1, 'demo rejection must not refresh data')
    }
    assert.equal(events.length, 5)
    assert.ok(events.every(type => type === 'talenthub:demo-restriction'))
  } finally {
    globalThis.fetch = originalFetch
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow
    if (originalEvent === undefined) delete globalThis.CustomEvent; else globalThis.CustomEvent = originalEvent
  }
})

test('allowed response preserves entity and creation status', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => Response.json({id:'created',demo_mode:false},{status:201})
    assert.deepEqual(await request('/events', {method:'POST',raw:true}), {status:201,data:{id:'created',demo_mode:false}})
  } finally { globalThis.fetch = original }
})
