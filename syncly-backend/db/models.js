import { sequelize } from "./db.js";
import User from "../modals/users.js";
import productModels from "../modals/products/main-product.js";
import Order from "../modals/orders.js";
import Customer from "../modals/customers.js";
import syncModels from "../modals/sync/main-sync.js";

const { Store, Product, ProductVariant, ProductImage } = productModels;
const { SyncMapping, SyncEventLog, SyncRunLog, SyncJob, SyncDeadLetter } = syncModels;

User.hasMany(Store, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});
Store.belongsTo(User, {
    foreignKey: "user_id",
});

Store.hasMany(Order, { foreignKey: "store_id", onDelete: "CASCADE" });
Order.belongsTo(Store, { foreignKey: "store_id" });

Store.hasMany(Customer, { foreignKey: "store_id", onDelete: "CASCADE" });
Customer.belongsTo(Store, { foreignKey: "store_id" });

Store.hasMany(SyncMapping, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(SyncEventLog, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(SyncRunLog, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(SyncJob, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(SyncDeadLetter, { foreignKey: "store_id", onDelete: "CASCADE" });

export async function syncDatabase() {
    const alter = process.env.DB_SYNC_ALTER === "true";
    await sequelize.sync({ alter });
}

export {
    sequelize,
    User,
    Store,
    Product,
    ProductVariant,
    ProductImage,
    Order,
    Customer,
    SyncMapping,
    SyncEventLog,
    SyncRunLog,
    SyncJob,
    SyncDeadLetter
};
