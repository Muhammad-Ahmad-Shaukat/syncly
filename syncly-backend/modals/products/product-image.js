import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

const ProductImage = sequelize.define('ProductImage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'FK → products.id'
    },
    platform_image_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Image ID from Shopify or WooCommerce'
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    alt_text: {
        type: DataTypes.STRING,
        allowNull: true
    },
    caption: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'WooCommerce supports captions; Shopify does not'
    },
    position: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '0 = primary/featured image'
    },
    width: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    height: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'product_images',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['product_id'] },
        { fields: ['position'] }
    ]
});

export default ProductImage;