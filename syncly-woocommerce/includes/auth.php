<?php

function syncly_login_user($email, $password) {

    $response = wp_remote_post($_ENV['SYNCLY_API_URL'] . '/users/login', [
        'body' => json_encode([
            'email' => $email,
            'password' => $password,
            'store_url' => home_url()
        ]),
        'headers' => [
            'Content-Type' => 'application/json'
        ]
    ]);

    if (is_wp_error($response)) {
        echo "<p style='color:red'>Connection failed</p>";
        return;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (isset($body['token'])) {
        update_option('syncly_token', $body['token']);
        update_option('syncly_store_id', $body['store_id']);
        echo "<script>location.reload();</script>";
    } else {
        echo "<p style='color:red'>Invalid credentials</p>";
    }
}