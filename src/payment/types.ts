/**
 * Payment provider interface (strategy pattern).
 * Initiate -> store transaction reference -> verify via webhook or poll.
 */

export interface InitiateResult {
  transactionId: string
  status: "PENDING" | "PAID" | "FAILED"
  redirectUrl?: string
}

export interface VerifyResult {
  success: boolean
  status: string
}

export interface IPaymentProvider {
  initiate(params: { orderId: string; amount: number; returnUrl?: string; cancelUrl?: string }): Promise<InitiateResult>
  verify(transactionId: string, rawBody?: unknown): Promise<VerifyResult>
}
