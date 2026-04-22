<?php

if (!defined('ABSPATH')) exit;

function syncly_get_connector_state() {
    return [
        'store_id' => (int) get_option('syncly_store_id', 0),
        'access_token' => (string) get_option('syncly_access_token', ''),
        'refresh_token' => (string) get_option('syncly_refresh_token', ''),
        'access_expires_at' => (string) get_option('syncly_access_expires_at', ''),
        'webhook_secret' => (string) get_option('syncly_webhook_secret', ''),
        'connected_at' => (string) get_option('syncly_connected_at', ''),
    ];
}

function syncly_save_connector_state($data) {
    update_option('syncly_store_id', (int) ($data['store_id'] ?? 0));
    update_option('syncly_access_token', (string) ($data['access_token'] ?? ''));
    update_option('syncly_refresh_token', (string) ($data['refresh_token'] ?? ''));
    update_option('syncly_access_expires_at', (string) ($data['access_expires_at'] ?? ''));
    update_option('syncly_webhook_secret', (string) ($data['webhook_secret'] ?? ''));
    update_option('syncly_connected_at', current_time('mysql'));
}

function syncly_clear_connector_state() {
    delete_option('syncly_store_id');
    delete_option('syncly_access_token');
    delete_option('syncly_refresh_token');
    delete_option('syncly_access_expires_at');
    delete_option('syncly_webhook_secret');
    delete_option('syncly_connected_at');
}

function syncly_get_valid_access_token() {
    $state = syncly_get_connector_state();
    if (!empty($state['access_token']) && !empty($state['access_expires_at'])) {
        $expires = strtotime($state['access_expires_at']);
        if ($expires && $expires > (time() + 60)) {
            return $state['access_token'];
        }
    }

    if (!empty($state['store_id']) && !empty($state['refresh_token'])) {
        $refresh = syncly_api_refresh_connector($state['store_id'], $state['refresh_token']);
        if (!empty($refresh['success']) && !empty($refresh['data']['access_token'])) {
            update_option('syncly_access_token', $refresh['data']['access_token']);
            update_option('syncly_access_expires_at', $refresh['data']['access_expires_at'] ?? '');
            return $refresh['data']['access_token'];
        }
    }
    return '';
}

