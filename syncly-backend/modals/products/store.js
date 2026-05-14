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
    },
    connector_access_token: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Short-lived connector access token for plugin-to-backend calls'
    },
    connector_refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Refresh token for connector access token rotation'
    },
    connector_token_issued_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    connector_token_expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    connector_token_revoked_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    connector_last_used_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    plugin_callback_url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Plugin REST endpoint base used for backend -> Woo push commands'
    },
    webhook_secret: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Shared secret for backend signed commands to plugin'
    },
    /** When true (or SYNCLY_CROSS_STORE_FANOUT), product upserts fan out to peer stores. */
    cross_sync_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    /** Store IDs (same user) to receive cross-store product updates; empty = all other stores when enabled. */
    cross_sync_peer_ids: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'stores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default Store;