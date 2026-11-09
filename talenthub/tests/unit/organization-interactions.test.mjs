import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { JSDOM } from 'jsdom'
import { createElement as h, act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
let ui
before(async () => {
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js','build','--ssr','tests/support/organization-ui.jsx','--outDir','dist/organization-test','--emptyOutDir'], {stdio:'pipe'})
  ui = await import('../../dist/organization-test/organization-ui.js')
})
const school = {id:'school-org',kind:'school',name:'Школа №17',city:'Минск'}
const company = {id:'company-org',kind:'company',name:'КодМастер',city:'Минск'}
const offer = id => ({id,title:`Программа ${id}`,description:`Условия ${id}`,sender:school,target:null,visibility:'all_companies',moderation_status:'approved',direct_decision:null,responses:[],created_at:'2026-11-09T10:00:00Z'})
const json = data => Response.json(data)
async function setup(t, role) {
  const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost/'})
  const originals = new Map()
  for (const [key,value] of Object.entries({window:dom.window, document:dom.window.document, HTMLElement:dom.window.HTMLElement, CustomEvent:dom.window.CustomEvent, IS_REACT_ACT_ENVIRONMENT:true, ResizeObserver:class { observe(){} disconnect(){} }})) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{configurable:true,writable:true,value})
  }
  dom.window.scrollTo = () => {}
  const originalFetch = globalThis.fetch
  ui.logout(); ui.setToken('test-token')
  const organization = role === 'school' ? school : company
  const user = {id:`${role}-user`,role,organization_id:organization.id,orgName:organization.name}
  const state = ui.getState()
  Object.assign(state,{user,rawUser:user,organizations:[school,company],dashboard:{organization,counters:{}},events:[],students:[],marketplace:ui.partnershipViews([offer('A'),offer('B')],user),partnerships:role === 'school' ? [{id:'inbound',from:company.name,to:school.name,title:'Входящий запрос',status:'incoming',visibility:'direct'}] : []})
  let submitted = null
  const posts = []
  let reply = async () => json({demo_mode:true})
  globalThis.fetch = async (url,options) => {
    const path = new URL(url).pathname.replace('/api/v1','')
    if (options.method && options.method !== 'GET') { posts.push(path); const result = await reply(); if (result.ok && !((await result.clone().json()).demo_mode)) submitted = path.split('/')[2]; return result }
    if (path === '/auth/me') return json(user)
    if (path === '/reference-data') return json({grades:[],cities:[],interests:[]})
    if (path === '/organizations') return json({items:[school,company]})
    if (path === '/organizations/me/dashboard') return json({organization,counters:{}})
    if (path.startsWith('/partnership-requests')) {
      const rows = ['A','B'].map(id => ({...offer(id), responses:submitted === id ? [{id:'reply',organization:company,status:'pending',created_at:'2026-11-09T10:00:00Z'}] : []}))
      return json({items:rows})
    }
    return json({items:[]})
  }
  const root = createRoot(document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount()); ui.logout(); globalThis.fetch = originalFetch; dom.window.close()
    for (const [key,descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key] }
  })
  await act(async () => root.render(h(MemoryRouter,null,h(role === 'school' ? ui.School : ui.Company),h(ui.Feedback))))
  return {posts, reply: fn => {reply=fn}}
}
const button = text => {
  const found = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text)
  assert.ok(found, `Missing button: ${text}`); return found
}
async function click(text) { await act(async () => button(text).click()) }
for (const outcome of ['demo','network']) {
  test(`school request releases loading after ${outcome} rejection`, async t => {
    const api = await setup(t,'school')
    await click('Сотрудничество')
    let finish
    api.reply(() => new Promise((resolve,reject) => {finish = () => outcome === 'demo' ? resolve(json({demo_mode:true})) : reject(new Error('offline'))}))
    await click('Принять запрос')
    assert.ok(button('Обрабатываем…').disabled)
    await act(async () => button('Обрабатываем…').click())
    assert.equal(api.posts.length,1)
    await act(async () => finish())
    if (outcome === 'demo') {
      assert.match(document.body.textContent,/Недоступно в демо-режиме/)
      assert.doesNotMatch(document.body.textContent,/Всё получилось/)
      await click('Вернуться в демо-кабинет')
    }
    assert.equal(button('Принять запрос').disabled,false)
    assert.equal(button('Отклонить').disabled,false)
    assert.doesNotMatch(document.body.textContent,/Обрабатываем/)
    assert.match(document.body.textContent,/Входящий запрос/)
  })
}
test('company confirms the selected public request, can cancel and switch context', async t => {
  const api = await setup(t,'company')
  await click('Запросы школ')
  await act(async () => [...document.querySelectorAll('button')].find(el => el.textContent === 'Откликнуться').click())
  assert.equal(api.posts.length,0)
  let panel = document.querySelector('[aria-labelledby="market-response-title"]')
  assert.ok(panel); assert.match(panel.textContent,/Программа A/); assert.match(panel.textContent,/Школа №17/); assert.match(panel.textContent,/КодМастер/); assert.match(panel.textContent,/Условия A/)
  assert.equal(panel.querySelectorAll('input,textarea,select').length,0)
  await click('Отмена')
  await act(async () => [...document.querySelectorAll('button')].filter(el => el.textContent === 'Откликнуться')[1].click())
  panel = document.querySelector('[aria-labelledby="market-response-title"]')
  assert.match(panel.textContent,/Программа B/); assert.doesNotMatch(panel.textContent,/Программа A/)
  let finish
  api.reply(() => new Promise(resolve => { finish = () => resolve(json({demo_mode:true})) }))
  await click('Отправить отклик')
  await act(async () => button('Отправляем…').click())
  assert.equal(api.posts.length,1)
  await act(async () => finish())
  assert.deepEqual(api.posts,['/partnership-requests/B/responses'])
  assert.match(document.body.textContent,/Недоступно в демо-режиме/)
  await click('Вернуться в демо-кабинет')
  assert.equal(button('Отправить отклик').disabled,false)
  assert.match(document.querySelector('[aria-labelledby="market-response-title"]').textContent,/Программа B/)
  api.reply(async () => { throw new Error('offline') })
  await click('Отправить отклик')
  assert.equal(button('Отправить отклик').disabled,false)
  assert.match(document.querySelector('[aria-labelledby="market-response-title"]').textContent,/Программа B/)
  api.reply(async () => json({id:'response',demo_mode:false}))
  await click('Отправить отклик')
  assert.match(document.querySelector('[aria-labelledby="market-response-title"]').textContent,/Отклик отправлен/)
  assert.equal(document.querySelector('[aria-labelledby="market-response-title"]').querySelector('button'),null)
  await click('Запросы школ')
  assert.equal(button('Отклик отправлен').disabled,true)
})
