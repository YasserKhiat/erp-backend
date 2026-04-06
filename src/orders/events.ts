import { Order } from '@prisma/client';

export interface OrderCreatedEvent {
  order: Order & {
    items: Array<{
      menuItemId: string;
      quantity: number;
    }>;
  };
}
