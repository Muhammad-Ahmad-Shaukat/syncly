import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "syncly-connector-data.json");

function readAll() {
    if (!existsSync(FILE)) return {};
    try {
        return JSON.parse(readFileSync(FILE, "utf8"));
    } catch {
        return {};
    }
}

function writeAll(data) {
    writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * @param {string} shop e.g. my-store.myshopify.com
 */
export function getConnectorForShop(shop) {
    if (!shop) return null;
    const key = String(shop).toLowerCase().replace(/^https?:\/\//, "");
    return readAll()[key] || null;
}

export function saveConnectorForShop(shop, record) {
    const key = String(shop).toLowerCase().replace(/^https?:\/\//, "");
    const all = readAll();
    const prev = all[key] || {};
    const next = { ...prev };
    for (const [k, v] of Object.entries(record)) {
        if (v === null || v === undefined) {
            delete next[k];
        } else {
            next[k] = v;
        }
    }
    next.shop = key;
    next.updatedAt = new Date().toISOString();
    all[key] = next;
    writeAll(all);
}

export function clearConnectorForShop(shop) {
    const key = String(shop).toLowerCase().replace(/^https?:\/\//, "");
    const all = readAll();
    delete all[key];
    writeAll(all);
}
