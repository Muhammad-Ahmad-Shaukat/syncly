import { DataTypes } from "sequelize";
import { sequelize } from "../../db/db.js";

const Store = sequelize.define('Store', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'References your Users table'
    },
    platform: {
        type: DataTypes.ENUM('shopify', 'woocommerce'),
        allowNull: false
    },
    store_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Human-readable label, e.g. "My Shopify Store"'
    },
    store_url: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'e.g. mystore.myshopify.com or mywoosite.com'
    },
    access_token: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Shopify access token or WooCommerce consumer_key'
    },
    access_token_secret: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'WooCommerce consumer_secret (null for Shopify)'
    },
    last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    sync_status: {
        type: DataTypes.ENUM('idle', 'syncing', 'failed', 'never'),
        defaultValue: 'never'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'stores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default Store;