import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { NotificationsRealtimeService } from '../src/notifications/notifications-realtime.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';

const request = require('supertest');

process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN ??= '1d';

jest.setTimeout(30_000);

describe('ERP critical flows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now().toString();
  const clientEmail = `e2e.client.${runId}@example.com`;
  const otherClientEmail = `e2e.other.${runId}@example.com`;
  const managerEmail = `e2e.manager.${runId}@example.com`;
  const plainPassword = 'Client123!';

  let clientToken = '';
  let otherClientToken = '';
  let managerToken = '';
  let clientUserId = '';
  let tableId = '';
  let menuItemId = '';
  let orderId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    const category = await prisma.category.create({
      data: {
        name: `E2E Category ${runId}`,
      },
    });

    const ingredient = await prisma.ingredient.create({
      data: {
        name: `E2E Ingredient ${runId}`,
        unit: 'g',
        minStockLevel: 1,
      },
    });

    await prisma.inventory.create({
      data: {
        ingredientId: ingredient.id,
        currentStock: 1000,
      },
    });

    const menuItem = await prisma.menuItem.create({
      data: {
        name: `E2E Menu Item ${runId}`,
        description: 'E2E test item',
        price: 25,
        categoryId: category.id,
        isAvailable: true,
      },
    });

    await prisma.menuItemIngredient.create({
      data: {
        menuItemId: menuItem.id,
        ingredientId: ingredient.id,
        quantityNeeded: 1,
      },
    });

    const table = await prisma.diningTable.create({
      data: {
        code: `E2E-${runId}`,
        seats: 4,
      },
    });

    tableId = table.id;
    menuItemId = menuItem.id;

    const managerHash = await bcrypt.hash(plainPassword, 10);
    await prisma.user.create({
      data: {
        email: managerEmail,
        fullName: 'E2E Manager',
        passwordHash: managerHash,
        role: 'MANAGER',
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });
  const payload = <T>(body: any): T => (body?.data ?? body) as T;

  it('registers a client', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: clientEmail,
        fullName: 'E2E Client',
        password: plainPassword,
      })
      .expect(201);

    const data = payload<{ accessToken: string }>(response.body);
    expect(data.accessToken).toBeDefined();
  });

  it('logs in client and manager and rejects invalid login', async () => {
    const clientLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: clientEmail, password: plainPassword })
      .expect(200);

    const clientPayload = payload<{ accessToken: string; user: { id: string } }>(clientLogin.body);
    clientToken = clientPayload.accessToken;
    clientUserId = clientPayload.user.id;

    const managerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: managerEmail, password: plainPassword })
      .expect(200);

    managerToken = payload<{ accessToken: string }>(managerLogin.body).accessToken;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherClientEmail,
        fullName: 'Other Client',
        password: plainPassword,
      })
      .expect(201);

    const otherClientLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherClientEmail, password: plainPassword })
      .expect(200);

    otherClientToken = payload<{ accessToken: string }>(otherClientLogin.body).accessToken;

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: clientEmail, password: 'WrongPassword123!' })
      .expect(401);
  });

  it('runs cart -> order -> status flow', async () => {
    await request(app.getHttpServer())
      .post('/orders/cart/items')
      .set(authHeader(clientToken))
      .send({ menuItemId, quantity: 2 })
      .expect(201);

    const placeOrder = await request(app.getHttpServer())
      .post('/orders')
      .set(authHeader(clientToken))
      .send({ orderType: 'DINE_IN', tableId, applyLoyaltyAuto: false })
      .expect(201);

    orderId = payload<{ id: string }>(placeOrder.body).id;

    const setPreparing = await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set(authHeader(managerToken))
      .send({ status: 'PREPARING' })
      .expect(200);

    expect(payload<{ status: string }>(setPreparing.body).status).toBe('PREPARING');
  });

  it('creates valid payment and blocks duplicate/overpay', async () => {
    const order = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set(authHeader(clientToken))
      .expect(200);

    const total = Number(payload<{ total: number }>(order.body).total);

    const firstPaymentAmount = Math.max(1, Math.round((total / 2) * 100) / 100);

    const validPayment = await request(app.getHttpServer())
      .post('/payments')
      .set(authHeader(managerToken))
      .send({
        orderId,
        amount: firstPaymentAmount,
        method: 'CARD',
        transactionRef: `E2E-TRX-${runId}`,
      })
      .expect(201);

    expect(payload<{ payment: { id: string } }>(validPayment.body).payment.id).toBeDefined();

    await request(app.getHttpServer())
      .post('/payments')
      .set(authHeader(managerToken))
      .send({
        orderId,
        amount: 1,
        method: 'CARD',
        transactionRef: `E2E-TRX-${runId}`,
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/payments')
      .set(authHeader(managerToken))
      .send({
        orderId,
        amount: total,
        method: 'CASH',
      })
      .expect(409);
  });

  it('creates reservation, blocks conflict, and allows cancel', async () => {
    const startAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

    const created = await request(app.getHttpServer())
      .post('/reservations')
      .set(authHeader(clientToken))
      .send({
        tableId,
        guestCount: 2,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      })
      .expect(201);

    const reservationId = payload<{ id: string }>(created.body).id;

    await request(app.getHttpServer())
      .post('/reservations')
      .set(authHeader(otherClientToken))
      .send({
        tableId,
        guestCount: 2,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      })
      .expect(409);

    const cancelled = await request(app.getHttpServer())
      .patch(`/reservations/${reservationId}/cancel`)
      .set(authHeader(clientToken))
      .send()
      .expect(200);

    expect(payload<{ status: string }>(cancelled.body).status).toBe('CANCELLED');
  });

  it('enforces ownership on order and payment reads', async () => {
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set(authHeader(otherClientToken))
      .expect(403);

    await request(app.getHttpServer())
      .get(`/payments/order/${orderId}`)
      .set(authHeader(otherClientToken))
      .expect(403);
  });

  it('returns invoice details and invoice PDF for order owner', async () => {
    const invoice = await request(app.getHttpServer())
      .get(`/orders/${orderId}/invoice`)
      .set(authHeader(clientToken))
      .expect(200);

    const invoicePayload = payload<{ orderId: string; totals: { total: number } }>(invoice.body);
    expect(invoicePayload.orderId).toBe(orderId);
    expect(invoicePayload.totals.total).toBeGreaterThan(0);

    const invoicePdf = await request(app.getHttpServer())
      .get(`/orders/${orderId}/invoice/pdf`)
      .set(authHeader(clientToken))
      .expect(200);

    expect(invoicePdf.headers['content-type']).toContain('application/pdf');
    const pdfLength = Buffer.isBuffer(invoicePdf.body)
      ? invoicePdf.body.length
      : Buffer.from(invoicePdf.text ?? '').length;
    expect(pdfLength).toBeGreaterThan(100);
  });

  it('delivers realtime notification payload on user stream', async () => {
    const realtime = app.get(NotificationsRealtimeService);
    const notifications = app.get(NotificationsService);
    const received: string[] = [];

    const subscription = realtime.streamForUser(clientUserId).subscribe((event) => {
      if (event.type) {
        received.push(event.type as string);
      }
    });

    await notifications.notifyUser(clientUserId, {
      type: 'SYSTEM',
      title: 'E2E realtime',
      message: 'Realtime event test',
      priority: 'INFO',
      actionUrl: '/notifications/me',
      metadata: { source: 'e2e' },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    subscription.unsubscribe();

    expect(received).toContain('notification');
  });
});

describe('Auth throttling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('limits repeated failed login attempts', async () => {
    const statuses: number[] = [];

    for (let i = 0; i < 12; i += 1) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `unknown-${Date.now()}-${i}@example.com`,
          password: 'InvalidPass123!',
        });
      statuses.push(response.statusCode);
    }

    expect(statuses.some((status) => status === 429)).toBe(true);
  });
});
