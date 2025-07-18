import { PaymentMethod, ProductType, TransactionStatus } from '@prisma/client'
import { NotFoundError } from '../../errors/AppError'
import prisma from '../../utils/prismaClient'
import { GeneralStatsResponse, GeneralStatsQuery } from '../../schemas/dashboard/generalStats.schema'

export async function getGeneralStatsData(
  venueId: string,
  filters: GeneralStatsQuery = {}
): Promise<GeneralStatsResponse> {
  // Validate venue exists
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
  })

  if (!venue) {
    throw new NotFoundError(`Venue with ID ${venueId} not found`)
  }

  // Set default date range (last 7 days) if not provided
  const fromDate = filters.fromDate ? new Date(filters.fromDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const toDate = filters.toDate ? new Date(filters.toDate) : new Date()

  // Build where clause for date filtering
  const dateFilter = {
    createdAt: {
      gte: fromDate,
      lte: toDate,
    },
  }

  // Fetch payments data with more flexible filtering
  console.log('DEBUG: Fetching payments with:', {
    venueId,
    dateFilter,
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString()
  })
  
  // First, let's check if there are any payments at all for this venue
  const allPayments = await prisma.payment.findMany({
    where: {
      venueId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  
  console.log('DEBUG: Total payments for venue:', allPayments.length)
  if (allPayments.length > 0) {
    console.log('DEBUG: First payment sample:', {
      id: allPayments[0].id,
      amount: allPayments[0].amount,
      status: allPayments[0].status,
      createdAt: allPayments[0].createdAt
    })
  }
  
  // Try with simplified filtering - remove status filter for now
  const payments = await prisma.payment.findMany({
    where: {
      venueId,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  
  console.log('DEBUG: Filtered payments (no status filter):', payments.length)
  
  // Filter out pending payments in memory instead of in the query
  const validPayments = payments.filter(p => p.status !== TransactionStatus.PENDING)
  console.log('DEBUG: Valid payments (after status filter):', validPayments.length)

  // Fetch reviews/feedback data
  const reviews = await prisma.review.findMany({
    where: {
      venueId,
      ...dateFilter,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Fetch products data from orders
  const orders = await prisma.order.findMany({
    where: {
      venueId,
      ...dateFilter,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  // Process products data
  const productsMap = new Map<string, any>()
  
  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.product) {
        const productKey = `${item.product.id}-${item.product.name}`
        const existing = productsMap.get(productKey)
        
        if (existing) {
          existing.quantity += item.quantity
        } else {
          productsMap.set(productKey, {
            id: item.product.id,
            name: item.product.name,
            type: item.product.type || ProductType.OTHER,
            quantity: item.quantity,
            price: Number(item.product.price),
          })
        }
      }
    })
  })

  const products = Array.from(productsMap.values())

  // Generate extra metrics
  const extraMetrics = await generateExtraMetrics(venueId, fromDate, toDate)

  // Transform data to match legacy format
  const transformedPayments = validPayments.map(payment => ({
    id: payment.id,
    amount: Number(payment.amount),
    method: mapPaymentMethod(payment.method),
    createdAt: payment.createdAt.toISOString(),
    tips: [
      {
        amount: Number(payment.tipAmount),
      },
    ],
  }))

  const transformedFeedbacks = reviews.map(review => ({
    id: review.id,
    stars: review.overallRating,
    createdAt: review.createdAt.toISOString(),
  }))

  const transformedProducts = products.map(product => ({
    id: product.id,
    name: product.name,
    type: product.type,
    quantity: product.quantity,
    price: product.price,
  }))

  return {
    payments: transformedPayments,
    feedbacks: transformedFeedbacks,
    products: transformedProducts,
    extraMetrics,
  }
}

async function generateExtraMetrics(venueId: string, fromDate: Date, toDate: Date) {
  // Fetch table performance data
  const tablePerformance = await generateTablePerformance(venueId, fromDate, toDate)
  
  // Fetch staff performance data
  const staffPerformanceMetrics = await generateStaffPerformance(venueId, fromDate, toDate)
  
  // Fetch product profitability data
  const productProfitability = await generateProductProfitability(venueId, fromDate, toDate)
  
  // Generate peak hours data
  const peakHoursData = await generatePeakHoursData(venueId, fromDate, toDate)
  
  // Generate weekly trends data
  const weeklyTrendsData = await generateWeeklyTrendsData(venueId, fromDate, toDate)
  
  // Generate prep times by category (mock data for now)
  const prepTimesByCategory = {
    entradas: { avg: 8, target: 10 },
    principales: { avg: 12, target: 15 },
    postres: { avg: 4, target: 5 },
    bebidas: { avg: 2, target: 3 },
  }

  return {
    tablePerformance,
    staffPerformanceMetrics,
    productProfitability,
    peakHoursData,
    weeklyTrendsData,
    prepTimesByCategory,
  }
}

async function generateTablePerformance(venueId: string, fromDate: Date, toDate: Date) {
  const orders = await prisma.order.findMany({
    where: {
      venueId,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      table: true,
    },
  })

  const tableStatsMap = new Map<string, any>()

  orders.forEach(order => {
    if (order.table) {
      const tableKey = `${order.table.id}-${order.table.number}`
      const existing = tableStatsMap.get(tableKey)
      
      if (existing) {
        existing.totalSales += Number(order.total)
        existing.orderCount += 1
      } else {
        tableStatsMap.set(tableKey, {
          tableId: order.table.id,
          tableNumber: parseInt(order.table.number),
          totalSales: Number(order.total),
          orderCount: 1,
          avgTicket: 0,
          turnoverRate: 0,
          occupancyRate: 0,
        })
      }
    }
  })

  return Array.from(tableStatsMap.values()).map(table => ({
    ...table,
    avgTicket: table.orderCount > 0 ? table.totalSales / table.orderCount : 0,
    turnoverRate: table.orderCount * 0.8, // Mock calculation
    occupancyRate: Math.min(table.orderCount * 10, 100), // Mock calculation
    rotationRate: table.orderCount * 0.5 || 0, // Mock calculation for rotation rate
    totalRevenue: table.totalSales || 0, // Ensure totalRevenue is available
  }))
}

async function generateStaffPerformance(venueId: string, fromDate: Date, toDate: Date) {
  const orders = await prisma.order.findMany({
    where: {
      venueId,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      servedBy: {
        include: {
          venues: {
            where: {
              venueId: venueId,
            },
          },
        },
      },
    },
  })

  const staffStatsMap = new Map<string, any>()

  orders.forEach(order => {
    if (order.servedBy) {
      const staffKey = order.servedBy.id
      const existing = staffStatsMap.get(staffKey)
      
      if (existing) {
        existing.totalSales += Number(order.total)
        existing.orderCount += 1
      } else {
        staffStatsMap.set(staffKey, {
          staffId: order.servedBy.id,
          name: `${order.servedBy.firstName} ${order.servedBy.lastName}`,
          role: order.servedBy.venues[0]?.role || 'WAITER',
          totalSales: Number(order.total),
          totalTips: 0, // Will be calculated from tips
          orderCount: 1,
          avgPrepTime: 0,
        })
      }
    }
  })

  return Array.from(staffStatsMap.values()).map(staff => ({
    ...staff,
    avgPrepTime: Math.floor(Math.random() * 10) + 5 || 0, // Mock data, ensure never undefined
  }))
}

async function generateProductProfitability(venueId: string, fromDate: Date, toDate: Date) {
  const orders = await prisma.order.findMany({
    where: {
      venueId,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  const productStatsMap = new Map<string, any>()

  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.product) {
        const productKey = item.product.id
        const existing = productStatsMap.get(productKey)
        
        const itemRevenue = item.quantity * Number(item.unitPrice)
        const estimatedCost = Number(item.unitPrice) * 0.3 // Mock 30% cost ratio
        
        if (existing) {
          existing.quantity += item.quantity
          existing.totalRevenue += itemRevenue
          existing.totalCost += estimatedCost * item.quantity
        } else {
          productStatsMap.set(productKey, {
            name: item.product.name,
            type: item.product.type || ProductType.OTHER,
            price: Number(item.product.price),
            quantity: item.quantity,
            totalRevenue: itemRevenue,
            totalCost: estimatedCost * item.quantity,
          })
        }
      }
    })
  })

  return Array.from(productStatsMap.values()).map(product => {
    const margin = product.totalRevenue - product.totalCost
    const marginPercentage = product.totalRevenue > 0 ? (margin / product.totalRevenue) * 100 : 0
    
    return {
      ...product,
      cost: product.quantity > 0 ? product.totalCost / product.quantity : 0,
      margin: product.quantity > 0 ? margin / product.quantity : 0,
      marginPercentage: marginPercentage || 0, // Ensure never undefined
    }
  })
}

async function generatePeakHoursData(venueId: string, fromDate: Date, toDate: Date) {
  const orders = await prisma.order.findMany({
    where: {
      venueId,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
  })

  const hourlyData = new Map<number, { sales: number; transactions: number }>()

  orders.forEach(order => {
    const hour = order.createdAt.getHours()
    const existing = hourlyData.get(hour)
    
    if (existing) {
      existing.sales += Number(order.total)
      existing.transactions += 1
    } else {
      hourlyData.set(hour, {
        sales: Number(order.total),
        transactions: 1,
      })
    }
  })

  return Array.from(hourlyData.entries()).map(([hour, data]) => ({
    hour,
    sales: data.sales,
    transactions: data.transactions,
  }))
}

async function generateWeeklyTrendsData(venueId: string, fromDate: Date, toDate: Date) {
  // Mock data for weekly trends
  const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  
  return weekdays.map(day => ({
    day,
    currentWeek: Math.floor(Math.random() * 1000) + 500,
    previousWeek: Math.floor(Math.random() * 1000) + 400,
    changePercentage: Math.floor(Math.random() * 40) - 20,
  }))
}

function mapPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.CASH:
      return 'CASH'
    case PaymentMethod.CREDIT_CARD:
    case PaymentMethod.DEBIT_CARD:
      return 'CARD'
    case PaymentMethod.DIGITAL_WALLET:
      return 'OTHER'
    default:
      return 'OTHER'
  }
}
