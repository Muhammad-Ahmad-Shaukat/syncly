<?php

if (!defined('ABSPATH')) exit;

/**
 * Base URL for Syncly API (no trailing slash). From wp-config constant, .env, or getenv.
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
 * Full URL for POST .../api/users/login (supports base ending with /api or host-only).
 */
function syncly_login_endpoint_url() {
    $base = syncly_get_api_base();
    if ($base === '') {
        return '';
    }
    $len = strlen($base);
    if ($len >= 4 && substr($base, -4) === '/api') {
        return $base . '/users/login';
    }
    return $base . '/api/users/login';
}

/**
 * Login request to Syncly backend
 */
function syncly_api_login($email, $password) {

    $login_url = syncly_login_endpoint_url();
    if (!$login_url) {
        return ['error' => 'API URL not set'];
    }

    $response = wp_remote_post($login_url, [
        'body' => wp_json_encode([
            'email' => $email,
            'password' => $password,
            'store_url' => home_url()
        ]),
        'headers' => [
            'Content-Type' => 'application/json'
        ],
        'timeout' => 15
    ]);

    if (is_wp_error($response)) {
        return ['error' => 'Connection failed'];
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    return $body;
}