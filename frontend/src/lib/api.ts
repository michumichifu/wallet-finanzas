import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

let refreshing: Promise<string | null> | null = null

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean } | undefined
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    // Evita loop si la propia request es /auth/refresh.
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      useAuthStore.getState().clear()
      return Promise.reject(error)
    }
    original._retry = true
    if (!refreshing) {
      refreshing = (async () => {
        const rt = useAuthStore.getState().refreshToken
        if (!rt) {
          useAuthStore.getState().clear()
          return null
        }
        try {
          const resp = await axios.post(
            `${baseURL}/auth/refresh`,
            { refreshToken: rt },
            { timeout: 10000 },
          )
          const data = resp.data as {
            accessToken: string
            refreshToken: string
            user: AuthUserDto
            defaultTenant: { id: string; slug: string; name: string }
          }
          useAuthStore.getState().setSession({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
            tenant: data.defaultTenant,
          })
          return data.accessToken
        } catch {
          useAuthStore.getState().clear()
          return null
        } finally {
          refreshing = null
        }
      })()
    }
    const newToken = await refreshing
    if (!newToken) return Promise.reject(error)
    if (original.headers) original.headers.Authorization = `Bearer ${newToken}`
    return api.request(original)
  },
)

interface AuthUserDto {
  id: string
  email: string
  displayName: string | null
  role: 'SUPERADMIN' | 'TENANT_OWNER' | 'TENANT_MEMBER'
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUserDto
  defaultTenant: { id: string; slug: string; name: string } | null
}

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

export type CategoryKind = 'EXPENSE' | 'INCOME' | 'BOTH' | 'TRANSFER' | 'SYSTEM'

export interface CategoryNode {
  id: string
  slug: string
  name: string
  kind: CategoryKind
  color: string | null
  iconKey: string | null
  position: number
  children: CategoryNode[]
}

export interface CategoryFlat {
  id: string
  tenantId: string
  slug: string
  name: string
  kind: CategoryKind
  parentId: string | null
  color: string | null
  iconKey: string | null
  position: number
  isSystem: boolean
  isArchived: boolean
}

export interface TransferPairView {
  id: string
  occurredAt: string
  appliedRate: string | null
  rateSource: string | null
  notes: string | null
  from: TransferLeg
  to: TransferLeg
}

export interface TransferLeg {
  recordId: string
  account: { id: string; name: string; currencyCode: string }
  amount: string
  amountUsd: number | null
  note: string | null
}

export interface RuleConditionItem {
  field: 'note' | 'payee' | 'amount' | 'currencyCode' | 'accountId' | 'paymentType'
  operator: 'contains' | 'notContains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte'
  value: string | number
  caseSensitive?: boolean
}

export interface RuleCondition {
  combinator?: 'AND' | 'OR'
  items: RuleConditionItem[]
}

export interface RuleAction {
  setCategoryId?: string | null
}

export interface RuleView {
  id: string
  name: string
  condition: RuleCondition
  action: RuleAction
  categoryId: string | null
  isActive: boolean
  priority: number
  createdAt: string
}

export interface TemplateView {
  id: string
  name: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  amount: number
  currencyCode: string
  accountId: string
  categoryId: string | null
  payee: string | null
  note: string | null
  createdAt: string
}

export interface CreateRecordPayload {
  type: 'EXPENSE' | 'INCOME'
  accountId: string
  categoryId?: string
  amount: number
  currencyCode: string
  paymentType?: string
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

  // Auth
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (payload: { email: string; password: string; displayName?: string; tenantSlug?: string }) =>
    api.post<AuthResponse>('/auth/register', payload).then((r) => r.data),
  me: () =>
    api.get<{ user: AuthUserDto; tenant: { id: string; slug: string; name: string }; tenants: { id: string; slug: string; name: string }[] }>('/auth/me').then((r) => r.data),

  // Accounts
  listAccounts: () => api.get<AccountListItem[]>('/accounts').then((r) => r.data),
  createAccount: (payload: { name: string; currencyCode: string; type?: string; initialBalance?: number }) =>
    api.post<AccountListItem>('/accounts', payload).then((r) => r.data),
  patchAccount: (id: string, payload: Partial<{ name: string; currencyCode: string; type: string; isArchived: boolean; excludeFromTotals: boolean }>) =>
    api.patch<AccountListItem>(`/accounts/${id}`, payload).then((r) => r.data),
  fixAccountCurrency: (id: string, currencyCode: string) =>
    api.patch<{ updatedRecords: number }>(`/accounts/${id}/fix-currency`, { currencyCode }).then((r) => r.data),
  archiveAccount: (id: string) => api.delete(`/accounts/${id}`).then((r) => r.data),

