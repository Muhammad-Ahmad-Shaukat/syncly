<?php

if (!defined('ABSPATH')) exit;

/**
 * Base URL for Syncly API (no trailing slash).
 */
function syncly_get_api_base() {
    if (defined('SYNCLY_API_URL') && SYNCLY_API_URL) {
        return rtrim((string) SYNCLY_API_URL, '/');
    }
    if (isset($_ENV['SYNCLY_API_URL']) && $_ENV['SYNCLY_API_URL'] !== '') {
        return rtrim((string) $_ENV['SYNCLY_API_URL'], '/');
    }
    if (function_exists('getenv')) {
        $g = getenv('SYNCLY_API_URL');
        if ($g !== false && $g !== '') {
            return rtrim((string) $g, '/');
        }
    }
    return '';
}

/**
 * Resolve API endpoint from base.
 */
function syncly_api_url($path) {
    $base = syncly_get_api_base();
    if ($base === '') return '';
    return $base . '/' . ltrim($path, '/');
}

/**
 * Perform JSON API request to Syncly backend.
 */
function syncly_api_request($method, $path, $body = null, $token = '') {
    $url = syncly_api_url($path);
    if (!$url) {
        return ['success' => false, 'error' => 'API URL not set'];
    }

    $headers = ['Content-Type' => 'application/json'];
    if (!empty($token)) {
        $headers['Authorization'] = 'Bearer ' . $token;
    }
    $args = [
        'method' => strtoupper($method),
        'headers' => $headers,
        'timeout' => 15
    ];
    if (!is_null($body)) {
        $args['body'] = wp_json_encode($body);
    }

    $response = wp_remote_request($url, $args);

    if (is_wp_error($response)) {
        return ['success' => false, 'error' => 'Connection failed'];
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($body)) {
        return ['success' => false, 'error' => 'Invalid response'];
    }
    return $body;
}

function syncly_api_exchange_connector($email, $password, $plugin_callback_url) {
    return syncly_api_request('POST', 'api/connectors/woocommerce/auth/exchange', [
        'email' => $email,
        'password' => $password,
        'store_url' => home_url(),
        'store_name' => get_bloginfo('name'),
        'plugin_callback_url' => $plugin_callback_url
    ]);
}

function syncly_api_refresh_connector($store_id, $refresh_token) {
    return syncly_api_request('POST', 'api/connectors/woocommerce/auth/refresh', [
        'store_id' => (int) $store_id,
        'refresh_token' => $refresh_token
    ]);
}

function syncly_api_get_diagnostics($store_id) {
    return syncly_api_request('GET', 'api/connectors/woocommerce/sync/diagnostics/' . (int) $store_id);
}