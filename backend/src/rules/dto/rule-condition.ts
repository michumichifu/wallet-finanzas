/**
 * Estructura de un predicado de regla. Pensada para evaluación simple en
 * memoria sobre un Record entrante. Operadores soportados:
 *   - contains: substring (default no-case-sensitive)
 *   - notContains
 *   - equals
 *   - startsWith
 *   - endsWith
 *   - gt / gte / lt / lte (sobre amount absoluto)
 *
 * Múltiples condiciones se combinan con `combinator` (AND por default).
 */
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
  setPayee?: string
}

export interface RecordCandidate {
  id?: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  amount: number
  currencyCode: string
  note: string | null
  payee: string | null
  accountId: string
  paymentType: string
  categoryId: string | null
}

export function evaluateRule(condition: RuleCondition, record: RecordCandidate): boolean {
  const combinator = condition.combinator ?? 'AND'
  const items = condition.items ?? []
  if (items.length === 0) return false

  const evalItem = (it: RuleConditionItem): boolean => {
    const fieldValue = (record as unknown as Record<string, unknown>)[it.field]
    if (fieldValue === null || fieldValue === undefined) return false

    if (it.field === 'amount') {
      const num = Math.abs(Number(fieldValue))
      const target = Number(it.value)
      if (!Number.isFinite(num) || !Number.isFinite(target)) return false
      switch (it.operator) {
        case 'equals': return num === target
        case 'gt': return num > target
        case 'gte': return num >= target
        case 'lt': return num < target
        case 'lte': return num <= target
        default: return false
      }
    }

    const haystack = String(fieldValue)
    const needle = String(it.value)
    const cs = it.caseSensitive ?? false
    const hs = cs ? haystack : haystack.toLowerCase()
    const nd = cs ? needle : needle.toLowerCase()
    switch (it.operator) {
      case 'contains': return hs.includes(nd)
      case 'notContains': return !hs.includes(nd)
      case 'equals': return hs === nd
      case 'startsWith': return hs.startsWith(nd)
      case 'endsWith': return hs.endsWith(nd)
      default: return false
    }
  }

  return combinator === 'AND' ? items.every(evalItem) : items.some(evalItem)
}
