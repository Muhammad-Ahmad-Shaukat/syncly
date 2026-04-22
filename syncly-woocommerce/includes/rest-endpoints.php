<?php

if (!defined('ABSPATH')) exit;

function syncly_verify_command_request(WP_REST_Request $request) {
    $secret = get_option('syncly_webhook_secret', '');
    $incoming = $request->get_header('x-syncly-webhook-secret');
    if (!$secret || !$incoming || !hash_equals($secret, $incoming)) {
        return new WP_Error('forbidden', 'Invalid webhook secret', ['status' => 403]);
    }
    return true;
}

function syncly_apply_product_command($command) {
    $external_id = (int) ($command['external_id'] ?? 0);
    $operation = $command['operation'] ?? 'update';
    $data = $command['data'] ?? [];
    if ($operation === 'delete' && $external_id > 0) {
        wp_delete_post($external_id, true);
        return ['applied' => true];
    }

    if ($external_id > 0) {
        $product = wc_get_product($external_id);
        if (!$product) return ['applied' => false, 'reason' => 'Product not found'];
    } else {
        $product = new WC_Product_Simple();
    }
    if (!empty($data['title'])) $product->set_name($data['title']);
    if (isset($data['price'])) $product->set_regular_price((string) $data['price']);
    if (!empty($data['status'])) $product->set_status($data['status']);
    if (isset($data['inventory_quantity'])) {
        $product->set_manage_stock(true);
        $product->set_stock_quantity((int) $data['inventory_quantity']);
    }
    $product_id = $product->save();
    syncly_add_suppression_marker('product', $product_id);
    return ['applied' => true, 'external_id' => $product_id];
}

function syncly_apply_order_command($command) {
    $external_id = (int) ($command['external_id'] ?? 0);
    $operation = $command['operation'] ?? 'update';
    if ($external_id <= 0) return ['applied' => false, 'reason' => 'Missing external order id'];
    $order = wc_get_order($external_id);
    if (!$order) return ['applied' => false, 'reason' => 'Order not found'];
    if ($operation === 'update' && !empty($command['data']['status'])) {
        $order->update_status($command['data']['status'], 'Updated by Syncly backend');
        syncly_add_suppression_marker('order', $external_id);
        return ['applied' => true];
    }
    return ['skipped' => true, 'reason' => 'No valid order action'];
}

function syncly_apply_customer_command($command) {
    $external_id = (int) ($command['external_id'] ?? 0);
    $data = $command['data'] ?? [];
    if ($external_id <= 0) return ['applied' => false, 'reason' => 'Missing external customer id'];
    $user = get_user_by('id', $external_id);
    if (!$user) return ['applied' => false, 'reason' => 'Customer not found'];
    wp_update_user([
        'ID' => $external_id,
        'first_name' => $data['first_name'] ?? get_user_meta($external_id, 'first_name', true),
        'last_name' => $data['last_name'] ?? get_user_meta($external_id, 'last_name', true),
        'user_email' => $data['email'] ?? $user->user_email
    ]);
    syncly_add_suppression_marker('customer', $external_id);
    return ['applied' => true];
}

function syncly_handle_backend_command(WP_REST_Request $request) {
    $command = $request->get_json_params();
    $entity = $command['entity'] ?? '';
    if ($entity === 'product') $result = syncly_apply_product_command($command);
    elseif ($entity === 'order') $result = syncly_apply_order_command($command);
    elseif ($entity === 'customer') $result = syncly_apply_customer_command($command);
    else $result = ['failed' => true, 'reason' => 'Unsupported entity'];
    return rest_ensure_response($result);
}

add_action('rest_api_init', function() {
    register_rest_route('syncly/v1', '/commands', [
        'methods' => 'POST',
        'callback' => 'syncly_handle_backend_command',
        'permission_callback' => 'syncly_verify_command_request'
    ]);
});

