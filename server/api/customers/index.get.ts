import { desc, sql, eq, count, sum, max } from 'drizzle-orm'
import { orders, orderItems } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.search as string || '').trim().toLowerCase()

  const rows = await db
    .select({
      email: orders.email,
      firstName: sql<string>`(array_agg(${orders.firstName} ORDER BY ${orders.createdAt} DESC))[1]`,
      lastName: sql<string>`(array_agg(${orders.lastName} ORDER BY ${orders.createdAt} DESC))[1]`,
      orderCount: count(orders.id),
      paidOrderCount: sql<number>`count(*) filter (where ${orders.status} = 'paid')`.mapWith(Number),
      totalSpentCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} = 'paid'), 0)`.mapWith(Number),
      lastOrderAt: max(orders.createdAt),
      firstOrderAt: sql<string>`min(${orders.createdAt})`
    })
    .from(orders)
    .groupBy(orders.email)
    .orderBy(desc(max(orders.createdAt)))

  if (!search) return rows

  return rows.filter(r =>
    r.email.toLowerCase().includes(search)
    || r.firstName.toLowerCase().includes(search)
    || r.lastName.toLowerCase().includes(search)
    || `${r.firstName} ${r.lastName}`.toLowerCase().includes(search)
  )
})
