import bcrypt from 'bcrypt';
import {
  ExpenseCategory,
  LoyaltyTransactionType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser({ email, fullName, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role,
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      fullName,
      role,
      passwordHash,
      isActive: true,
    },
  });
}

async function upsertCategory(name) {
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

function foodImage(tag, lock) {
  return `https://loremflickr.com/960/720/${encodeURIComponent(tag)}?lock=${lock}`;
}

async function upsertMenuItem({
  name,
  description,
  price,
  categoryId,
  imageUrl,
  vegetarian,
  halal,
  glutenFree,
}) {
  const existing = await prisma.menuItem.findFirst({
    where: { name, categoryId },
    select: { id: true },
  });

  if (!existing) {
    return prisma.menuItem.create({
      data: {
        name,
        description,
        price,
        categoryId,
        imageUrl,
        isAvailable: true,
        vegetarian: vegetarian ?? false,
        halal: halal ?? false,
        glutenFree: glutenFree ?? false,
      },
    });
  }

  return prisma.menuItem.update({
    where: { id: existing.id },
    data: {
      description,
      price,
      imageUrl,
      isAvailable: true,
      vegetarian: vegetarian ?? false,
      halal: halal ?? false,
      glutenFree: glutenFree ?? false,
    },
  });
}

async function setRecipe(menuItemId, lines) {
  await prisma.menuItemIngredient.deleteMany({ where: { menuItemId } });

  if (!lines.length) {
    return;
  }

  await prisma.menuItemIngredient.createMany({
    data: lines.map((line) => ({
      menuItemId,
      ingredientId: line.ingredientId,
      quantityNeeded: line.quantityNeeded,
    })),
  });
}

async function upsertFormulaBundle({ name, description, price, isAvailable, items }) {
  const existing = await prisma.formulaBundle.findUnique({
    where: { name },
    select: { id: true },
  });

  const bundle = existing
    ? await prisma.formulaBundle.update({
        where: { id: existing.id },
        data: {
          description,
          price,
          isAvailable,
        },
      })
    : await prisma.formulaBundle.create({
        data: {
          name,
          description,
          price,
          isAvailable,
        },
      });

  await prisma.formulaBundleItem.deleteMany({ where: { bundleId: bundle.id } });

  if (items.length) {
    await prisma.formulaBundleItem.createMany({
      data: items.map((item) => ({
        bundleId: bundle.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
    });
  }

  return bundle;
}

async function seedClientProfile(clientId, menuItems) {
  await prisma.clientAddress.deleteMany({ where: { userId: clientId } });

  await prisma.clientAddress.createMany({
    data: [
      {
        userId: clientId,
        label: 'Home',
        addressLine: 'Rue Hassan II, Apt 4',
        city: 'Casablanca',
        postalCode: '20000',
        isDefault: true,
      },
      {
        userId: clientId,
        label: 'Office',
        addressLine: 'Bd Zerktouni, Tower B',
        city: 'Casablanca',
        postalCode: '20100',
        isDefault: false,
      },
    ],
  });

  await prisma.clientPreference.upsert({
    where: { userId: clientId },
    update: {
      dietaryRestrictions: 'Halal only',
      allergens: 'Peanuts',
      preferredDeliveryNotes: 'Call upon arrival',
      marketingOptIn: true,
    },
    create: {
      userId: clientId,
      dietaryRestrictions: 'Halal only',
      allergens: 'Peanuts',
      preferredDeliveryNotes: 'Call upon arrival',
      marketingOptIn: true,
    },
  });

  await prisma.favoriteMenuItem.deleteMany({ where: { userId: clientId } });

  const topPicks = menuItems.slice(0, 2);
  if (topPicks.length) {
    await prisma.favoriteMenuItem.createMany({
      data: topPicks.map((item) => ({
        userId: clientId,
        menuItemId: item.id,
      })),
    });
  }
}

async function seedReservations(clientId) {
  if (!clientId) {
    return;
  }

  await prisma.reservation.deleteMany({});

  const table = await prisma.diningTable.findFirst({
    where: { code: 'T03' },
    select: { id: true },
  });

  if (!table) {
    return;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);
  const end = new Date(tomorrow);
  end.setHours(21, 0, 0, 0);

  await prisma.reservation.create({
    data: {
      userId: clientId,
      tableId: table.id,
      guestCount: 4,
      startAt: tomorrow,
      endAt: end,
      status: 'CONFIRMED',
      notes: 'Seeded reservation for validation',
    },
  });
}

async function seedReviewsAndLoyalty(clientId, menuItemId) {
  if (!clientId || !menuItemId) {
    return;
  }

  let order = await prisma.order.findFirst({
    where: {
      customerId: clientId,
      notes: 'Seeded completed order for review flow',
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    const subtotal = 8.9;
    const tax = 0.89;
    const total = 9.79;

    order = await prisma.order.create({
      data: {
        customerId: clientId,
        status: OrderStatus.COMPLETED,
        orderType: OrderType.TAKEAWAY,
        notes: 'Seeded completed order for review flow',
        subtotal,
        tax,
        total,
        items: {
          create: {
            menuItemId,
            quantity: 1,
            unitPrice: subtotal,
            totalPrice: subtotal,
          },
        },
      },
      include: {
        items: true,
      },
    });
  }

  const targetItem = order.items.find((item) => item.menuItemId === menuItemId);
  if (!targetItem) {
    return;
  }

  await prisma.review.upsert({
    where: {
      userId_orderItemId: {
        userId: clientId,
        orderItemId: targetItem.id,
      },
    },
    update: {
      rating: 5,
      comment: 'Seeded review for loyalty and ratings demo.',
      orderId: order.id,
      menuItemId,
    },
    create: {
      userId: clientId,
      orderId: order.id,
      orderItemId: targetItem.id,
      menuItemId,
      rating: 5,
      comment: 'Seeded review for loyalty and ratings demo.',
    },
  });

  const account = await prisma.loyaltyAccount.upsert({
    where: { userId: clientId },
    update: {
      points: 140,
      lifetimePoints: 170,
      completedOrders: 5,
    },
    create: {
      userId: clientId,
      points: 140,
      lifetimePoints: 170,
      completedOrders: 5,
    },
  });

  await prisma.loyaltyTransaction.createMany({
    data: [
      {
        accountId: account.id,
        userId: clientId,
        orderId: order.id,
        type: LoyaltyTransactionType.EARN_ORDER,
        pointsDelta: 10,
        balanceAfter: 120,
        reason: 'Seed: points from completed order',
        referenceKey: `seed:earn:${order.id}`,
      },
      {
        accountId: account.id,
        userId: clientId,
        orderId: order.id,
        type: LoyaltyTransactionType.BONUS_MILESTONE,
        pointsDelta: 20,
        balanceAfter: 140,
        reason: 'Seed: milestone bonus',
        referenceKey: `seed:bonus:${order.id}`,
      },
    ],
    skipDuplicates: true,
  });
}

async function seedPaymentsAndFinance(clientId, managerId, menuItemId) {
  if (!clientId || !managerId || !menuItemId) {
    return;
  }

  let order = await prisma.order.findFirst({
    where: {
      customerId: clientId,
      notes: 'Seeded billed order for payments flow',
    },
  });

  if (!order) {
    const subtotal = 24.5;
    const tax = 2.45;
    const total = 26.95;

    order = await prisma.order.create({
      data: {
        customerId: clientId,
        employeeId: managerId,
        status: OrderStatus.COMPLETED,
        orderType: OrderType.DINE_IN,
        notes: 'Seeded billed order for payments flow',
        subtotal,
        tax,
        total,
        billNumber: 'BILL-SEED-PAYMENT-001',
        billedAt: new Date(),
        items: {
          create: {
            menuItemId,
            quantity: 2,
            unitPrice: 12.25,
            totalPrice: subtotal,
          },
        },
      },
    });
  }

  await prisma.payment.deleteMany({
    where: {
      orderId: order.id,
      transactionRef: {
        startsWith: 'SEEDPAY-',
      },
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        orderId: order.id,
        userId: managerId,
        amount: 10,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        transactionRef: 'SEEDPAY-CASH-001',
      },
      {
        orderId: order.id,
        userId: managerId,
        amount: 8.95,
        method: PaymentMethod.CARD,
        status: PaymentStatus.PAID,
        transactionRef: 'SEEDPAY-CARD-001',
      },
      {
        orderId: order.id,
        userId: managerId,
        amount: 8,
        method: PaymentMethod.TRANSFER,
        status: PaymentStatus.PAID,
        transactionRef: 'SEEDPAY-TRANSFER-001',
      },
    ],
  });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  await prisma.expense.deleteMany({
    where: {
      title: {
        startsWith: 'Seed Expense',
      },
    },
  });

  await prisma.expense.createMany({
    data: [
      {
        title: 'Seed Expense Rent',
        category: ExpenseCategory.FIXED,
        amount: 1200,
        expenseDate: startOfDay,
        paidById: managerId,
        notes: 'Seed fixed charge',
      },
      {
        title: 'Seed Expense Electricity',
        category: ExpenseCategory.FIXED,
        amount: 320,
        expenseDate: startOfDay,
        paidById: managerId,
        notes: 'Seed fixed charge',
      },
      {
        title: 'Seed Expense Packaging',
        category: ExpenseCategory.VARIABLE,
        amount: 140,
        expenseDate: startOfDay,
        paidById: managerId,
        notes: 'Seed variable charge',
      },
    ],
  });

  await prisma.cashClosing.upsert({
    where: {
      closedDate: startOfDay,
    },
    update: {
      expectedCash: 10,
      actualCash: 9.5,
      discrepancy: -0.5,
      totalRevenue: 26.95,
      totalPayments: 3,
      closedById: managerId,
      notes: 'Seed daily closing with discrepancy',
    },
    create: {
      closedDate: startOfDay,
      expectedCash: 10,
      actualCash: 9.5,
      discrepancy: -0.5,
      totalRevenue: 26.95,
      totalPayments: 3,
      closedById: managerId,
      notes: 'Seed daily closing with discrepancy',
    },
  });
}

async function upsertTable({ code, seats, assignedWaiterId }) {
  return prisma.diningTable.upsert({
    where: { code },
    update: {
      seats,
      assignedWaiterId,
    },
    create: {
      code,
      seats,
      assignedWaiterId,
    },
  });
}

async function upsertSupplier({ name, email, phone, address }) {
  return prisma.supplier.upsert({
    where: { name },
    update: {
      email,
      phone,
      address,
      isActive: true,
    },
    create: {
      name,
      email,
      phone,
      address,
      isActive: true,
    },
  });
}

async function upsertIngredient({
  name,
  unit,
  minStockLevel,
  currentStock,
  defaultSupplierId,
}) {
  return prisma.ingredient.upsert({
    where: { name },
    update: {
      unit,
      minStockLevel,
      defaultSupplierId,
      inventory: {
        upsert: {
          create: { currentStock },
          update: { currentStock },
        },
      },
    },
    create: {
      name,
      unit,
      minStockLevel,
      defaultSupplierId,
      inventory: {
        create: { currentStock },
      },
    },
  });
}

async function upsertSupplierCatalogItem({
  supplierId,
  ingredientId,
  supplierSku,
  unit,
  leadTimeDays,
  unitPrice,
}) {
  return prisma.supplierCatalogItem.upsert({
    where: {
      supplierId_ingredientId: {
        supplierId,
        ingredientId,
      },
    },
    update: {
      supplierSku,
      unit,
      leadTimeDays,
      unitPrice,
      isActive: true,
    },
    create: {
      supplierId,
      ingredientId,
      supplierSku,
      unit,
      leadTimeDays,
      unitPrice,
      isActive: true,
    },
  });
}

async function upsertEmployeeProfile({
  userId,
  fullName,
  email,
  phone,
  position,
  hireDate,
  baseSalary,
  contractType,
}) {
  const existing = await prisma.employee.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    return prisma.employee.update({
      where: { id: existing.id },
      data: {
        fullName,
        email,
        phone,
        position,
        hireDate,
        baseSalary,
        contractType,
        employmentStatus: 'ACTIVE',
      },
    });
  }

  return prisma.employee.create({
    data: {
      userId,
      fullName,
      email,
      phone,
      position,
      hireDate,
      baseSalary,
      contractType,
      employmentStatus: 'ACTIVE',
    },
  });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function recipeForMenuItem(item, ingredientIds) {
  const cat = (item.category?.name ?? '').toLowerCase();
  const name = item.name.toLowerCase();

  const pick = (key, qty) => {
    const id = ingredientIds[key];
    return id ? { ingredientId: id, quantityNeeded: qty } : null;
  };

  if (cat.includes('burger')) {
    if (name.includes('veggie')) {
      return [pick('Veggie Patty', '1'), pick('Burger Bun', '1')].filter(Boolean);
    }
    if (name.includes('chicken')) {
      return [pick('Chicken Breast', '0.25'), pick('Burger Bun', '1')].filter(Boolean);
    }
    return [pick('Beef Patty', '1'), pick('Burger Bun', '1')].filter(Boolean);
  }

  if (cat.includes('pizza')) {
    const lines = [pick('Pizza Dough', '1'), pick('Tomato Sauce', '0.15'), pick('Mozzarella', '0.2')].filter(Boolean);
    if (name.includes('pepperoni') || name.includes('meat')) {
      const extra = pick('Pepperoni Turkey', '0.12');
      if (extra) lines.push(extra);
    }
    if (name.includes('chicken')) {
      const extra = pick('Chicken Breast', '0.2');
      if (extra) lines.push(extra);
    }
    return lines;
  }

  if (cat.includes('pasta')) {
    const lines = [pick('Pasta', '0.18')].filter(Boolean);
    if (name.includes('alfredo')) {
      const milk = pick('Milk', '0.15');
      const parm = pick('Parmesan', '0.05');
      if (milk) lines.push(milk);
      if (parm) lines.push(parm);
    } else {
      const sauce = pick('Tomato Sauce', '0.12');
      if (sauce) lines.push(sauce);
    }
    if (name.includes('seafood')) {
      const shrimp = pick('Shrimp', '0.12');
      if (shrimp) lines.push(shrimp);
    }
    return lines;
  }

  if (cat.includes('dessert')) {
    const lines = [pick('Flour', '0.10'), pick('Sugar', '0.06'), pick('Butter', '0.04')].filter(Boolean);
    if (name.includes('brownie') || name.includes('chocolate')) {
      const cocoa = pick('Cocoa Powder', '0.03');
      if (cocoa) lines.push(cocoa);
    }
    if (name.includes('apple')) {
      const apple = pick('Apple', '0.18');
      if (apple) lines.push(apple);
    }
    return lines;
  }

  if (cat.includes('drink')) {
    if (name.includes('orange')) {
      return [pick('Orange', '0.25')].filter(Boolean);
    }
    if (name.includes('lemon') || name.includes('mint')) {
      return [pick('Lemon', '0.20'), pick('Mint', '0.01')].filter(Boolean);
    }
    if (name.includes('strawberry')) {
      return [pick('Strawberry', '0.22'), pick('Milk', '0.12')].filter(Boolean);
    }
    if (name.includes('mango')) {
      return [pick('Mango', '0.22'), pick('Milk', '0.12')].filter(Boolean);
    }
    if (name.includes('coffee') || name.includes('americano')) {
      return [pick('Coffee Beans', '0.02')].filter(Boolean);
    }
    return [pick('Lemon', '0.10')].filter(Boolean);
  }

  if (cat.includes('starter') || name.includes('salad')) {
    if (name.includes('calamari')) {
      return [pick('Squid', '0.20')].filter(Boolean);
    }
    if (name.includes('bruschetta')) {
      return [pick('Bread', '0.2'), pick('Tomato', '0.12')].filter(Boolean);
    }
    return [pick('Lettuce', '0.10'), pick('Tomato', '0.08')].filter(Boolean);
  }

  return [pick('Flour', '0.05')].filter(Boolean);
}

async function seedPersonnelAndReconciliation({ manager, employee }) {
  if (!manager || !employee) {
    return;
  }

  const managerProfile = await upsertEmployeeProfile({
    userId: manager.id,
    fullName: manager.fullName,
    email: manager.email,
    phone: manager.phone,
    position: 'Restaurant Manager',
    hireDate: new Date('2024-01-10T09:00:00.000Z'),
    baseSalary: '14000',
    contractType: 'CDI',
  });

  const staffProfile = await upsertEmployeeProfile({
    userId: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    position: 'Kitchen Operator',
    hireDate: new Date('2024-03-05T09:00:00.000Z'),
    baseSalary: '7200',
    contractType: 'CDD',
  });

  const today = startOfDay(new Date());
  const attendanceSeed = [
    { employeeId: managerProfile.id, dayOffset: -4, status: 'PRESENT' },
    { employeeId: managerProfile.id, dayOffset: -3, status: 'PRESENT' },
    { employeeId: managerProfile.id, dayOffset: -2, status: 'LATE' },
    { employeeId: staffProfile.id, dayOffset: -4, status: 'PRESENT' },
    { employeeId: staffProfile.id, dayOffset: -3, status: 'PRESENT' },
    { employeeId: staffProfile.id, dayOffset: -2, status: 'PRESENT' },
  ];

  for (const row of attendanceSeed) {
    const date = new Date(today);
    date.setDate(today.getDate() + row.dayOffset);

    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: row.employeeId,
          date,
        },
      },
      update: {
        status: row.status,
      },
      create: {
        employeeId: row.employeeId,
        date,
        status: row.status,
        checkInAt: new Date(date.getTime() + 9 * 60 * 60 * 1000),
        checkOutAt: new Date(date.getTime() + 17 * 60 * 60 * 1000),
        notes: 'Seed attendance',
      },
    });
  }

  await prisma.absence.deleteMany({ where: { reason: 'Seed approved leave day' } });
  const leaveDate = new Date(today);
  leaveDate.setDate(today.getDate() - 1);
  await prisma.absence.create({
    data: {
      employeeId: staffProfile.id,
      date: leaveDate,
      reason: 'Seed approved leave day',
      status: 'APPROVED',
    },
  });

  const periodStart = new Date(today);
  periodStart.setDate(1);
  const periodEnd = endOfDay(today);

  await prisma.payrollRecord.upsert({
    where: {
      employeeId_periodStart_periodEnd: {
        employeeId: managerProfile.id,
        periodStart,
        periodEnd,
      },
    },
    update: {
      grossSalary: '14000',
      cnssDeduction: '630',
      taxDeduction: '1100',
      otherDeduction: '0',
      netSalary: '12270',
      notes: 'Seed payroll manager',
    },
    create: {
      employeeId: managerProfile.id,
      periodStart,
      periodEnd,
      grossSalary: '14000',
      cnssDeduction: '630',
      taxDeduction: '1100',
      otherDeduction: '0',
      netSalary: '12270',
      notes: 'Seed payroll manager',
    },
  });

  await prisma.payrollRecord.upsert({
    where: {
      employeeId_periodStart_periodEnd: {
        employeeId: staffProfile.id,
        periodStart,
        periodEnd,
      },
    },
    update: {
      grossSalary: '7200',
      cnssDeduction: '324',
      taxDeduction: '350',
      otherDeduction: '0',
      netSalary: '6526',
      notes: 'Seed payroll staff',
    },
    create: {
      employeeId: staffProfile.id,
      periodStart,
      periodEnd,
      grossSalary: '7200',
      cnssDeduction: '324',
      taxDeduction: '350',
      otherDeduction: '0',
      netSalary: '6526',
      notes: 'Seed payroll staff',
    },
  });
}

async function seedReconciliationData() {
  const day = startOfDay(new Date());
  const dayEnd = endOfDay(day);

  let session = await prisma.reconciliationSession.findFirst({
    where: { periodStart: day, periodEnd: dayEnd },
  });

  if (!session) {
    session = await prisma.reconciliationSession.create({
      data: {
        periodStart: day,
        periodEnd: dayEnd,
        expectedTotal: '0',
        bankTotal: '0',
        discrepancy: '0',
        reconciledPayments: 0,
        reconciledClosings: 0,
      },
    });
  }

  const paymentRows = await prisma.payment.findMany({
    where: {
      transactionRef: {
        startsWith: 'SEEDPAY-',
      },
    },
    select: {
      id: true,
      amount: true,
    },
  });

  const paymentTotal = paymentRows.reduce((sum, row) => sum + Number(row.amount), 0);

  await prisma.payment.updateMany({
    where: {
      id: {
        in: paymentRows.map((row) => row.id),
      },
    },
    data: {
      isReconciled: true,
      reconciledAt: new Date(),
      reconciliationSessionId: session.id,
    },
  });

  const cashClosing = await prisma.cashClosing.findFirst({
    where: { closedDate: day },
    select: { id: true },
  });

  if (cashClosing) {
    await prisma.cashClosing.update({
      where: { id: cashClosing.id },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
        reconciliationSessionId: session.id,
      },
    });
  }

  await prisma.bankMovement.deleteMany({
    where: {
      reference: {
        startsWith: 'SEED-BANK-',
      },
    },
  });

  const credit = 26.95;
  const debit = 0.5;

  await prisma.bankMovement.createMany({
    data: [
      {
        movementDate: new Date(day.getTime() + 10 * 60 * 60 * 1000),
        amount: String(credit),
        type: 'CREDIT',
        reference: 'SEED-BANK-CREDIT-001',
        notes: 'Seed credit transfer',
        isReconciled: true,
        reconciledAt: new Date(),
        sessionId: session.id,
      },
      {
        movementDate: new Date(day.getTime() + 15 * 60 * 60 * 1000),
        amount: String(debit),
        type: 'DEBIT',
        reference: 'SEED-BANK-DEBIT-001',
        notes: 'Seed processing fee',
        isReconciled: true,
        reconciledAt: new Date(),
        sessionId: session.id,
      },
    ],
  });

  const bankTotal = credit - debit;

  await prisma.reconciliationSession.update({
    where: { id: session.id },
    data: {
      expectedTotal: String(paymentTotal.toFixed(2)),
      bankTotal: String(bankTotal.toFixed(2)),
      discrepancy: String((paymentTotal - bankTotal).toFixed(2)),
      reconciledPayments: paymentRows.length,
      reconciledClosings: cashClosing ? 1 : 0,
    },
  });
}

