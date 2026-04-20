import Store from "./store.js";
import Product from "./product.js";
import ProductVariant from "./product-variant.js";
import ProductImage from "./product-image.js";


Store.hasMany(Product, {
    foreignKey: 'store_id',
    onDelete: 'CASCADE'
});
Product.belongsTo(Store, {
    foreignKey: 'store_id'
});

Product.hasMany(ProductVariant, {
    foreignKey: 'product_id',
    as: 'variants',
    onDelete: 'CASCADE'
});
ProductVariant.belongsTo(Product, {
    foreignKey: 'product_id'
});

Product.hasMany(ProductImage, {
    foreignKey: 'product_id',
    as: 'images',
    onDelete: 'CASCADE'
});
ProductImage.belongsTo(Product, {
    foreignKey: 'product_id'
});

export default { Store, Product, ProductVariant, ProductImage };