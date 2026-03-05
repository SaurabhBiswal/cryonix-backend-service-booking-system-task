import { PrismaClient } from '@prisma/client/edge';
import bcrypt from 'bcryptjs';

// Use default client for seeding (not edge runtime)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient: PC } = require('@prisma/client');
const prisma: InstanceType<typeof PrismaClient> = new PC();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Admin
    const adminPassword = await bcrypt.hash('Admin@1234', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cryonix.com' },
        update: {},
        create: {
            name: 'Admin User',
            email: 'admin@cryonix.com',
            password: adminPassword,
            role: 'ADMIN',
        },
    });
    console.log('✅ Admin created:', admin.email);

    // Create Provider
    const providerPassword = await bcrypt.hash('Provider@1234', 12);
    const provider = await prisma.user.upsert({
        where: { email: 'provider@cryonix.com' },
        update: {},
        create: {
            name: 'Service Provider',
            email: 'provider@cryonix.com',
            password: providerPassword,
            role: 'PROVIDER',
        },
    });
    console.log('✅ Provider created:', provider.email);

    // Create Customer
    const customerPassword = await bcrypt.hash('Customer@1234', 12);
    const customer = await prisma.user.upsert({
        where: { email: 'customer@cryonix.com' },
        update: {},
        create: {
            name: 'Test Customer',
            email: 'customer@cryonix.com',
            password: customerPassword,
            role: 'CUSTOMER',
        },
    });
    console.log('✅ Customer created:', customer.email);

    // Create sample slots
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(11, 0, 0, 0);

    const slot1 = await prisma.slot.create({
        data: { providerId: provider.id, startTime: tomorrow, endTime: tomorrowEnd },
    });
    console.log('✅ Sample slot 1 created:', slot1.id);

    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(14, 0, 0, 0);
    const nextDayEnd = new Date(nextDay);
    nextDayEnd.setHours(15, 0, 0, 0);

    const slot2 = await prisma.slot.create({
        data: { providerId: provider.id, startTime: nextDay, endTime: nextDayEnd },
    });
    console.log('✅ Sample slot 2 created:', slot2.id);

    console.log('\n🎉 Seeding complete!');
    console.log('\n📋 Test Credentials:');
    console.log('  Admin:    admin@cryonix.com    / Admin@1234');
    console.log('  Provider: provider@cryonix.com / Provider@1234');
    console.log('  Customer: customer@cryonix.com / Customer@1234');
}

main()
    .catch((e: unknown) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
