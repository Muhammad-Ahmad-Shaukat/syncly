import crypto from "crypto";

/** Stable public IDs shown to merchants (immutable once assigned). */
export function generateProductPublicId() {
    const hex = crypto.randomBytes(8).toString("hex").toUpperCase();
    return `SYN-P-${hex}`;
}

export function generateOrderPublicId() {
    const hex = crypto.randomBytes(8).toString("hex").toUpperCase();
    return `SYN-O-${hex}`;
}
