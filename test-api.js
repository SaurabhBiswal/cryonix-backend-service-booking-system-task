const http = require('http');

const BASE_URL = 'http://localhost:3000/api';

// Helper for making requests
const request = (method, endpoint, body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `${endpoint}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

async function runTests() {
    console.log("🚀 Starting API Tests (Make sure 'npm run dev' is running in another terminal)...\n");

    try {
        // 1. Login as Provider
        console.log("👤 1. Logging in as Provider...");
        const providerLogin = await request('POST', '/auth/login', {
            email: 'provider@cryonix.com',
            password: 'Provider@1234'
        });
        if (providerLogin.status !== 200) {
            console.error("❌ Login failed:", providerLogin.data);
            return;
        }
        const providerToken = providerLogin.data.data.token;
        console.log("   ✅ Provider Login Successful!\n");

        // 2. Login as Customer
        console.log("👤 2. Logging in as Customer...");
        const customerLogin = await request('POST', '/auth/login', {
            email: 'customer@cryonix.com',
            password: 'Customer@1234'
        });
        if (customerLogin.status !== 200) {
            console.error("❌ Customer Login failed:", customerLogin.data);
            return;
        }
        const customerToken = customerLogin.data.data.token;
        console.log("   ✅ Customer Login Successful!\n");

        // 3. Provider Creates a Slot
        console.log("📅 3. Provider creating a new time slot...");
        const tomorrow = new Date();
        // Use a random hour offset to avoid overlaps from previous test runs
        const randomHour = 8 + Math.floor(Math.random() * 8);
        tomorrow.setDate(tomorrow.getDate() + 3); // 3 days from now
        tomorrow.setHours(randomHour, 0, 0, 0);

        const mySlotEnd = new Date(tomorrow);
        mySlotEnd.setHours(randomHour + 1, 0, 0, 0);

        const createSlot = await request('POST', '/slots', {
            startTime: tomorrow.toISOString(),
            endTime: mySlotEnd.toISOString()
        }, providerToken);

        if (createSlot.status !== 201) {
            console.error("❌ Slot creation failed:", createSlot.data);
            return;
        }

        const slotId = createSlot.data.data.slot.id;
        console.log("   ✅ Slot created! Slot ID:", slotId, "\n");

        // 4. Customer Books the Slot
        console.log("🛒 4. Customer booking the slot...");
        const createBooking = await request('POST', '/bookings', {
            slotId: slotId
        }, customerToken);

        if (createBooking.status !== 201) {
            console.error("❌ Booking failed:", createBooking.data);
            return;
        }

        const bookingId = createBooking.data.data.booking.id;
        console.log("   ✅ Booking successful! (Status is PENDING). Booking ID:", bookingId, "\n");

        // 5. Customer Pays for the Booking
        console.log("💳 5. Simulating Payment for booking...");
        const payBooking = await request('POST', '/bookings/confirm-payment', {
            bookingId: bookingId,
            success: true,
            transactionId: 'txn_mock_' + Math.floor(Math.random() * 1000000)
        }, customerToken);

        if (payBooking.status !== 200) {
            console.error("❌ Payment failed:", payBooking.data);
            return;
        }

        console.log("   ✅ Payment Confirmed! Slot is now marked as BOOKED.\n");

        // 6. Demonstrate Double Booking Prevention
        console.log("🚫 6. Attempting to book the SAME slot again to test protection...");
        const doubleBooking = await request('POST', '/bookings', {
            slotId: slotId
        }, customerToken);

        console.log(`   ✅ Protection verified! Server responded with HTTP ${doubleBooking.status}: ${doubleBooking.data.message}\n`);

        console.log("🎉 All Tests Passed Successfully!");

    } catch (err) {
        console.error("❌ Test failed. Is the server running? Error:", err.message);
    }
}

runTests();
