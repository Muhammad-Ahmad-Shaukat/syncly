import { DataTypes } from "sequelize";
import { sequelize } from "../../db/db.js";

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'FK → stores.id'
    },
    platform: {
        type: DataTypes.ENUM('shopify', 'woocommerce'),
        allowNull: false
    },
    platform_product_id: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Original product ID from Shopify or WooCommerce'
    },
    platform_product_url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Full URL to the product page on the source platform'
    },

    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Full HTML description (body_html in Shopify)'
    },
    short_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'WooCommerce short_description; null for Shopify products'
    },
    handle: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL slug — handle in Shopify, slug in WooCommerce'
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'active/draft/archived (Shopify) or publish/draft/private (WC)'
    },

    price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Selling price. For variable products this is the lowest variant price'
    },
    compare_at_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Original / crossed-out price'
    },
    currency: {
        type: DataTypes.STRING(8),
        allowNull: true,
        defaultValue: 'USD'
    },

    sku: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'SKU of the base/default variant'
    },
    inventory_quantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Stock count. For variable products, sum of all variants'
    },
    inventory_policy: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'deny | continue (Shopify) or yes|no (WC manage_stock)'
    },

    vendor: {
        type: DataTypes.STRING,
        allowNull: true
    },
    product_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'simple | variable | grouped (WC) or free-text (Shopify)'
    },
    product_category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    product_subcategory: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tags: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Comma-separated tag string — matches Shopify format natively'
    },

    image_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    image_alt_text: {
        type: DataTypes.STRING,
        allowNull: true
    },

    weight: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    weight_unit: {
        type: DataTypes.STRING(8),
        allowNull: true,
        comment: 'kg | g | lb | oz'
    },

    last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    source: {
        type: DataTypes.ENUM('backend', 'woocommerce', 'shopify'),
        allowNull: false,
        defaultValue: 'woocommerce'
    },
    source_updated_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    sync_hash: {
        type: DataTypes.STRING,
        allowNull: true
    },

    raw_platform_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Full raw product object from Shopify/WooCommerce API'
    }
}, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['store_id', 'platform_product_id'],
            name: 'uq_store_platform_product'
        },
        { fields: ['store_id'] },
        { fields: ['platform'] },
        { fields: ['status'] },
        { fields: ['sku'] }
    ]
});

export default Product;