  // Categories
  listCategoryTree: () => api.get<CategoryNode[]>('/categories/tree').then((r) => r.data),
  listCategoriesFlat: () => api.get<CategoryFlat[]>('/categories').then((r) => r.data),
  createCategory: (payload: { name: string; slug?: string; kind?: CategoryKind; parentId?: string; color?: string; iconKey?: string; position?: number }) =>
    api.post<CategoryFlat>('/categories', payload).then((r) => r.data),
  patchCategory: (id: string, payload: Partial<{ name: string; slug: string; kind: CategoryKind; parentId: string | null; color: string; iconKey: string; position: number; isArchived: boolean }>) =>
    api.patch<CategoryFlat>(`/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete<{ archived: boolean; deleted: boolean }>(`/categories/${id}`).then((r) => r.data),

  // Transfers
  listTransfers: (params: { from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<{ items: TransferPairView[]; total: number; page: number; pageSize: number }>('/transfers', { params }).then((r) => r.data),

  // Export
  exportWalletCsv: async (params: { from?: string; to?: string }) => {
    const r = await api.get<Blob>('/export/wallet-csv', { params, responseType: 'blob' })
    return r.data as unknown as Blob
  },
  exportWalletXls: async (params: { from?: string; to?: string }) => {
    const r = await api.get<Blob>('/export/wallet-xls', { params, responseType: 'blob' })
    return r.data as unknown as Blob
  },

  // Rules (auto-categorize)
  listRules: () => api.get<RuleView[]>('/rules').then((r) => r.data),
  createRule: (payload: { name: string; condition: RuleCondition; action: RuleAction; isActive?: boolean; priority?: number }) =>
    api.post<RuleView>('/rules', payload).then((r) => r.data),
  patchRule: (id: string, payload: Partial<{ name: string; condition: RuleCondition; action: RuleAction; isActive: boolean; priority: number }>) =>
    api.patch<RuleView>(`/rules/${id}`, payload).then((r) => r.data),
  deleteRule: (id: string) => api.delete<{ deleted: true }>(`/rules/${id}`).then((r) => r.data),
  applyAllRules: (overwriteAll = false) =>
    api.post<{ scanned: number; updated: number }>(`/rules/apply-all`, undefined, { params: { overwriteAll } }).then((r) => r.data),

  // Templates
  listTemplates: () => api.get<TemplateView[]>('/templates').then((r) => r.data),
  createTemplate: (payload: { name: string; type: 'EXPENSE' | 'INCOME'; accountId: string; categoryId?: string; amount: number; currencyCode: string; payee?: string; note?: string }) =>
    api.post<TemplateView>('/templates', payload).then((r) => r.data),
  deleteTemplate: (id: string) => api.delete<{ deleted: boolean }>(`/templates/${id}`).then((r) => r.data),
  applyTemplate: (id: string) => api.post<{ id: string }>(`/templates/${id}/apply`).then((r) => r.data),

  // Dashboard
  dashboardSummary: (from: string, to: string) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: { from, to } }).then((r) => r.data),
  dashboardByCategory: (from: string, to: string, type: 'EXPENSE' | 'INCOME' = 'EXPENSE') =>
    api.get<CategoryBreakdownItem[]>('/dashboard/by-category', { params: { from, to, type } }).then((r) => r.data),

  // Records
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
    api.get<{ items: RecordListItem[]; total: number; page: number; pageSize: number }>('/records', { params }).then((r) => r.data),
  getRecord: (id: string) => api.get<RecordListItem>(`/records/${id}`).then((r) => r.data),
  createRecord: (payload: CreateRecordPayload) => api.post<RecordListItem>('/records', payload).then((r) => r.data),
  createTransfer: (payload: CreateTransferPayload) =>
    api.post<{ transferPairId: string }>('/records/transfer', payload).then((r) => r.data),
  patchRecord: (id: string, payload: Partial<CreateRecordPayload>) =>
    api.patch<RecordListItem>(`/records/${id}`, payload).then((r) => r.data),
  deleteRecord: (id: string) => api.delete<{ deleted: number }>(`/records/${id}`).then((r) => r.data),
}
