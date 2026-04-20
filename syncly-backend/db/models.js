import { sequelize } from "./db.js";
import User from "../modals/users.js";
import productModels from "../modals/products/main-product.js";

const { Store, Product, ProductVariant, ProductImage } = productModels;

User.hasMany(Store, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});
Store.belongsTo(User, {
    foreignKey: "user_id",
});

export async function syncDatabase() {
    const alter = process.env.DB_SYNC_ALTER === "true";
    await sequelize.sync({ alter });
}

export { sequelize, User, Store, Product, ProductVariant, ProductImage };
