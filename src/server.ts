/**
 * Senan E-Commerce Backend Server
 * Production-ready Express API with clean architecture
 *
 * Features:
 * - Role-based authentication & authorization
 * - RESTful API design
 * - Request validation
 * - Error handling
 * - Rate limiting
 * - CORS configuration
 * - Security headers
 * - Request logging
 */

import express, { type Application, type Request, type Response } from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Import routes
import authRoutes from "./routes/auth.routes"
import productRoutes from "./routes/product.routes"
import orderRoutes from "./routes/order.routes"
import userRoutes from "./routes/user.routes"
import categoryRoutes from "./routes/category.routes"
import paymentRoutes from "./routes/payment.routes"
import notificationRoutes from "./routes/notification.routes"
import settingRoutes from "./routes/setting.routes"
import dashboardRoutes from "./routes/dashboard.routes"
import inventoryRoutes from "./routes/inventory.routes"

// Import middleware
import { errorHandler } from "./middleware/error.middleware"
import { requestLogger } from "./middleware/logger.middleware"

const app: Application = express()
const PORT = process.env.PORT || 5000

// ================================
// MIDDLEWARE
// ================================

// Security headers
app.use(helmet())

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      process.env.PRODUCTION_URL || "https://e-commerce-senan.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Compression
app.use(compression())

// Body parsers
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api/", limiter)

// Request logging
app.use(requestLogger)

// ================================
// ROUTES
// ================================

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/users", userRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/settings", settingRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/inventory", inventoryRoutes)

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  })
})

// Global error handler
app.use(errorHandler)

// ================================
// SERVER STARTUP
// ================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Senan E-Commerce Backend Server                     ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || "development"}                              ║
║   Port: ${PORT}                                         ║
║   API: http://localhost:${PORT}/api                      ║
║   Health: http://localhost:${PORT}/health                ║
║                                                           ║
║   Database: SQL Server 2022                              ║
║   ORM: Prisma                                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server")
  process.exit(0)
})

export default app
