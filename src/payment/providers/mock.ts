import type { IPaymentProvider, InitiateResult, VerifyResult } from "../types"

/**
 * Mock provider: simulates gateway. initiate returns PENDING; verify marks PAID.
 * Default for CHAPA, TELEBIRR, SANTIM_PAY when real keys not configured.
 */
export const mockProvider: IPaymentProvider = {
  async initiate(): Promise<InitiateResult> {
    await new Promise((r) => setTimeout(r, 300))
    const id = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const success = Math.random() > 0.05
    return {
      transactionId: id,
      status: success ? "PENDING" : "FAILED",
    }
  },

  async verify(transactionId: string): Promise<VerifyResult> {
    await new Promise((r) => setTimeout(r, 200))
    return { success: true, status: "PAID" }
  },
}
