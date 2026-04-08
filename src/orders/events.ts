export interface OrderCreatedEvent {
  order: {
    id: string;
    total: number;
    items: Array<{
      menuItemId: string;
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

export interface OrderCompletedEvent {
  order: {
    id: string;
    total: number;
    customerId: string;
    orderNumber: number;
  };
}
