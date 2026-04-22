<?php

if (!defined('ABSPATH')) exit;

const SYNCLY_OPTION_SYNC_QUEUE = 'syncly_sync_queue';
const SYNCLY_OPTION_LAST_SYNC_STATUS = 'syncly_last_sync_status';
const SYNCLY_OPTION_SUPPRESSION = 'syncly_suppressed_events';

function syncly_build_idempotency_key($entity, $operation, $external_id) {
    return sha1($entity . ':' . $operation . ':' . $external_id . ':' . microtime(true));
}

function syncly_enqueue_event($payload) {
    $queue = get_option(SYNCLY_OPTION_SYNC_QUEUE, []);
    if (!is_array($queue)) $queue = [];
    $queue[] = $payload;
    update_option(SYNCLY_OPTION_SYNC_QUEUE, $queue, false);
}

function syncly_dequeue_events($limit = 10) {
    $queue = get_option(SYNCLY_OPTION_SYNC_QUEUE, []);
    if (!is_array($queue) || empty($queue)) return [];
    $slice = array_slice($queue, 0, $limit);
    $rest = array_slice($queue, $limit);
    update_option(SYNCLY_OPTION_SYNC_QUEUE, $rest, false);
    return $slice;
}

function syncly_add_suppression_marker($entity, $external_id) {
    $markers = get_option(SYNCLY_OPTION_SUPPRESSION, []);
    if (!is_array($markers)) $markers = [];
    $markers[$entity . ':' . $external_id] = time() + 60;
    update_option(SYNCLY_OPTION_SUPPRESSION, $markers, false);
}

function syncly_should_suppress_event($entity, $external_id) {
    $markers = get_option(SYNCLY_OPTION_SUPPRESSION, []);
    if (!is_array($markers)) return false;
    $key = $entity . ':' . $external_id;
    if (empty($markers[$key])) return false;
    if ((int) $markers[$key] < time()) {
        unset($markers[$key]);
        update_option(SYNCLY_OPTION_SUPPRESSION, $markers, false);
        return false;
    }
    return true;
}

function syncly_send_delta_to_backend($event) {
    $token = syncly_get_valid_access_token();
    if (!$token) return ['success' => false, 'error' => 'No valid connector token'];

    return syncly_api_request('POST', 'api/connectors/woocommerce/sync/delta', [
        'entity' => $event['entity'],
        'operation' => $event['operation'],
        'external_id' => $event['external_id'],
        'origin' => 'woocommerce',
        'idempotency_key' => $event['idempotency_key'],
        'data' => $event['data'],
    ], $token);
}

function syncly_run_dispatch_queue() {
    $events = syncly_dequeue_events(20);
    if (empty($events)) return;

    $ok = 0;
    $failed = 0;
    foreach ($events as $event) {
        $result = syncly_send_delta_to_backend($event);
        if (!empty($result['success'])) {
            $ok++;
        } else {
            $failed++;
            syncly_enqueue_event($event);
        }
    }
    update_option(SYNCLY_OPTION_LAST_SYNC_STATUS, [
        'time' => current_time('mysql'),
        'processed' => count($events),
        'ok' => $ok,
        'failed' => $failed
    ], false);
}

function syncly_collect_initial_batch($entity, $page = 1, $per_page = 50) {
    if ($entity === 'product') {
        $items = wc_get_products(['limit' => $per_page, 'page' => $page, 'status' => ['publish', 'draft', 'private']]);
        return array_map(function($product) {
            return [
                'id' => $product->get_id(),
                'title' => $product->get_name(),
                'status' => $product->get_status(),
                'price' => $product->get_price(),
                'inventory_quantity' => $product->get_stock_quantity(),
                'sku' => $product->get_sku(),
                'updated_at' => $product->get_date_modified() ? $product->get_date_modified()->date('c') : gmdate('c')
            ];
        }, $items);
    }
    if ($entity === 'order') {
        $orders = wc_get_orders(['limit' => $per_page, 'paged' => $page]);
        return array_map(function($order) {
            return [
                'id' => $order->get_id(),
                'order_number' => $order->get_order_number(),
                'status' => $order->get_status(),
                'currency' => $order->get_currency(),
                'total_amount' => $order->get_total(),
                'updated_at' => $order->get_date_modified() ? $order->get_date_modified()->date('c') : gmdate('c')
            ];
        }, $orders);
    }
    if ($entity === 'customer') {
        $users = get_users(['number' => $per_page, 'paged' => $page, 'role__in' => ['customer']]);
        return array_map(function($user) {
            return [
                'id' => $user->ID,
                'email' => $user->user_email,
                'first_name' => get_user_meta($user->ID, 'first_name', true),
                'last_name' => get_user_meta($user->ID, 'last_name', true),
                'status' => 'active',
                'updated_at' => gmdate('c')
            ];
        }, $users);
    }
    return [];
}

function syncly_run_initial_sync() {
    $token = syncly_get_valid_access_token();
    if (!$token) {
        return ['success' => false, 'error' => 'No valid connector token'];
    }

    $entities = ['product', 'order', 'customer'];
    foreach ($entities as $entity) {
        $page = 1;
        while (true) {
            $records = syncly_collect_initial_batch($entity, $page, 50);
            if (empty($records)) break;
            $result = syncly_api_request('POST', 'api/connectors/woocommerce/sync/batch', [
                'entity' => $entity,
                'records' => $records,
                'origin' => 'woocommerce',
                'run_type' => 'initial'
            ], $token);
            if (empty($result['success'])) {
                return ['success' => false, 'error' => $result['error'] ?? 'Initial sync failed'];
            }
            if (count($records) < 50) break;
            $page++;
        }
    }

    update_option('syncly_initial_sync_completed_at', current_time('mysql'));
    return ['success' => true];
}

