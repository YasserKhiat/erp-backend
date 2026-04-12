export interface OrderCreatedEvent {
  order: {
    id: string;
    orderNumber: number;
    customerId?: string;
    orderType: string;
    status: string;
    loyaltyDiscount: number;
    total: number;
    items: Array<{
      menuItemId: string;
      menuItemName: string;
      unitPrice: number;
      lineTotal: number;
      quantity: number;
    }>;
  };
}

export interface OrderValidatedEvent {
  order: {
    id: string;
    total: number;
    items: Array<{
      menuItemId: string;
      quantity: number;
    }>;
  };
}

export interface OrderConfirmedEvent {
  order: {
    id: string;
    orderNumber: number;
    customerId?: string;
    orderType: string;
    status: string;
    loyaltyDiscount: number;
    total: number;
    items: Array<{
      menuItemId: string;
      menuItemName: string;
      unitPrice: number;
      lineTotal: number;
      quantity: number;
    }>;
  };
}

export interface OrderCompletedEvent {
  order: {
    id: string;
    total: number;
    customerId: string;
    orderNumber: number;
  };
}

export interface OrderCancelledEvent {
  order: {
    id: string;
    orderNumber: number;
    customerId?: string;
  };
}

export interface StockUpdatedEvent {
  ingredientId: string;
  orderId: string;
  currentStock: number;
}

export interface StockLowEvent {
  ingredientId: string;
}

export interface PaymentCompletedEvent {
  payment: {
    id: string;
    orderId: string;
    orderNumber: number;
    customerId?: string;
    amount: number;
    paidTotal: number;
    orderTotal: number;
    isFullyPaid: boolean;
    method: string;
    userId?: string;
  };
}

export interface ReservationCreatedEvent {
  reservation: {
    id: string;
    userId?: string;
    tableId: string;
    guestCount: number;
    startAt: string;
    endAt: string;
  };
}

export interface LoyaltyUpdatedEvent {
  loyalty: {
    orderId: string;
    orderNumber: number;
    userId: string;
    amount: number;
  };
}
