export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  CLIENT: 'CLIENT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  BILLED: 'BILLED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderType = {
  DINE_IN: 'DINE_IN',
  TAKEAWAY: 'TAKEAWAY',
  DELIVERY: 'DELIVERY',
} as const;

export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const StockMovementType = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export type StockMovementType =
  (typeof StockMovementType)[keyof typeof StockMovementType];

export const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
} as const;

export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const SupplierOrderStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export type SupplierOrderStatus =
  (typeof SupplierOrderStatus)[keyof typeof SupplierOrderStatus];

export const ReservationStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SEATED: 'SEATED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type ReservationStatus =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const LoyaltyTransactionType = {
  EARN_ORDER: 'EARN_ORDER',
  BONUS_MILESTONE: 'BONUS_MILESTONE',
  REDEEM_REWARD: 'REDEEM_REWARD',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
} as const;

export type LoyaltyTransactionType =
  (typeof LoyaltyTransactionType)[keyof typeof LoyaltyTransactionType];

export const ExpenseCategory = {
  FIXED: 'FIXED',
  VARIABLE: 'VARIABLE',
} as const;

export type ExpenseCategory =
  (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const EmploymentStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  TERMINATED: 'TERMINATED',
} as const;

export type EmploymentStatus =
  (typeof EmploymentStatus)[keyof typeof EmploymentStatus];

export const ContractType = {
  CDI: 'CDI',
  CDD: 'CDD',
  FREELANCE: 'FREELANCE',
  INTERNSHIP: 'INTERNSHIP',
} as const;

export type ContractType = (typeof ContractType)[keyof typeof ContractType];

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  ABSENT: 'ABSENT',
} as const;

export type AttendanceStatus =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const AbsenceStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type AbsenceStatus = (typeof AbsenceStatus)[keyof typeof AbsenceStatus];

export const BankMovementType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
} as const;

export type BankMovementType =
  (typeof BankMovementType)[keyof typeof BankMovementType];
