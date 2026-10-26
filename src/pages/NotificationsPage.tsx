import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { notificationsApi } from '../api'
import { useAuth } from '../auth'
import { AppLayout, PageHeader, Pagination, usePagination } from '../components'
import type { Notification } from '../types'

function BellIcon() {
  return <span>!</span>
}

export function NotificationsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'admin'

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationsApi.list()
      .then(setNotifications)
      .finally(() => setLoading(false))
  }, [])

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    try {
      await notificationsApi.markRead(id)
    } catch {}
  }

  const remove = async (id: string) => {
    const prev = notifications
    setNotifications(p => p.filter(n => n.id !== id))
    try {
      await notificationsApi.remove(id)
    } catch (err: any) {
      setNotifications(prev) // revert on failure
      alert(`Delete failed: ${err.message}`)
    }
  }

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(notifications, 10)

  return (
    <AppLayout>
      <PageHeader title="Notifications" subtitle="Stay on top of production updates" />
      <section className="card notification-list">
        {loading && <p style={{ padding: 16, color: '#888', fontSize: 13 }}>Loading notifications...</p>}

        {!loading && notifications.length === 0 && (
          <p style={{ padding: 16, color: '#888', fontSize: 13 }}>No notifications yet.</p>
        )}

        {pageItems.map(n => (
          <div
            className={n.read ? 'notification read' : 'notification'}
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            style={{ cursor: n.read ? 'default' : 'pointer' }}
          >
            <span className="notification-icon">
              <BellIcon />
            </span>
            <div className="grow">
              <strong>{n.title}</strong>
              <span>{n.detail}</span>
              <small>{n.time}</small>
            </div>
            {!n.read && <span className="unread" />}
            {isSuperAdmin && (
              <button
                type="button"
                className="icon-btn delete-btn"
                title="Delete notification"
                onClick={e => { e.stopPropagation(); remove(n.id) }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
      </section>
    </AppLayout>
  )
}
