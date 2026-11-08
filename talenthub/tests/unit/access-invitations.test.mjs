import test from 'node:test'
import assert from 'node:assert/strict'
import { rememberInvitation, clearInvitation, rejectInvitation, pendingInvitationPath, studentDestination } from '../../src/data/family-invitation.js'
import { loginOrganization, currentUser, logout, createFamilyInvitation, getFamilyInvitation, deleteFamilyInvitation } from '../../src/data/store.js'
const json = (body, status = 200) => new Response(JSON.stringify(body), {status})
test('family invitation survives onboarding and only returns to an internal invitation route', () => {
 const original = globalThis.sessionStorage
 const map = new Map()
 globalThis.sessionStorage = { getItem: key => map.get(key), setItem: (key,value) => map.set(key,value), removeItem: key => map.delete(key) }
 try {
  rememberInvitation('signed/token?next=https://evil.test')
  assert.equal(studentDestination({profileComplete:false}), '/welcome')
  assert.equal(studentDestination({profileComplete:true}), '/family/join/signed%2Ftoken%3Fnext%3Dhttps%3A%2F%2Fevil.test')
  assert.equal(pendingInvitationPath(), studentDestination({profileComplete:true}))
  clearInvitation()
  assert.equal(studentDestination({profileComplete:true}), '/events')
 } finally { if (original === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = original }
})
test('organization login exchanges only token and expected role, keeps failed login errors', async () => {
 const original = globalThis.fetch
 logout()
 try {
  globalThis.fetch = async (url, options) => {
   const path = new URL(url).pathname.replace('/api/v1','')
   assert.equal(path, '/auth/organization-login')
   assert.deepEqual(JSON.parse(options.body), {token:'wrong-token',expected_role:'school'})
   assert.equal(options.headers.has('Authorization'), false)
   return json({error:{code:'invalid_credentials',message:'Неверный токен доступа или роль'}},401)
  }
  await assert.rejects(loginOrganization('wrong-token','school'), e => e.status === 401 && e.code === 'invalid_credentials')
  assert.equal(currentUser(),null)
 } finally { logout(); globalThis.fetch = original }
})
test('parent invitation requests use GET, POST and DELETE without personal child data', async () => {
 const original = globalThis.fetch
 const methods = []
 try {
  globalThis.fetch = async (url, options) => {
   assert.ok(url.endsWith('/parents/me/invitation'))
   assert.equal(options.body, undefined)
   methods.push(options.method || 'GET')
   return json({invitation: options.method === 'DELETE' ? null : {token:'signed-link'}})
  }
  await getFamilyInvitation(); await createFamilyInvitation(); assert.equal((await deleteFamilyInvitation()).invitation,null)
  assert.deepEqual(methods,['GET','POST','DELETE'])
 } finally { globalThis.fetch = original }
})

test('deleted invitations stop redirecting future logins while network failures remain retryable', () => {
 const original = globalThis.sessionStorage
 const map = new Map()
 globalThis.sessionStorage = { getItem: key => map.get(key), setItem: (key,value) => map.set(key,value), removeItem: key => map.delete(key) }
 try {
  rememberInvitation('removed')
  rejectInvitation('removed', {code:'invalid_invitation'})
  assert.equal(studentDestination({profileComplete:true}), '/events')
  rememberInvitation('retry')
  rejectInvitation('retry', {code:'network_error'})
  assert.equal(pendingInvitationPath(), '/family/join/retry')
  rememberInvitation('new-link')
  rejectInvitation('old-link', {code:'invalid_invitation'})
  assert.equal(pendingInvitationPath(), '/family/join/new-link')
 } finally { if (original === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = original }
})
