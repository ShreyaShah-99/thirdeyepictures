/**
 * Central API client for Third Eye Photography backend.
 * All requests go through here — token is attached automatically.
 */

import { getIdToken } from './cognito'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `Request failed: ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function get<T>(path: string) {
  return request<T>(path, { method: 'GET' })
}

/**
 * GET a list endpoint and always resolve to an array. If the backend returns
 * a non-array (error object, unexpected shape), this yields [] so callers can
 * safely .map/.filter/.find without crashing.
 */
async function getList<T>(path: string): Promise<T[]> {
  const data = await request<unknown>(path, { method: 'GET' })
  return Array.isArray(data) ? (data as T[]) : []
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' })
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Login/signup are handled by Cognito directly (see cognito.ts).
// This just fetches the current user's profile from the backend if needed.

export interface MeResponse {
  user: {
    id: string
    email: string
    name: string
    role: 'admin' | 'team'
    groups: string[]
    /** admin/team = full access, viewer = read-only (registered, not yet on a team) */
    accessLevel: 'admin' | 'team' | 'viewer'
  }
}

export const authApi = {
  me: () => get<MeResponse>('/auth/me'),
}

// ─── Registered (Cognito) users ────────────────────────────────────────────────

export interface RegisteredUser {
  username: string
  email: string
  name: string
  phone: string
  status: string
  enabled: boolean
}

export const usersApi = {
  /** List self-registered Cognito users (admin only). */
  registered: () => getList<RegisteredUser>('/users/registered'),
}

// ─── Shoots ──────────────────────────────────────────────────────────────────

import type { Shoot } from './types'

export const shootsApi = {
  list: ()               => getList<Shoot>('/shoots'),
  get:  (id: string)     => get<Shoot>(`/shoots/${id}`),
  create: (data: Partial<Shoot>) => post<Shoot>('/shoots', data),
  update: (id: string, data: Partial<Shoot>) => patch<Shoot>(`/shoots/${id}`, data),
  remove: (id: string)   => del<{ success: boolean }>(`/shoots/${id}`),
}

// ─── Crew ─────────────────────────────────────────────────────────────────────

import type { CrewMember } from './types'

export const crewApi = {
  list: ()                          => getList<CrewMember>('/crew'),
  create: (data: Partial<CrewMember>) => post<CrewMember>('/crew', data),
  update: (id: string, data: Partial<CrewMember>) => patch<CrewMember>(`/crew/${id}`, data),
  remove: (id: string)              => del<{ success: boolean }>(`/crew/${id}`),
}

// ─── Equipment ────────────────────────────────────────────────────────────────

export interface Equipment {
  id: string
  name: string
  type: string
  owner: string
  status: string
}

export const equipmentApi = {
  list: ()                              => getList<Equipment>('/equipment'),
  create: (data: Partial<Equipment>)    => post<Equipment>('/equipment', data),
  update: (id: string, data: Partial<Equipment>) => patch<Equipment>(`/equipment/${id}`, data),
  remove: (id: string)                  => del<{ success: boolean }>(`/equipment/${id}`),
}

// ─── SD Cards ─────────────────────────────────────────────────────────────────

import type { SDCard } from './types'

export const sdCardsApi = {
  list: ()                           => getList<SDCard>('/sdcards'),
  get:  (id: string)                 => get<SDCard>(`/sdcards/${id}`),
  create: (data: Partial<SDCard>)    => post<SDCard>('/sdcards', data),
  update: (id: string, data: Partial<SDCard>) => patch<SDCard>(`/sdcards/${id}`, data),
  remove: (id: string)               => del<{ success: boolean }>(`/sdcards/${id}`),
}

// ─── Hard Drives ──────────────────────────────────────────────────────────────

import type { HardDrive } from './types'

export const hardDrivesApi = {
  list: ()                               => getList<HardDrive>('/harddrives'),
  get:  (id: string)                     => get<HardDrive>(`/harddrives/${id}`),
  create: (data: Partial<HardDrive>)     => post<HardDrive>('/harddrives', data),
  update: (id: string, data: Partial<HardDrive>) => patch<HardDrive>(`/harddrives/${id}`, data),
  remove: (id: string)                   => del<{ success: boolean }>(`/harddrives/${id}`),
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  title: string
  description: string
  assignedTo: string
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  dueDate: string
  type: 'Sorting' | 'Editing' | 'Data Copy' | 'Delivery' | 'General'
  status: 'Pending' | 'In Progress' | 'Completed'
}

export const tasksApi = {
  list: ()                         => getList<Task>('/tasks'),
  create: (data: Partial<Task>)    => post<Task>('/tasks', data),
  update: (id: string, data: Partial<Task>) => patch<Task>(`/tasks/${id}`, data),
  remove: (id: string)             => del<{ success: boolean }>(`/tasks/${id}`),
}

// ─── Activity ─────────────────────────────────────────────────────────────────

import type { Activity } from './types'

export const activityApi = {
  list: (shootId?: string) =>
    getList<Activity>(shootId ? `/activity?shootId=${shootId}` : '/activity'),
  log: (text: string, shoot?: string, shootId?: string) =>
    post<Activity>('/activity', { text, shoot, shootId }),
}

// ─── Notifications ────────────────────────────────────────────────────────────

import type { Notification } from './types'

export const notificationsApi = {
  list: ()               => getList<Notification>('/notifications'),
  create: (data: { title: string; detail?: string; time?: string }) =>
    post<Notification>('/notifications', data),
  markRead: (id: string) => patch<Notification>(`/notifications/${id}`, { read: true }),
  markAllRead: ()        => patch<{ updated: number }>('/notifications/mark-all-read', {}),
  remove: (id: string)   => del<{ success: boolean }>(`/notifications/${id}`),
}
