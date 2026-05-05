import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const tenantSlug = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'luis'

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': tenantSlug,
  },
  withCredentials: true,
})

export interface AccountListItem {
  id: string
  name: string
  type: string
  currencyCode: string
  color: string | null
  iconKey: string | null
  excludeFromTotals: boolean
  isArchived: boolean
  position: number
  balance: string
  balanceUsd: number | null
}

export interface DashboardSummary {
  from: string
  to: string
  totals: {
    incomeUsd: number
    expenseUsd: number
    netUsd: number
    transactionCount: number
  }
  previousPeriod: {
    incomeUsd: number
    expenseUsd: number
    netUsd: number
  }
}

export interface CategoryBreakdownItem {
  categoryId: string | null
  slug: string | null
  name: string
  parentSlug: string | null
  totalUsd: number
  transactionCount: number
}

export interface RecordListItem {
  id: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  amount: string
  currencyCode: string
  amountUsd: number | null
  occurredAt: string
  note: string | null
  payee: string | null
  paymentType: string
  isTransfer: boolean
  account: { id: string; name: string; currencyCode: string }
  category: { id: string; name: string; slug: string } | null
}

export const Api = {
  health: () => api.get<{ status: string; db: string; uptime: number }>('/health').then((r) => r.data),
  listAccounts: () => api.get<AccountListItem[]>('/accounts').then((r) => r.data),
  dashboardSummary: (from: string, to: string) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: { from, to } }).then((r) => r.data),
  dashboardByCategory: (from: string, to: string, type: 'EXPENSE' | 'INCOME' = 'EXPENSE') =>
    api
      .get<CategoryBreakdownItem[]>('/dashboard/by-category', { params: { from, to, type } })
      .then((r) => r.data),
  listRecords: (params: {
    from?: string
    to?: string
    page?: number
    pageSize?: number
    accountId?: string
    type?: string
    search?: string
  }) =>
    api
      .get<{ items: RecordListItem[]; total: number; page: number; pageSize: number }>('/records', { params })
      .then((r) => r.data),
}
