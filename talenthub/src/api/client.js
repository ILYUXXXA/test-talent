const configured = import.meta.env?.VITE_API_URL || 'https://lbsuhack.onrender.com'
export const API_BASE = `${configured.replace(/\/+$/, '').replace(/\/api\/v1$/, '')}/api/v1`
export const TOKEN_KEY = 'talenthub_access_token'
let unauthorized = () => {}
let token = globalThis.sessionStorage?.getItem(TOKEN_KEY) || null

export function setToken(value) {
  token = value || null
  if (token) globalThis.sessionStorage?.setItem(TOKEN_KEY, token)
  else globalThis.sessionStorage?.removeItem(TOKEN_KEY)
}
export const getToken = () => token
export const onUnauthorized = (callback) => { unauthorized = callback }
export class ApiError extends Error {
  constructor(message, status = 0, code = 'network_error') { super(message); this.name = 'ApiError'; this.status = status; this.code = code }
}
export async function request(path, { body, auth = true, raw = false, signal, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  const sentToken = auth ? token : null
  if (sentToken) headers.set('Authorization', `Bearer ${sentToken}`)
  const timeout = AbortSignal.timeout(90000)
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options, headers, credentials: 'omit',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(error.name === 'TimeoutError' ? 'Сервер не ответил вовремя. Попробуйте ещё раз.' : 'Не удалось связаться с сервером. Проверьте подключение и настройки CORS.')
  }
  let data
  try { data = await response.json() } catch { throw new ApiError('Сервер вернул неожиданный ответ.', response.status, 'invalid_response') }
  if (!response.ok) {
    if (response.status === 401 && sentToken && token === sentToken) { setToken(null); unauthorized() }
    throw new ApiError(data.error?.message || 'Не удалось выполнить запрос.', response.status, data.error?.code || 'http_error')
  }
  if (data?.demo_mode === true) {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('talenthub:demo-restriction'))
    throw new ApiError('Это действие недоступно на демо-аккаунте', response.status, 'demo_restricted')
  }
  return raw ? { data, status: response.status } : data
}
export function queryString(values = {}) {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(values)) {
    if (value == null || value === '' || value === 'all') continue
    for (const item of Array.isArray(value) ? value : [value]) query.append(name, String(item))
  }
  return query.size ? `?${query}` : ''
}
