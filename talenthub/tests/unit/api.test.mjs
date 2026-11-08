import test from 'node:test'
import assert from 'node:assert/strict'
import { queryString, request, setToken, getToken, onUnauthorized } from '../../src/api/client.js'
import { eventView, registrationView, partnershipViews } from '../../src/data/normalizers.js'

test('query serializes repeated directions and actual false values', () => {
  const query = new URLSearchParams(queryString({ interest:['Математика','Физика'], upcoming:false, kind:'all' }).slice(1))
  assert.deepEqual(query.getAll('interest'),['Математика','Физика'])
  assert.equal(query.get('upcoming'),'false')
  assert.equal(query.has('kind'),false)
})
test('HTTP client sends Bearer JSON and clears an invalid session', async () => {
  const original=globalThis.fetch
  let cleared=false
  try {
    setToken('test-only-token'); onUnauthorized(()=>{cleared=true})
    globalThis.fetch=async(url,options)=>{
      assert.equal(options.headers.get('Authorization'),'Bearer test-only-token')
      assert.equal(options.credentials,'omit')
      assert.deepEqual(JSON.parse(options.body),{decision:'approved'})
      return new Response(JSON.stringify({error:{code:'invalid_token',message:'Токен истёк'}}),{status:401})
    }
    await assert.rejects(request('/registrations/id/decision',{method:'PATCH',body:{decision:'approved'}}),error=>error.status===401&&error.code==='invalid_token')
    assert.equal(getToken(),null); assert.equal(cleared,true)
  } finally {globalThis.fetch=original}
})
test('registration keeps application and event identifiers separate',()=>{
  const row=registrationView({id:'registration-id',event_id:'event-id',status:'under_review',attended_at:null,event:{title:'Тур',organizer:{name:'Школа'},kind:'olympiad',format:'online'}})
  assert.equal(row.id,'registration-id');assert.equal(row.eventId,'event-id');assert.equal(row.status,'на рассмотрении');assert.equal(row.attended,false)
})
test('event adapter translates API enums without fabricating missing grades',()=>{
  assert.equal(eventView({organizer:{name:'Школа'},kind:'project',project_kind:'hackathon',format:'hybrid'}).projectKind,'хакатон')
  assert.equal(eventView({organizer:{name:'Школа'}}).grade,'')
})
test('public offer decisions and separate responder cards remain independent',()=>{
  const rows=partnershipViews([{id:'offer',sender:{id:'owner',name:'Компания'},target:null,visibility:'all_schools',moderation_status:'approved',direct_decision:null,created_at:'2026-11-06T00:00:00Z',responses:[{id:'response',organization:{id:'school',name:'Школа'},status:'pending',created_at:'2026-11-06T00:00:00Z'}]}],{organization_id:'owner'})
  assert.equal(rows[0].status,'pending');assert.equal(rows[1].id,'response:response');assert.equal(rows[1].canDecide,true)
})
