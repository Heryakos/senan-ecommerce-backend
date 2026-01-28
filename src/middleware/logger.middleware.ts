/**
 * Request Logging Middleware
 */

import type { Request, Response, NextFunction } from "express"

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  res.on("finish", () => {
    const duration = Date.now() - start
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get("user-agent"),
    }

    const statusColor =
      res.statusCode >= 500
        ? "\x1b[31m"
        : // Red for 5xx
          res.statusCode >= 400
          ? "\x1b[33m"
          : // Yellow for 4xx
            "\x1b[32m" // Green for 2xx/3xx

    console.log(`${statusColor}${log.method}\x1b[0m ${log.path} - ${log.status} - ${log.duration}`)
  })

  next()
}
