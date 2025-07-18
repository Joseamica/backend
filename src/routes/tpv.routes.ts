import express from 'express'
import { validateRequest } from '../middlewares/validation'
import {
  venueIdParamSchema,
  serialNumberParamSchema,
  orderParamsSchema,
  paymentsQuerySchema,
  shiftQuerySchema,
  shiftsQuerySchema,
  shiftsSummaryQuerySchema,
} from '../schemas/tpv.schema'
import * as venueController from '../controllers/tpv/venue.tpv.controller'
import * as orderController from '../controllers/tpv/order.tpv.controller'
import * as paymentController from '../controllers/tpv/payment.tpv.controller'
import * as shiftController from '../controllers/tpv/shift.tpv.controller'
import * as authController from '../controllers/tpv/auth.tpv.controller'

const router = express.Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     VenueIdResponse:
 *       type: object
 *       properties:
 *         venueId:
 *           type: string
 *           format: cuid
 *           description: The ID of the venue
 *       required:
 *         - venueId
 *
 *     VenueTPVResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         type:
 *           type: string
 *           enum: [RESTAURANT, BAR, CAFE, FOOD_TRUCK, OTHER]
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         staff:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               staff:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   pin:
 *                     type: string
 *                     nullable: true
 */

/**
 * @openapi
 * /tpv/venues/{venueId}:
 *   get:
 *     tags:
 *       - TPV - Venues
 *     summary: Get venue details for TPV
 *     description: Retrieve venue information including staff details for TPV usage
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the venue
 *     responses:
 *       200:
 *         description: Venue details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VenueTPVResponse'
 *       404:
 *         description: Venue not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Venue with ID {venueId} not found"
 *       500:
 *         description: Internal server error
 */
router.get('/venues/:venueId', venueController.getVenueById)

/**
 * @openapi
 * /tpv/serial-number/{serialNumber}:
 *   get:
 *     tags:
 *       - TPV - Venues
 *     summary: Get venue ID from terminal serial number
 *     description: Retrieve the venue ID associated with a terminal serial number
 *     parameters:
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the terminal
 *     responses:
 *       200:
 *         description: Venue ID retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VenueIdResponse'
 *       404:
 *         description: Terminal not found or no venue associated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     terminal_not_found:
 *                       value: "Terminal not found"
 *                     venue_not_found:
 *                       value: "VenueId not found"
 *       500:
 *         description: Internal server error
 */
router.get('/serial-number/:serialNumber', validateRequest(serialNumberParamSchema), venueController.getVenueIdFromSerialNumber)

/**
 * @openapi
 * /tpv/venues/{venueId}/orders:
 *   get:
 *     tags:
 *       - TPV - Orders
 *     summary: Get all open orders for a venue
 *     description: Retrieve all open orders (orders with pending or partial payment status) for a specific venue
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the venue
 *     responses:
 *       200:
 *         description: List of open orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: cuid
 *                   orderNumber:
 *                     type: string
 *                   total:
 *                     type: number
 *                     format: decimal
 *                   paymentStatus:
 *                     type: string
 *                     enum: [PENDING, PARTIAL]
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         quantity:
 *                           type: integer
 *                         unitPrice:
 *                           type: number
 *                         product:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             price:
 *                               type: number
 *                   payments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         tipAmount:
 *                           type: number
 *                         method:
 *                           type: string
 *                   createdBy:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *       404:
 *         description: Venue not found
 *       500:
 *         description: Internal server error
 */
router.get('/venues/:venueId/orders', validateRequest(venueIdParamSchema), orderController.getOrders)

/**
 * @openapi
 * /tpv/venues/{venueId}/orders/{orderId}:
 *   get:
 *     tags:
 *       - TPV - Orders
 *     summary: Get a specific order by ID
 *     description: Retrieve detailed information about a specific order including payment calculations
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the venue
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the order
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: cuid
 *                 orderNumber:
 *                   type: string
 *                 total:
 *                   type: number
 *                   format: decimal
 *                 paymentStatus:
 *                   type: string
 *                   enum: [PENDING, PARTIAL]
 *                 amount_left:
 *                   type: number
 *                   description: Amount remaining to be paid
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       unitPrice:
 *                         type: number
 *                       total:
 *                         type: number
 *                       product:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *                       paymentAllocations:
 *                         type: array
 *                         items:
 *                           type: object
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       tipAmount:
 *                         type: number
 *                       method:
 *                         type: string
 *                       status:
 *                         type: string
 *                       allocations:
 *                         type: array
 *                         items:
 *                           type: object
 *                 createdBy:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                 servedBy:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Order not found"
 *       500:
 *         description: Internal server error
 */
router.get('/venues/:venueId/orders/:orderId', validateRequest(orderParamsSchema), orderController.getOrder)

