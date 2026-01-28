import type { IPaymentProvider } from "./types"
import { mockProvider } from "./providers/mock"
import { PaymentMethod } from "../constants/roles"

const byMethod: Partial<Record<string, IPaymentProvider>> = {
  [PaymentMethod.CHAPA]: mockProvider,
  [PaymentMethod.TELEBIRR]: mockProvider,
  [PaymentMethod.SANTIM_PAY]: mockProvider,
  // CASH_ON_DELIVERY, BANK_TRANSFER: no provider; handled in controller
}

export function getPaymentProvider(method: string): IPaymentProvider | null {
  return byMethod[method] ?? null
}
