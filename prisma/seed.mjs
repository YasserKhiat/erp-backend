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

  console.log('Seeding categories...');
  const burgers = await upsertCategory('Burgers');
  const pizzas = await upsertCategory('Pizzas');
  const drinks = await upsertCategory('Drinks');
  const desserts = await upsertCategory('Desserts');

  console.log('Seeding menu items...');
  await upsertMenuItem({
    name: 'Classic Burger',
    description: 'Beef patty, lettuce, tomato, house sauce',
    price: '8.90',
    categoryId: burgers.id,
  });
  await upsertMenuItem({
    name: 'Double Cheese Burger',
    description: 'Double beef patty, cheddar, pickles',
    price: '11.50',
    categoryId: burgers.id,
  });
  await upsertMenuItem({
    name: 'Margherita Pizza',
    description: 'Tomato sauce, mozzarella, basil',
    price: '10.40',
    categoryId: pizzas.id,
  });
  await upsertMenuItem({
    name: 'Pepperoni Pizza',
    description: 'Tomato sauce, mozzarella, pepperoni',
    price: '12.20',
    categoryId: pizzas.id,
  });
  await upsertMenuItem({
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice',
    price: '3.80',
    categoryId: drinks.id,
  });
  await upsertMenuItem({
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

  const [users, categories, menuItems, tables, suppliers, ingredients] =
    await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.diningTable.count(),
    prisma.supplier.count(),
    prisma.ingredient.count(),
  ]);

  console.log(
    `Seed complete: users=${users} categories=${categories} menuItems=${menuItems} tables=${tables} suppliers=${suppliers} ingredients=${ingredients}`,
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
