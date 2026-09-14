import { useState } from 'react'
import { Button, Text, Tooltip } from '@fluentui/react-components'
import { BoxRegular, CartRegular, HomeRegular, SignOutRegular } from '@fluentui/react-icons'

import { AdminApi } from '../services/api'
import type { AuthSession } from '../types'
import { formatPhone } from '../lib/format'
import { OverviewPage } from './OverviewPage'
import { OrdersPage } from './OrdersPage'
import { ProductsPage } from './ProductsPage'

type Page = 'overview' | 'products' | 'orders'

type AdminShellProps = {
  api: AdminApi
  session: AuthSession
  onLogout: () => void
}

const navigation: Array<{ id: Page; label: string; icon: typeof HomeRegular }> = [
  { id: 'overview', label: 'Обзор', icon: HomeRegular },
  { id: 'products', label: 'Товары', icon: BoxRegular },
  { id: 'orders', label: 'Заказы', icon: CartRegular },
]

export function AdminShell({ api, session, onLogout }: AdminShellProps) {
  const [page, setPage] = useState<Page>('overview')

  async function logout() {
    await api.logout()
    onLogout()
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark brand-mark-small" aria-hidden="true">S</div>
          <div>
            <Text weight="semibold" size={500}>SABR</Text>
            <Text block size={200} className="sidebar-caption">Управление</Text>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Основная навигация">
          {navigation.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${page === item.id ? 'nav-item-active' : ''}`}
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => setPage(item.id)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-user">
          <div>
            <Text block size={200} className="sidebar-caption">Администратор</Text>
            <Text weight="semibold">{formatPhone(session.user.phone)}</Text>
          </div>
          <Tooltip content="Выйти" relationship="label">
            <Button appearance="subtle" icon={<SignOutRegular />} onClick={logout} />
          </Tooltip>
        </div>
      </aside>

      <div className="workspace">
        <header className="mobile-header">
          <Text weight="semibold" size={500}>SABR Управление</Text>
          <Button appearance="subtle" icon={<SignOutRegular />} onClick={logout}>Выйти</Button>
        </header>
        <nav className="mobile-nav" aria-label="Навигация для мобильных устройств">
          {navigation.map(item => (
            <Button key={item.id} appearance={page === item.id ? 'primary' : 'subtle'} onClick={() => setPage(item.id)}>
              {item.label}
            </Button>
          ))}
        </nav>
        {page === 'overview' && <OverviewPage api={api} onNavigate={setPage} />}
        {page === 'products' && <ProductsPage api={api} />}
        {page === 'orders' && <OrdersPage api={api} />}
      </div>
    </div>
  )
}
