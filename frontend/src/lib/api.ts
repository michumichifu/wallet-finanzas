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

export interface CategoryNode {
  id: string
  slug: string
  name: string
  kind: 'EXPENSE' | 'INCOME' | 'BOTH' | 'TRANSFER' | 'SYSTEM'
  color: string | null
  iconKey: string | null
  position: number
  children: CategoryNode[]
}

export interface CreateRecordPayload {
  type: 'EXPENSE' | 'INCOME'
  accountId: string
  categoryId?: string
  amount: number
  currencyCode: string
  paymentType?: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'TRANSFER' | 'VOUCHER' | 'MOBILE_PAYMENT' | 'CRYPTO' | 'WEB_PAYMENT' | 'OTHER'
  paymentTypeLabel?: string
  payee?: string
  note?: string
  occurredAt: string
}

export interface CreateTransferPayload {
  fromAccountId: string
  toAccountId: string
  fromAmount: number
  toAmount: number
  occurredAt: string
  note?: string
}

export const Api = {
  health: () => api.get<{ status: string; db: string; uptime: number }>('/health').then((r) => r.data),
  listAccounts: () => api.get<AccountListItem[]>('/accounts').then((r) => r.data),
  createAccount: (payload: { name: string; currencyCode: string; type?: string; initialBalance?: number }) =>
    api.post<AccountListItem>('/accounts', payload).then((r) => r.data),
  patchAccount: (id: string, payload: Partial<{ name: string; currencyCode: string; type: string; isArchived: boolean; excludeFromTotals: boolean }>) =>
    api.patch<AccountListItem>(`/accounts/${id}`, payload).then((r) => r.data),
  fixAccountCurrency: (id: string, currencyCode: string) =>
    api.patch<{ updatedRecords: number }>(`/accounts/${id}/fix-currency`, { currencyCode }).then((r) => r.data),
  archiveAccount: (id: string) => api.delete(`/accounts/${id}`).then((r) => r.data),
  listCategoryTree: () => api.get<CategoryNode[]>('/categories/tree').then((r) => r.data),
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
    categoryId?: string
    type?: string
    search?: string
  }) =>
    api
      .get<{ items: RecordListItem[]; total: number; page: number; pageSize: number }>('/records', { params })
      .then((r) => r.data),
  createRecord: (payload: CreateRecordPayload) => api.post<RecordListItem>('/records', payload).then((r) => r.data),
  createTransfer: (payload: CreateTransferPayload) =>
    api.post<{ transferPairId: string }>('/records/transfer', payload).then((r) => r.data),
  patchRecord: (id: string, payload: Partial<CreateRecordPayload>) =>
    api.patch<RecordListItem>(`/records/${id}`, payload).then((r) => r.data),
  deleteRecord: (id: string) => api.delete<{ deleted: number }>(`/records/${id}`).then((r) => r.data),
}
