import { sequelize } from "./db.js";
import User from "../modals/users.js";
import Product from "../modals/products/product.js";
import Store from "../modals/products/store.js";

function sqlIdent(name) {
    return String(name).replace(/`/g, "");
}

async function mysqlColumnExists(table, column) {
    const t = sqlIdent(table);
    const c = sqlIdent(column);
    if (!/^[a-zA-Z0-9_]+$/.test(c)) {
        throw new Error(`Invalid column name: ${column}`);
    }
    const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${t}\` LIKE '${c}'`);
    return Array.isArray(rows) && rows.length > 0;
}

async function addMysqlColumnIfMissing(table, column, ddlBody) {
    const t = sqlIdent(table);
    const col = sqlIdent(column);
    if (await mysqlColumnExists(t, col)) {
        return;
    }
    try {
        await sequelize.query(`ALTER TABLE \`${t}\` ADD COLUMN \`${col}\` ${ddlBody}`);
        console.log(`[schema-patches] Added column ${t}.${col}`);
    } catch (err) {
        if (err?.name === "SequelizeDatabaseError" && /Duplicate column name/i.test(String(err?.message))) {
            return;
        }
        throw err;
    }
}

async function patchUserConflictStrategy() {
    const table = User.getTableName();
    if (await mysqlColumnExists(table, "conflict_strategy")) {
        return;
    }
    try {
        await sequelize.query(
            `ALTER TABLE \`${sqlIdent(table)}\` ADD COLUMN \`conflict_strategy\`
             ENUM('syncly_master', 'latest_wins', 'manual')
             NOT NULL DEFAULT 'manual'
             COMMENT 'How to resolve cross-channel conflicts when not manually reviewed'`
        );
        console.log(`[schema-patches] Added column conflict_strategy on table ${table}`);
    } catch (err) {
        if (err?.name === "SequelizeDatabaseError" && /Duplicate column name/i.test(String(err?.message))) {
            return;
        }
        throw err;
    }
}

/** Columns the Product model selects; safe DDL for existing rows. */
const PRODUCT_COLUMN_DDLS = [
    ["store_id", "INT NULL COMMENT 'FK → stores.id'"],
    ["platform", "ENUM('shopify','woocommerce') NULL"],
    ["platform_product_id", "VARCHAR(255) NULL"],
    ["platform_product_url", "VARCHAR(512) NULL"],
    ["title", "VARCHAR(512) NULL"],
    ["description", "TEXT NULL"],
    ["short_description", "TEXT NULL"],
    ["handle", "VARCHAR(255) NULL"],
    ["status", "VARCHAR(64) NULL"],
    ["price", "DECIMAL(12,2) NULL"],
    ["compare_at_price", "DECIMAL(12,2) NULL"],
    ["currency", "VARCHAR(8) NULL DEFAULT 'USD'"],
    ["sku", "VARCHAR(255) NULL"],
    ["inventory_quantity", "INT NULL"],
    ["inventory_policy", "VARCHAR(64) NULL"],
    ["vendor", "VARCHAR(255) NULL"],
    ["product_type", "VARCHAR(255) NULL"],
    ["product_category", "VARCHAR(255) NULL"],
    ["product_subcategory", "VARCHAR(255) NULL"],
    ["tags", "TEXT NULL"],
    ["image_url", "VARCHAR(1024) NULL"],
    ["image_alt_text", "VARCHAR(512) NULL"],
    ["weight", "DOUBLE NULL"],
    ["weight_unit", "VARCHAR(8) NULL"],
    ["last_synced_at", "DATETIME NULL"],
    ["source", "ENUM('backend','woocommerce','shopify') NOT NULL DEFAULT 'woocommerce'"],
    ["source_updated_at", "DATETIME NULL"],
    ["version", "INT NOT NULL DEFAULT 1"],
    ["sync_hash", "VARCHAR(255) NULL"],
    ["raw_platform_data", "JSON NULL"],
    ["syncly_public_id", "VARCHAR(32) NULL"]
];

async function patchProductColumnsForMerchantQueries() {
    const table = Product.tableName || "products";
    try {
        for (const [col, ddl] of PRODUCT_COLUMN_DDLS) {
            await addMysqlColumnIfMissing(table, col, ddl);
        }
    } catch (err) {
        console.warn("[schema-patches] products column patch skipped or failed:", err?.parent?.sqlMessage || err?.message || err);
    }
}

