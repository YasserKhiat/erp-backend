import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

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

async function upsertMenuItem({ name, description, price, categoryId }) {
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
        isAvailable: true,
      },
    });
  }

  return prisma.menuItem.update({
    where: { id: existing.id },
    data: {
      description,
      price,
      isAvailable: true,
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
  const client = await prisma.user.findUnique({
    where: { email: 'client@restaurant.local' },
  });

  console.log('Seeding categories...');
  const burgers = await upsertCategory('Burgers');
  const pizzas = await upsertCategory('Pizzas');
  const drinks = await upsertCategory('Drinks');
  const desserts = await upsertCategory('Desserts');

  console.log('Seeding menu items...');
  const classicBurger = await upsertMenuItem({
    name: 'Classic Burger',
    description: 'Beef patty, lettuce, tomato, house sauce',
    price: '8.90',
    categoryId: burgers.id,
  });
  const doubleCheese = await upsertMenuItem({
    name: 'Double Cheese Burger',
    description: 'Double beef patty, cheddar, pickles',
    price: '11.50',
    categoryId: burgers.id,
  });
  const margherita = await upsertMenuItem({
    name: 'Margherita Pizza',
    description: 'Tomato sauce, mozzarella, basil',
    price: '10.40',
    categoryId: pizzas.id,
  });
  const pepperoni = await upsertMenuItem({
    name: 'Pepperoni Pizza',
    description: 'Tomato sauce, mozzarella, pepperoni',
    price: '12.20',
    categoryId: pizzas.id,
  });
  const orangeJuice = await upsertMenuItem({
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice',
    price: '3.80',
    categoryId: drinks.id,
  });
  const brownie = await upsertMenuItem({
    name: 'Chocolate Brownie',
    description: 'Warm brownie with chocolate topping',
    price: '4.60',
    categoryId: desserts.id,
  });

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

  await upsertIngredient({
    name: 'Beef Patty',
    unit: 'pcs',
    minStockLevel: '20',
    currentStock: '120',
    defaultSupplierId: supplier.id,
  });
  await upsertIngredient({
    name: 'Burger Bun',
    unit: 'pcs',
    minStockLevel: '40',
    currentStock: '180',
    defaultSupplierId: supplier.id,
  });
  await upsertIngredient({
    name: 'Mozzarella',
    unit: 'kg',
    minStockLevel: '5',
    currentStock: '25',
    defaultSupplierId: supplier.id,
  });

  const [beefPatty, burgerBun, mozzarella] = await Promise.all([
    prisma.ingredient.findUnique({ where: { name: 'Beef Patty' }, select: { id: true } }),
    prisma.ingredient.findUnique({ where: { name: 'Burger Bun' }, select: { id: true } }),
    prisma.ingredient.findUnique({ where: { name: 'Mozzarella' }, select: { id: true } }),
  ]);

  if (!beefPatty || !burgerBun || !mozzarella) {
    throw new Error('Missing seeded ingredients for recipe setup');
  }

  console.log('Seeding menu recipes...');
  await setRecipe(classicBurger.id, [
    { ingredientId: beefPatty.id, quantityNeeded: '1' },
    { ingredientId: burgerBun.id, quantityNeeded: '1' },
  ]);
  await setRecipe(doubleCheese.id, [
    { ingredientId: beefPatty.id, quantityNeeded: '2' },
    { ingredientId: burgerBun.id, quantityNeeded: '1' },
  ]);
  await setRecipe(margherita.id, [{ ingredientId: mozzarella.id, quantityNeeded: '0.20' }]);
  await setRecipe(pepperoni.id, [{ ingredientId: mozzarella.id, quantityNeeded: '0.25' }]);

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
  }

  const [
    users,
    categories,
    menuItems,
    tables,
    suppliers,
    ingredients,
    formulas,
    addresses,
    preferences,
    favorites,
    reservations,
  ] =
    await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.diningTable.count(),
    prisma.supplier.count(),
    prisma.ingredient.count(),
    prisma.formulaBundle.count(),
    prisma.clientAddress.count(),
    prisma.clientPreference.count(),
    prisma.favoriteMenuItem.count(),
    prisma.reservation.count(),
  ]);

  console.log(
    `Seed complete: users=${users} categories=${categories} menuItems=${menuItems} tables=${tables} suppliers=${suppliers} ingredients=${ingredients} formulas=${formulas} addresses=${addresses} preferences=${preferences} favorites=${favorites} reservations=${reservations}`,
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