async function seedSupplierCatalogAndOrder(supplierId, ingredientMap) {
  const ingredientEntries = Object.entries(ingredientMap);
  const catalog = [];

  for (let i = 0; i < ingredientEntries.length; i += 1) {
    const [name, ingredientId] = ingredientEntries[i];
    const unitPrice = (2 + (i % 6) * 0.65 + (i > 10 ? 0.8 : 0)).toFixed(2);

    const item = await upsertSupplierCatalogItem({
      supplierId,
      ingredientId,
      supplierSku: `FF-${String(i + 1).padStart(3, '0')}`,
      unit: 'unit',
      leadTimeDays: 2 + (i % 3),
      unitPrice,
    });

    catalog.push({ name, id: item.id, ingredientId, unitPrice: Number(unitPrice) });
  }

  await prisma.supplierOrder.deleteMany({
    where: {
      notes: {
        startsWith: 'Seed procurement order',
      },
    },
  });

  const topItems = catalog.slice(0, 6);

  await prisma.supplierOrder.create({
    data: {
      supplierId,
      status: 'RECEIVED',
      notes: 'Seed procurement order for catalog/demo',
      orderedAt: new Date(),
      receivedAt: new Date(),
      totalAmount: String(
        topItems
          .reduce((sum, item, idx) => sum + item.unitPrice * (idx + 2), 0)
          .toFixed(2),
      ),
      items: {
        create: topItems.map((item, idx) => {
          const qty = idx + 2;
          const line = Number((item.unitPrice * qty).toFixed(2));
          return {
            ingredientId: item.ingredientId,
            supplierCatalogItemId: item.id,
            quantity: String(qty),
            unitCost: String(item.unitPrice.toFixed(2)),
            lineTotal: String(line.toFixed(2)),
          };
        }),
      },
    },
  });
}

