<?php

if (!defined('ABSPATH')) exit;

require_once __DIR__ . '/api-client.php';

/**
 * Login against POST /api/users/login (same contract as syncly_api_login).
 * On success the API returns { success, message, data: user, token }; JWT expires in 90 days.
 *
 * @return array{token: string}|array{error: string}
 */
function syncly_login_user($email, $password) {

    $login_url = syncly_login_endpoint_url();
    if ($login_url === '') {
        return ['error' => 'API URL not set'];
    }

    $response = wp_remote_post($login_url, [
        'body' => wp_json_encode([
            'email' => $email,
            'password' => $password,
            'store_url' => home_url(),
        ]),
        'headers' => [
            'Content-Type' => 'application/json',
        ],
        'timeout' => 15,
    ]);

    if (is_wp_error($response)) {
        return ['error' => 'Connection failed'];
    }

    $raw = wp_remote_retrieve_body($response);
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        return ['error' => 'Invalid response'];
    }

    if (!empty($body['success']) && !empty($body['token'])) {
        update_option('syncly_token', $body['token']);
        return ['token' => $body['token']];
    }

    if (!empty($body['error'])) {
        $err = $body['error'];
        return ['error' => is_string($err) ? $err : 'Login failed'];
    }

    return ['error' => 'Invalid credentials'];
}