async function patchStoreCrossSync() {
    const table = Store.tableName || "stores";
    try {
        await addMysqlColumnIfMissing(table, "cross_sync_enabled", "TINYINT(1) NOT NULL DEFAULT 0");
        await addMysqlColumnIfMissing(table, "cross_sync_peer_ids", "JSON NULL");
    } catch (err) {
        console.warn("[schema-patches] stores cross_sync:", err?.parent?.sqlMessage || err?.message || err);
    }
}

const SYNC_RUN_LOG_DDLS = [["started_at", "DATETIME NULL"]];

const ORDER_COLUMN_DDLS = [
    ["platform", "ENUM('shopify','woocommerce') NOT NULL DEFAULT 'woocommerce'"],
    ["platform_order_id", "VARCHAR(255) NULL"],
    ["order_number", "VARCHAR(255) NULL"],
    ["status", "VARCHAR(128) NULL"],
    ["currency", "VARCHAR(8) NULL"],
    ["total_amount", "DECIMAL(12,2) NULL"],
    ["source", "ENUM('backend','woocommerce','shopify') NOT NULL DEFAULT 'backend'"],
    ["source_updated_at", "DATETIME NULL"],
    ["last_synced_at", "DATETIME NULL"],
    ["version", "INT NOT NULL DEFAULT 1"],
    ["sync_hash", "VARCHAR(255) NULL"],
    ["raw_platform_data", "JSON NULL"],
    ["syncly_public_id", "VARCHAR(32) NULL"]
];

const SYNC_CONFLICT_DDLS = [
    ["user_id", "INT NULL"],
    ["sku", "VARCHAR(255) NULL"],
    ["conflict_kind", "ENUM('duplicate_sku','field_mismatch') NOT NULL DEFAULT 'duplicate_sku'"],
    ["field_key", "VARCHAR(64) NULL"],
    ["syncly_public_id", "VARCHAR(32) NULL"],
    ["left_snapshot", "JSON NULL"],
    ["right_snapshot", "JSON NULL"],
    ["left_platform", "VARCHAR(32) NULL"],
    ["right_platform", "VARCHAR(32) NULL"],
    ["status", "ENUM('open','resolved') NOT NULL DEFAULT 'open'"],
    ["resolution", "JSON NULL"]
];

async function patchSyncRunLogTriggerFull() {
    try {
        await sequelize.query(
            `ALTER TABLE \`sync_run_logs\` MODIFY COLUMN \`trigger_type\`
             ENUM('initial','delta','manual_retry','full') NOT NULL`
        );
        console.log("[schema-patches] sync_run_logs.trigger_type extended with 'full'");
    } catch (err) {
        const msg = String(err?.parent?.sqlMessage || err?.message || err);
        if (/Unknown column|doesn't exist|check that it exists/i.test(msg)) {
            return;
        }
        console.warn("[schema-patches] sync_run_logs trigger_type full:", msg);
    }
}

async function patchSyncSupportingTables() {
    try {
        for (const [col, ddl] of SYNC_RUN_LOG_DDLS) {
            await addMysqlColumnIfMissing("sync_run_logs", col, ddl);
        }
    } catch (err) {
        console.warn("[schema-patches] sync_run_logs:", err?.parent?.sqlMessage || err?.message || err);
    }
    await patchSyncRunLogTriggerFull();
    try {
        for (const [col, ddl] of ORDER_COLUMN_DDLS) {
            await addMysqlColumnIfMissing("orders", col, ddl);
        }
    } catch (err) {
        console.warn("[schema-patches] orders:", err?.parent?.sqlMessage || err?.message || err);
    }
    try {
        for (const [col, ddl] of SYNC_CONFLICT_DDLS) {
            await addMysqlColumnIfMissing("sync_conflicts", col, ddl);
        }
    } catch (err) {
        console.warn("[schema-patches] sync_conflicts:", err?.parent?.sqlMessage || err?.message || err);
    }
}

/**
 * Add columns expected by Sequelize models but missing from older DBs.
 */
export async function applySchemaPatches() {
    if (sequelize.getDialect() !== "mysql") {
        return;
    }
    await patchUserConflictStrategy();
    await patchProductColumnsForMerchantQueries();
    await patchStoreCrossSync();
    await patchSyncSupportingTables();
}
