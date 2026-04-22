<?php

if (!defined('ABSPATH')) exit;

if (!function_exists('syncly_get_product_image_data')) {
    function syncly_get_product_image_data($product) {
        $image_id = (int) $product->get_image_id();
        if ($image_id <= 0) {
            return ['image_url' => '', 'image_alt_text' => ''];
        }
        $image_url = wp_get_attachment_url($image_id);
        $image_alt = get_post_meta($image_id, '_wp_attachment_image_alt', true);
        return [
            'image_url' => $image_url ? $image_url : '',
            'image_alt_text' => is_string($image_alt) ? $image_alt : '',
        ];
    }
}

function syncly_build_product_payload($product_id) {
    $product = wc_get_product($product_id);
    if (!$product) return null;
    $image_data = syncly_get_product_image_data($product);
    return [
        'id' => $product->get_id(),
        'title' => $product->get_name(),
        'status' => $product->get_status(),
        'price' => $product->get_price(),
        'inventory_quantity' => $product->get_stock_quantity(),
        'sku' => $product->get_sku(),
        'image_url' => $image_data['image_url'],
        'image_alt_text' => $image_data['image_alt_text'],
        'updated_at' => $product->get_date_modified() ? $product->get_date_modified()->date('c') : gmdate('c')
    ];
}

function syncly_build_order_payload($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return null;
    return [
        'id' => $order->get_id(),
        'order_number' => $order->get_order_number(),
        'status' => $order->get_status(),
        'currency' => $order->get_currency(),
        'total_amount' => $order->get_total(),
        'updated_at' => $order->get_date_modified() ? $order->get_date_modified()->date('c') : gmdate('c')
    ];
}

function syncly_build_customer_payload($user_id) {
    $user = get_userdata($user_id);
    if (!$user) return null;
    return [
        'id' => $user->ID,
        'email' => $user->user_email,
        'first_name' => get_user_meta($user_id, 'first_name', true),
        'last_name' => get_user_meta($user_id, 'last_name', true),
        'status' => 'active',
        'updated_at' => gmdate('c')
    ];
}

function syncly_capture_change_event($entity, $operation, $external_id, $data) {
    if (syncly_should_suppress_event($entity, $external_id)) {
        return;
    }
    syncly_enqueue_event([
        'entity' => $entity,
        'operation' => $operation,
        'external_id' => (string) $external_id,
        'origin' => 'woocommerce',
        'idempotency_key' => syncly_build_idempotency_key($entity, $operation, $external_id),
        'data' => $data
    ]);
}

add_action('woocommerce_update_product', function($product_id) {
    $payload = syncly_build_product_payload($product_id);
    if ($payload) syncly_capture_change_event('product', 'update', $product_id, $payload);
});
add_action('woocommerce_new_product', function($product_id) {
    $payload = syncly_build_product_payload($product_id);
    if ($payload) syncly_capture_change_event('product', 'create', $product_id, $payload);
});
add_action('before_delete_post', function($post_id) {
    if (get_post_type($post_id) !== 'product') return;
    syncly_capture_change_event('product', 'delete', $post_id, ['id' => $post_id, 'updated_at' => gmdate('c')]);
});

add_action('woocommerce_update_order', function($order_id) {
    $payload = syncly_build_order_payload($order_id);
    if ($payload) syncly_capture_change_event('order', 'update', $order_id, $payload);
});
add_action('woocommerce_new_order', function($order_id) {
    $payload = syncly_build_order_payload($order_id);
    if ($payload) syncly_capture_change_event('order', 'create', $order_id, $payload);
});

add_action('profile_update', function($user_id) {
    if (!in_array('customer', (array) get_userdata($user_id)->roles, true)) return;
    $payload = syncly_build_customer_payload($user_id);
    if ($payload) syncly_capture_change_event('customer', 'update', $user_id, $payload);
});
add_action('user_register', function($user_id) {
    $payload = syncly_build_customer_payload($user_id);
    if ($payload) syncly_capture_change_event('customer', 'create', $user_id, $payload);
});

