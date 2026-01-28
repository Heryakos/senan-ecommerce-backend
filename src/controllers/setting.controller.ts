/**
 * Settings Controller
 */

import type { Request, Response, NextFunction } from "express"
import { prisma } from "../config/database"
import { ApiError } from "../middleware/error.middleware"
import type { AuthRequest } from "../middleware/auth.middleware"
import { z } from "zod"

const updateSettingsSchema = z.record(z.string(), z.any())

const UI_KEYS = ["ui_theme", "ui_modules", "ui_home_layout", "ui_category_layout"]

function getCategoryForKey(key: string): string {
  if (key === "payment_methods") return "payment"
  if (UI_KEYS.includes(key) || key.startsWith("ui_")) return "ui"
  return "general"
}

export const getAllSettings = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { category } = req.query

    const where = category ? { category: category as string } : {}

    const settings = await prisma.setting.findMany({
      where,
      orderBy: { category: "asc" },
    })

    // Transform to key-value object
    const settingsObj: Record<string, any> = {}
    for (const setting of settings) {
      try {
        settingsObj[setting.key] =
          setting.type === "json"
            ? JSON.parse(setting.value)
            : setting.type === "number"
              ? Number(setting.value)
              : setting.type === "boolean"
                ? setting.value === "true"
                : setting.value
      } catch {
        settingsObj[setting.key] = setting.value
      }
    }

    res.json({
      success: true,
      data: settingsObj,
    })
  } catch (error) {
    _next(error)
  }
}

export const getSettingByKey = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { key } = req.params

    const setting = await prisma.setting.findUnique({
      where: { key },
    })

    if (!setting) {
      throw new ApiError("Setting not found", 404)
    }

    let value: any = setting.value
    try {
      if (setting.type === "json") {
        value = JSON.parse(setting.value)
      } else if (setting.type === "number") {
        value = Number(setting.value)
      } else if (setting.type === "boolean") {
        value = setting.value === "true"
      }
    } catch {
      // Keep as string if parsing fails
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        value,
        type: setting.type,
        category: setting.category,
      },
    })
  } catch (error) {
    _next(error)
  }
}

/** Public: UI config for theming/layout. No auth. */
export const getUISettings = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { category: "ui" },
    })
    const obj: Record<string, unknown> = {}
    for (const s of settings) {
      try {
        obj[s.key] = s.type === "json" ? JSON.parse(s.value) : s.type === "number" ? Number(s.value) : s.type === "boolean" ? s.value === "true" : s.value
      } catch {
        obj[s.key] = s.value
      }
    }
    // Defaults per design system
    res.json({
      success: true,
      data: {
        ui_theme: obj.ui_theme ?? { primary: "#03A688", accent: "#F2EDD5" },
        ui_modules: obj.ui_modules ?? [],
        ui_home_layout: obj.ui_home_layout ?? {},
        ui_category_layout: obj.ui_category_layout ?? "chips",
      },
    })
  } catch (error) {
    _next(error)
  }
}

export const updateSettings = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const validated = updateSettingsSchema.parse(req.body)

    const updates = Object.entries(validated).map(async ([key, value]) => {
      let stringValue: string
      let type = "string"

      if (typeof value === "object") {
        stringValue = JSON.stringify(value)
        type = "json"
      } else if (typeof value === "number") {
        stringValue = value.toString()
        type = "number"
      } else if (typeof value === "boolean") {
        stringValue = value.toString()
        type = "boolean"
      } else {
        stringValue = String(value)
      }

      return prisma.setting.upsert({
        where: { key },
        update: { value: stringValue, type },
        create: {
          key,
          value: stringValue,
          type,
          category: "general",
        },
      })
    })

    await Promise.all(updates)

    res.json({
      success: true,
      message: "Settings updated successfully",
    })
  } catch (error) {
    _next(error)
  }
}
