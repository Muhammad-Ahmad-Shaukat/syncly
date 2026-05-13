/**
 * Idempotent demo seed: merchant user, two stores, ~50 products, ~100 orders.
 * Run: node scripts/seed-demo.mjs
 * Requires MySQL + backend .env (same as syncly-backend).
 */

import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import {
    sequelize,
    User,
    Store,
    Product,
    Order,
} from "../db/models.js";

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL || "demo@syncly.dev";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "DemoSyncly2026!";
const DEMO_USER = process.env.SEED_DEMO_USERNAME || "demomerchant";

async function main() {
    await sequelize.authenticate();

    let user = await User.findOne({ where: { email: DEMO_EMAIL } });
    if (!user) {
        user = await User.create({
            username: DEMO_USER,
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
        });
        console.log("Created demo user:", DEMO_EMAIL);
    } else {
        console.log("Demo user exists:", DEMO_EMAIL);
    }

    const stores = [];
    for (const platform of ["shopify", "woocommerce"]) {
        const [store] = await Store.findOrCreate({
            where: { user_id: user.id, platform, store_url: `https://${platform}-demo.syncly.local` },
            defaults: {
                user_id: user.id,
                platform,
                store_name: `${platform === "shopify" ? "Shopify" : "WooCommerce"} Demo`,
                store_url: `https://${platform}-demo.syncly.local`,
                plugin_callback_url: null,
                sync_status: "idle",
            },
        });
        stores.push(store);
    }

    const targetProducts = 50;
    const storeIds = stores.map((s) => s.id);
    const existing = await Product.count({ where: { store_id: { [Op.in]: storeIds } } });
    const needProducts = Math.max(0, targetProducts - existing);
    let created = 0;
    for (let n = 0; n < needProducts; n += 1) {
        const i = existing + n;
        const store = stores[i % 2];
        const extId = `demo-${store.platform}-${i}`;
        await Product.findOrCreate({
            where: { store_id: store.id, platform_product_id: extId },
            defaults: {
                store_id: store.id,
                platform: store.platform,
                platform_product_id: extId,
                title: `Demo Product ${i + 1}`,
                sku: `SKU-${i + 1}`,
                price: 10 + (i % 40),
                inventory_quantity: (i * 3) % 200,
                status: "active",
                source: "backend",
            },
        });
        created += 1;
    }
    console.log(`Products ensured (target ${targetProducts}), created this run: ${created}`);

    const targetOrders = 100;
    const orderCount = await Order.count({ where: { store_id: { [Op.in]: storeIds } } });
    const needOrders = Math.max(0, targetOrders - orderCount);
    let oCreated = 0;
    for (let n = 0; n < needOrders; n += 1) {
        const i = orderCount + n;
        const store = stores[i % 2];
        const extOrd = `demo-order-${store.platform}-${i}`;
        await Order.findOrCreate({
            where: { store_id: store.id, platform_order_id: extOrd },
            defaults: {
                store_id: store.id,
                platform: store.platform,
                platform_order_id: extOrd,
                order_number: `ORD-${i + 1000}`,
                status: i % 3 === 0 ? "paid" : "pending",
                total_amount: 25 + (i % 50),
                currency: "USD",
                source: "backend",
            },
        });
        oCreated += 1;
    }
    console.log(`Orders ensured (target ${targetOrders}), created this run: ${oCreated}`);
    console.log("Done. Login mobile app with:", DEMO_EMAIL, "/", DEMO_PASSWORD);
    await sequelize.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
