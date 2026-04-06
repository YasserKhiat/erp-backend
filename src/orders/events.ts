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