/**
 * @openapi
 * /tpv/venues/{venueId}/payments:
 *   get:
 *     tags:
 *       - TPV - Payments
 *     summary: Get payments for a venue
 *     description: Retrieve payments with pagination and filtering options
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the venue
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromDate:
 *                 type: string
 *                 format: date-time
 *                 description: Filter payments from this date
 *               toDate:
 *                 type: string
 *                 format: date-time
 *                 description: Filter payments to this date
 *               waiterId:
 *                 type: string
 *                 description: Filter payments by staff member ID
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       tipAmount:
 *                         type: number
 *                       method:
 *                         type: string
 *                       status:
 *                         type: string
 *                       processedBy:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       order:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           orderNumber:
 *                             type: string
 *                           total:
 *                             type: number
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       400:
 *         description: Invalid pagination parameters or filters
 *       500:
 *         description: Internal server error
 */
router.get('/venues/:venueId/payments', validateRequest(paymentsQuerySchema), paymentController.getPayments)

/**
 * @openapi
 * /tpv/venues/{venueId}/shift:
 *   get:
 *     tags:
 *       - TPV - Shifts
 *     summary: Get current active shift
 *     description: Retrieve the current active shift for a venue
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the venue
 *       - in: query
 *         name: pos_name
 *         schema:
 *           type: string
 *         description: POS name (optional)
 *     responses:
 *       200:
 *         description: Current shift retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     shift:
 *                       type: null
 *                   description: No active shift found
 *                 - type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     venueId:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/venues/:venueId/shift', validateRequest(shiftQuerySchema), shiftController.getCurrentShift)

/**
 * @openapi
 * /tpv/venues/{venueId}/shifts:
 *   get:
 *     tags:
 *       - TPV - Shifts
 *     summary: Get shifts with pagination
 *     description: Retrieve shifts with pagination and filtering options
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the venue
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: waiterId
 *         schema:
 *           type: string
 *         description: Filter by staff member ID
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter shifts from this date
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter shifts to this date
 *     responses:
 *       200:
 *         description: Shifts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       venueId:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       tipsSum:
 *                         type: number
 *                       paymentSum:
 *                         type: number
 *                       avgTipPercentage:
 *                         type: number
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid pagination parameters
 *       500:
 *         description: Internal server error
 */
router.get('/venues/:venueId/shifts', validateRequest(shiftsQuerySchema), shiftController.getShifts)

/**
 * @openapi
 * /tpv/venues/{venueId}/shifts-summary:
 *   get:
 *     tags:
 *       - TPV - Shifts
 *     summary: Get shift summary with totals
 *     description: Retrieve aggregated shift data with sales, tips, and staff breakdown
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the venue
 *       - in: query
 *         name: waiterId
 *         schema:
 *           type: string
 *         description: Filter by staff member ID
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter shifts from this date
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter shifts to this date
 *     responses:
 *       200:
 *         description: Shift summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startTime:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         endTime:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSales:
 *                           type: number
 *                         totalTips:
 *                           type: number
 *                         ordersCount:
 *                           type: integer
 *                         averageTipPercentage:
 *                           type: number
 *                         ratingsCount:
 *                           type: integer
 *                     waiterTips:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           waiterId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           count:
 *                             type: integer
 *       400:
 *         description: Invalid date filters
 *       500:
 *         description: Internal server error
 */
router.get('/venues/:venueId/shifts-summary', validateRequest(shiftsSummaryQuerySchema), shiftController.getShiftsSummary)

/**
 * @openapi
 * /tpv/venues/{venueId}/auth:
 *   post:
 *     tags:
 *       - TPV Auth
 *     summary: Staff sign-in using PIN
 *     description: Authenticate staff member using PIN for TPV access
 *     parameters:
 *       - in: path
 *         name: venueId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: The ID of the venue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pin:
 *                 type: string
 *                 description: Staff PIN (4-6 digits)
 *                 example: "1234"
 *             required:
 *               - pin
 *     responses:
 *       200:
 *         description: Staff signed in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: cuid
 *                 staffId:
 *                   type: string
 *                   format: cuid
 *                 venueId:
 *                   type: string
 *                   format: cuid
 *                 role:
 *                   type: string
 *                   enum: [ADMIN, MANAGER, WAITER, CASHIER, KITCHEN]
 *                 permissions:
 *                   type: object
 *                   nullable: true
 *                 totalSales:
 *                   type: number
 *                   format: decimal
 *                 totalTips:
 *                   type: number
 *                   format: decimal
 *                 averageRating:
 *                   type: number
 *                   format: decimal
 *                 totalOrders:
 *                   type: integer
 *                 staff:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: cuid
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                     employeeCode:
 *                       type: string
 *                       nullable: true
 *                     photoUrl:
 *                       type: string
 *                       nullable: true
 *                     active:
 *                       type: boolean
 *                 venue:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: cuid
 *                     name:
 *                       type: string
 *       400:
 *         description: Bad request - Missing PIN or venue ID
 *       404:
 *         description: Staff member not found or not authorized for this venue
 *       500:
 *         description: Internal server error
 */
router.post('/venues/:venueId/auth', authController.staffSignIn)

export default router
