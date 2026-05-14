import { Product } from "../../db/models.js";

/**
 * Normalize dispatch job payloads to { entity, operation, external_id, data } for Woo / Shopify.
 */
export async function normalizeDispatchCommand(store, command) {
    if (!command || typeof command !== "object") {
        throw new Error("Invalid command");
    }
    if (command.entity) {
        return {
            entity: command.entity,
            operation: command.operation || "update",
            external_id: String(command.external_id ?? ""),
            data: command.data && typeof command.data === "object" ? command.data : {}
        };
    }

    const action = command.action;
    if (action === "update_product") {
        const externalId = String(command.platform_product_id ?? "");
        const fields = command.fields && typeof command.fields === "object" ? command.fields : {};
        return {
            entity: "product",
            operation: "update",
            external_id: externalId,
            data: { ...fields }
        };
    }
    if (action === "create_product") {
        const id = command.product_id;
        let data = {
            title: command.title,
            sku: command.sku,
            price: command.price,
            inventory_quantity: command.inventory_quantity,
            status: command.status,
            description: command.description,
            image_url: command.image_url
        };
        if (id != null) {
            const p = await Product.findByPk(id);
            if (!p || p.store_id !== store.id) {
                throw new Error("Product not found for create dispatch");
            }
            data = {
                title: p.title,
                sku: p.sku,
                price: p.price,
                inventory_quantity: p.inventory_quantity,
                status: p.status,
                description: p.description,
                image_url: p.image_url,
                image_alt_text: p.image_alt_text
            };
        }
        return {
            entity: "product",
            operation: "create",
            external_id: "",
            data
        };
    }
    if (action === "mobile_resync_product") {
        const p = await Product.findByPk(command.internal_id);
        if (!p || p.store_id !== store.id) {
            throw new Error("Product not found for resync");
        }
        return {
            entity: "product",
            operation: "update",
            external_id: String(p.platform_product_id),
            data: {
                title: p.title,
                sku: p.sku,
                price: p.price,
                inventory_quantity: p.inventory_quantity,
                status: p.status,
                image_url: p.image_url,
                image_alt_text: p.image_alt_text
            }
        };
    }
    if (action === "update_order" || action === "order_status") {
        return {
            entity: "order",
            operation: "update",
            external_id: String(command.platform_order_id ?? command.external_id ?? ""),
            data: command.data || { status: command.status }
        };
    }
    if (action === "update_customer") {
        return {
            entity: "customer",
            operation: "update",
            external_id: String(command.platform_customer_id ?? command.external_id ?? ""),
            data: command.data || {}
        };
    }

    throw new Error(`Unsupported dispatch action: ${action || "unknown"}`);
}