async function main() {
  console.log('Seeding users by role...');
  await upsertUser({
    email: 'admin@restaurant.local',
    fullName: 'System Admin',
    role: UserRole.ADMIN,
    password: 'Admin123!',
  });
  await upsertUser({
    email: 'manager@restaurant.local',
    fullName: 'Floor Manager',
    role: UserRole.MANAGER,
    password: 'Manager123!',
  });
  await upsertUser({
    email: 'employee@restaurant.local',
    fullName: 'Kitchen Employee',
    role: UserRole.EMPLOYEE,
    password: 'Employee123!',
  });
  await upsertUser({
    email: 'client@restaurant.local',
    fullName: 'Regular Client',
    role: UserRole.CLIENT,
    password: 'Client123!',
  });

  const waiter = await prisma.user.findUnique({
    where: { email: 'employee@restaurant.local' },
  });
  const manager = await prisma.user.findUnique({
    where: { email: 'manager@restaurant.local' },
  });
  const client = await prisma.user.findUnique({
    where: { email: 'client@restaurant.local' },
  });

  console.log('Seeding categories...');
  const starters = await upsertCategory('Starters');
  const burgers = await upsertCategory('Burgers');
  const pizzas = await upsertCategory('Pizzas');
  const pasta = await upsertCategory('Pasta');
  const drinks = await upsertCategory('Drinks');
  const desserts = await upsertCategory('Desserts');

  console.log('Seeding menu items...');
  const classicBurger = await upsertMenuItem({
    name: 'Classic Burger',
    description: 'Beef patty, lettuce, tomato, house sauce',
    price: '8.90',
    categoryId: burgers.id,
    imageUrl: foodImage('classic-burger', 1),
    halal: true,
  });
  const doubleCheese = await upsertMenuItem({
    name: 'Double Cheese Burger',
    description: 'Double beef patty, cheddar, pickles',
    price: '11.50',
    categoryId: burgers.id,
    imageUrl: foodImage('double-cheeseburger', 2),
    halal: true,
  });
  const margherita = await upsertMenuItem({
    name: 'Margherita Pizza',
    description: 'Tomato sauce, mozzarella, basil',
    price: '10.40',
    categoryId: pizzas.id,
    imageUrl: foodImage('margherita-pizza', 3),
    vegetarian: true,
  });
  const pepperoni = await upsertMenuItem({
    name: 'Pepperoni Pizza',
    description: 'Tomato sauce, mozzarella, pepperoni',
    price: '12.20',
    categoryId: pizzas.id,
    imageUrl: foodImage('pepperoni-pizza', 4),
    halal: true,
  });
  const orangeJuice = await upsertMenuItem({
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice',
    price: '3.80',
    categoryId: drinks.id,
    imageUrl: foodImage('orange-juice', 5),
    vegetarian: true,
    halal: true,
    glutenFree: true,
  });
  const brownie = await upsertMenuItem({
    name: 'Chocolate Brownie',
    description: 'Warm brownie with chocolate topping',
    price: '4.60',
    categoryId: desserts.id,
    imageUrl: foodImage('chocolate-brownie', 6),
    vegetarian: true,
  });

  const categoryByName = {
    starters,
    burgers,
    pizzas,
    pasta,
    drinks,
    desserts,
  };

  const additionalMenuItems = [
    {
      category: 'starters',
      name: 'Caesar Salad',
      description: 'Romaine lettuce, parmesan, croutons, creamy Caesar dressing.',
      price: '6.90',
      imageUrl: foodImage('caesar-salad', 11),
    },
    {
      category: 'starters',
      name: 'Crispy Calamari',
      description: 'Lightly breaded calamari rings with lemon and tartar dip.',
      price: '8.50',
      imageUrl: foodImage('crispy-calamari', 12),
    },
    {
      category: 'starters',
      name: 'Bruschetta Trio',
      description: 'Toasted bread topped with tomato, basil, and olive oil.',
      price: '5.80',
      imageUrl: foodImage('bruschetta', 13),
      vegetarian: true,
    },
    {
      category: 'starters',
      name: 'Spicy Chicken Wings',
      description: 'Oven-roasted wings glazed with house spicy sauce.',
      price: '7.90',
      imageUrl: foodImage('chicken-wings', 14),
      halal: true,
    },
    {
      category: 'burgers',
      name: 'BBQ Bacon Burger',
      description: 'Char-grilled beef, smoked bacon, cheddar, and BBQ sauce.',
      price: '12.40',
      imageUrl: foodImage('bbq-burger', 15),
    },
    {
      category: 'burgers',
      name: 'Mushroom Swiss Burger',
      description: 'Beef burger topped with sauteed mushrooms and Swiss cheese.',
      price: '11.90',
      imageUrl: foodImage('mushroom-burger', 16),
      halal: true,
    },
    {
      category: 'burgers',
      name: 'Spicy Chicken Burger',
      description: 'Crispy chicken fillet, jalapeno mayo, and crunchy slaw.',
      price: '10.80',
      imageUrl: foodImage('chicken-burger', 17),
      halal: true,
    },
    {
      category: 'burgers',
      name: 'Veggie Burger',
      description: 'Grilled vegetable patty with avocado spread and greens.',
      price: '9.70',
      imageUrl: foodImage('veggie-burger', 18),
      vegetarian: true,
    },
    {
      category: 'pizzas',
      name: 'Four Cheese Pizza',
      description: 'Mozzarella, cheddar, gorgonzola, and parmesan on tomato base.',
      price: '13.40',
      imageUrl: foodImage('four-cheese-pizza', 19),
      vegetarian: true,
    },
    {
      category: 'pizzas',
      name: 'Chicken Alfredo Pizza',
      description: 'Creamy Alfredo sauce, chicken strips, and fresh parsley.',
      price: '13.90',
      imageUrl: foodImage('chicken-alfredo-pizza', 20),
      halal: true,
    },
    {
      category: 'pizzas',
      name: 'Veggie Delight Pizza',
      description: 'Bell peppers, olives, mushrooms, onions, and mozzarella.',
      price: '12.60',
      imageUrl: foodImage('veggie-pizza', 21),
      vegetarian: true,
    },
    {
      category: 'pizzas',
      name: 'Meat Lovers Pizza',
      description: 'Loaded with beef strips, turkey pepperoni, and melted cheese.',
      price: '14.80',
      imageUrl: foodImage('meat-pizza', 22),
      halal: true,
    },
    {
      category: 'pasta',
      name: 'Spaghetti Bolognese',
      description: 'Classic beef ragu sauce with parmesan and fresh basil.',
      price: '11.70',
      imageUrl: foodImage('spaghetti-bolognese', 23),
      halal: true,
    },
    {
      category: 'pasta',
      name: 'Penne Arrabbiata',
      description: 'Penne pasta in spicy tomato sauce with garlic and chili.',
      price: '10.30',
      imageUrl: foodImage('penne-arrabbiata', 24),
      vegetarian: true,
    },
    {
      category: 'pasta',
      name: 'Fettuccine Alfredo',
      description: 'Creamy parmesan sauce over fettuccine ribbons.',
      price: '11.20',
      imageUrl: foodImage('fettuccine-alfredo', 25),
      vegetarian: true,
    },
    {
      category: 'pasta',
      name: 'Seafood Linguine',
      description: 'Linguine pasta with shrimp, calamari, and cherry tomatoes.',
      price: '15.90',
      imageUrl: foodImage('seafood-pasta', 26),
    },
    {
      category: 'drinks',
      name: 'Lemon Mint Cooler',
      description: 'Fresh lemon juice with mint leaves and crushed ice.',
      price: '4.20',
      imageUrl: foodImage('lemon-mint-drink', 27),
      vegetarian: true,
      halal: true,
      glutenFree: true,
    },
    {
      category: 'drinks',
      name: 'Iced Americano',
      description: 'Double espresso poured over ice with chilled water.',
      price: '3.40',
      imageUrl: foodImage('iced-coffee', 28),
      vegetarian: true,
      halal: true,
      glutenFree: true,
    },
    {
      category: 'drinks',
      name: 'Strawberry Smoothie',
      description: 'Blended strawberries, yogurt, and a touch of honey.',
      price: '4.90',
      imageUrl: foodImage('strawberry-smoothie', 29),
      vegetarian: true,
      halal: true,
      glutenFree: true,
    },
    {
      category: 'drinks',
      name: 'Mango Lassi',
      description: 'Creamy mango yogurt drink served chilled.',
      price: '4.70',
      imageUrl: foodImage('mango-lassi', 30),
      vegetarian: true,
      halal: true,
      glutenFree: true,
    },
    {
      category: 'desserts',
      name: 'Tiramisu Cup',
      description: 'Coffee-soaked layers with mascarpone cream and cocoa.',
      price: '5.20',
      imageUrl: foodImage('tiramisu', 31),
      vegetarian: true,
    },
    {
      category: 'desserts',
      name: 'New York Cheesecake',
      description: 'Classic baked cheesecake with berry compote.',
      price: '5.60',
      imageUrl: foodImage('cheesecake', 32),
      vegetarian: true,
    },
    {
      category: 'desserts',
      name: 'Apple Pie',
      description: 'Warm apple pie with cinnamon and vanilla cream.',
      price: '4.90',
      imageUrl: foodImage('apple-pie', 33),
      vegetarian: true,
    },
    {
      category: 'desserts',
      name: 'Vanilla Panna Cotta',
      description: 'Silky vanilla panna cotta with raspberry sauce.',
      price: '5.10',
      imageUrl: foodImage('panna-cotta', 34),
      vegetarian: true,
      glutenFree: true,
    },
  ];

  await Promise.all(
    additionalMenuItems.map((item) =>
      upsertMenuItem({
        ...item,
        categoryId: categoryByName[item.category].id,
      }),
    ),
  );

  console.log('Seeding dining tables...');
  await upsertTable({ code: 'T01', seats: 2, assignedWaiterId: waiter?.id });
  await upsertTable({ code: 'T02', seats: 4, assignedWaiterId: waiter?.id });
  await upsertTable({ code: 'T03', seats: 6, assignedWaiterId: waiter?.id });

  console.log('Seeding suppliers and ingredients...');
  const supplier = await upsertSupplier({
    name: 'FreshFarm Supplies',
    email: 'contact@freshfarm.test',
    phone: '+212600000001',
    address: 'Zone Industrielle, Casablanca',
  });

  const ingredientsToSeed = [
    { name: 'Beef Patty', unit: 'pcs', minStockLevel: '20', currentStock: '120' },
    { name: 'Burger Bun', unit: 'pcs', minStockLevel: '40', currentStock: '180' },
    { name: 'Mozzarella', unit: 'kg', minStockLevel: '5', currentStock: '25' },
    { name: 'Pizza Dough', unit: 'pcs', minStockLevel: '20', currentStock: '90' },
    { name: 'Tomato Sauce', unit: 'L', minStockLevel: '8', currentStock: '40' },
    { name: 'Pepperoni Turkey', unit: 'kg', minStockLevel: '3', currentStock: '15' },
    { name: 'Chicken Breast', unit: 'kg', minStockLevel: '8', currentStock: '45' },
    { name: 'Pasta', unit: 'kg', minStockLevel: '8', currentStock: '38' },
    { name: 'Parmesan', unit: 'kg', minStockLevel: '2', currentStock: '9' },
    { name: 'Lettuce', unit: 'kg', minStockLevel: '4', currentStock: '20' },
    { name: 'Tomato', unit: 'kg', minStockLevel: '6', currentStock: '30' },
    { name: 'Flour', unit: 'kg', minStockLevel: '12', currentStock: '70' },
    { name: 'Sugar', unit: 'kg', minStockLevel: '8', currentStock: '42' },
    { name: 'Cocoa Powder', unit: 'kg', minStockLevel: '2', currentStock: '12' },
    { name: 'Butter', unit: 'kg', minStockLevel: '4', currentStock: '24' },
    { name: 'Orange', unit: 'kg', minStockLevel: '6', currentStock: '25' },
    { name: 'Lemon', unit: 'kg', minStockLevel: '4', currentStock: '18' },
    { name: 'Mint', unit: 'kg', minStockLevel: '1', currentStock: '5' },
    { name: 'Coffee Beans', unit: 'kg', minStockLevel: '2', currentStock: '11' },
    { name: 'Milk', unit: 'L', minStockLevel: '8', currentStock: '32' },
    { name: 'Strawberry', unit: 'kg', minStockLevel: '5', currentStock: '22' },
    { name: 'Mango', unit: 'kg', minStockLevel: '5', currentStock: '20' },
    { name: 'Shrimp', unit: 'kg', minStockLevel: '3', currentStock: '14' },
    { name: 'Bread', unit: 'kg', minStockLevel: '5', currentStock: '25' },
    { name: 'Squid', unit: 'kg', minStockLevel: '3', currentStock: '12' },
    { name: 'Veggie Patty', unit: 'pcs', minStockLevel: '15', currentStock: '80' },
    { name: 'Apple', unit: 'kg', minStockLevel: '4', currentStock: '19' },
  ];

  const ingredientMap = {};
  for (const ingredient of ingredientsToSeed) {
    const record = await upsertIngredient({
      ...ingredient,
      defaultSupplierId: supplier.id,
    });
    ingredientMap[ingredient.name] = record.id;
  }

  console.log('Seeding supplier catalog and procurement order...');
  await seedSupplierCatalogAndOrder(supplier.id, ingredientMap);

  console.log('Seeding menu recipes for all menu items...');
  const allMenuItems = await prisma.menuItem.findMany({
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  for (const item of allMenuItems) {
    const lines = recipeForMenuItem(item, ingredientMap);
    if (!lines.length) {
      continue;
    }
    await setRecipe(item.id, lines);
  }

  console.log('Seeding formula bundles...');
  await upsertFormulaBundle({
    name: 'Burger Combo',
    description: 'Classic burger with fresh orange juice',
    price: '11.90',
    isAvailable: true,
    items: [
      { menuItemId: classicBurger.id, quantity: 1 },
      { menuItemId: orangeJuice.id, quantity: 1 },
    ],
  });
  await upsertFormulaBundle({
    name: 'Pizza + Dessert Duo',
    description: 'Margherita pizza and chocolate brownie',
    price: '13.90',
    isAvailable: true,
    items: [
      { menuItemId: margherita.id, quantity: 1 },
      { menuItemId: brownie.id, quantity: 1 },
    ],
  });

  if (client) {
    await seedClientProfile(client.id, [
      classicBurger,
      margherita,
      orangeJuice,
      brownie,
    ]);
    await seedReservations(client.id);
    await seedReviewsAndLoyalty(client.id, classicBurger.id);
    await seedPaymentsAndFinance(client.id, manager?.id, margherita.id);
  }

  if (manager && waiter) {
    await seedPersonnelAndReconciliation({ manager, employee: waiter });
    await seedReconciliationData();
  }

  const [
    users,
    categories,
    menuItems,
    tables,
    suppliers,
    supplierCatalogItems,
    supplierOrders,
    ingredients,
    formulas,
    employees,
    attendance,
    absences,
    payrollRecords,
    reconciliationSessions,
    bankMovements,
    menuRecipes,
    menuItemsWithoutRecipe,
    addresses,
    preferences,
    favorites,
    reservations,
    reviews,
    loyaltyAccounts,
    loyaltyTransactions,
    payments,
    expenses,
    cashClosings,
  ] =
    await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.diningTable.count(),
    prisma.supplier.count(),
    prisma.supplierCatalogItem.count(),
    prisma.supplierOrder.count(),
    prisma.ingredient.count(),
    prisma.formulaBundle.count(),
    prisma.employee.count(),
    prisma.attendance.count(),
    prisma.absence.count(),
    prisma.payrollRecord.count(),
    prisma.reconciliationSession.count(),
    prisma.bankMovement.count(),
    prisma.menuItemIngredient.count(),
    prisma.menuItem.count({
      where: {
        ingredients: {
          none: {},
        },
      },
    }),
    prisma.clientAddress.count(),
    prisma.clientPreference.count(),
    prisma.favoriteMenuItem.count(),
    prisma.reservation.count(),
    prisma.review.count(),
    prisma.loyaltyAccount.count(),
    prisma.loyaltyTransaction.count(),
    prisma.payment.count(),
    prisma.expense.count(),
    prisma.cashClosing.count(),
  ]);

  console.log(
    `Seed complete: users=${users} categories=${categories} menuItems=${menuItems} tables=${tables} suppliers=${suppliers} supplierCatalogItems=${supplierCatalogItems} supplierOrders=${supplierOrders} ingredients=${ingredients} formulas=${formulas} employees=${employees} attendance=${attendance} absences=${absences} payrollRecords=${payrollRecords} reconciliationSessions=${reconciliationSessions} bankMovements=${bankMovements} menuRecipes=${menuRecipes} menuItemsWithoutRecipe=${menuItemsWithoutRecipe} addresses=${addresses} preferences=${preferences} favorites=${favorites} reservations=${reservations} reviews=${reviews} loyaltyAccounts=${loyaltyAccounts} loyaltyTransactions=${loyaltyTransactions} payments=${payments} expenses=${expenses} cashClosings=${cashClosings}`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
