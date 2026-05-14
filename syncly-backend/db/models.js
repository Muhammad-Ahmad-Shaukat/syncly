import { sequelize } from "./db.js";
import { applySchemaPatches } from "./schema-patches.js";
import User from "../modals/users.js";
import productModels from "../modals/products/main-product.js";
import Order from "../modals/orders.js";
import Customer from "../modals/customers.js";
import syncModels from "../modals/sync/main-sync.js";
import MobileSession from "../modals/mobile-session.js";
import SyncConflict from "../modals/sync-conflict.js";
import {
    EmailTemplate,
    EmailSegment,
    EmailCampaign,
    CampaignSend
} from "../modals/email-marketing.js";
import { ConversationThread, ConversationMessage } from "../modals/inbox-conversation.js";

const { Store, Product, ProductVariant, ProductImage } = productModels;
const { SyncMapping, SyncEventLog, SyncRunLog, SyncJob, SyncDeadLetter } = syncModels;

User.hasMany(Store, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});
Store.belongsTo(User, {
    foreignKey: "user_id",
});

User.hasMany(MobileSession, { foreignKey: "user_id", onDelete: "CASCADE" });
MobileSession.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(SyncConflict, { foreignKey: "user_id", onDelete: "CASCADE" });
SyncConflict.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(EmailTemplate, { foreignKey: "user_id", onDelete: "CASCADE" });
EmailTemplate.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(EmailSegment, { foreignKey: "user_id", onDelete: "CASCADE" });
EmailSegment.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(EmailCampaign, { foreignKey: "user_id", onDelete: "CASCADE" });
EmailCampaign.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(ConversationThread, { foreignKey: "user_id", onDelete: "CASCADE" });
ConversationThread.belongsTo(User, { foreignKey: "user_id" });

Store.hasMany(Order, { foreignKey: "store_id", onDelete: "CASCADE" });
Order.belongsTo(Store, { foreignKey: "store_id" });

Store.hasMany(Customer, { foreignKey: "store_id", onDelete: "CASCADE" });
Customer.belongsTo(Store, { foreignKey: "store_id" });

Store.hasMany(SyncMapping, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(SyncEventLog, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(SyncRunLog, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(SyncJob, { foreignKey: "store_id", onDelete: "CASCADE" });
Store.hasMany(SyncDeadLetter, { foreignKey: "store_id", onDelete: "CASCADE" });
SyncEventLog.belongsTo(Store, { foreignKey: "store_id" });

export async function syncDatabase() {
    const alter = process.env.DB_SYNC_ALTER === "true";
    await sequelize.sync({ alter });
    await applySchemaPatches();
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
    SyncDeadLetter,
    MobileSession,
    SyncConflict,
    EmailTemplate,
    EmailSegment,
    EmailCampaign,
    CampaignSend,
    ConversationThread,
    ConversationMessage
};
