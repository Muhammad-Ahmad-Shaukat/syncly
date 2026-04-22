<?php

if (!defined('ABSPATH')) exit;

function syncly_admin_page() {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }

    $state = syncly_get_connector_state();
    $connected = !empty($state['access_token']) && !empty($state['store_id']);
    $notice = '';
    $notice_class = 'notice-info';

    if (isset($_POST['syncly_action']) && check_admin_referer('syncly_admin_action', 'syncly_nonce')) {
        $action = sanitize_text_field($_POST['syncly_action']);
        if ($action === 'connect') {
            $email = sanitize_email($_POST['syncly_email'] ?? '');
            $password = sanitize_text_field($_POST['syncly_password'] ?? '');
            $callback = rest_url('syncly/v1');
            $result = syncly_api_exchange_connector($email, $password, $callback);

            if (!empty($result['success']) && !empty($result['data']['access_token'])) {
                syncly_save_connector_state($result['data']);
                $notice = 'Store connected successfully.';
                $notice_class = 'notice-success';
                $connected = true;
                $state = syncly_get_connector_state();
            } else {
                $notice = $result['error'] ?? 'Failed to connect store.';
                $notice_class = 'notice-error';
            }
        } elseif ($action === 'disconnect') {
            syncly_clear_connector_state();
            $notice = 'Store disconnected.';
            $notice_class = 'notice-warning';
            $connected = false;
            $state = syncly_get_connector_state();
        } elseif ($action === 'initial_sync') {
            $result = syncly_run_initial_sync();
            if (!empty($result['success'])) {
                $notice = 'Initial sync completed and batches queued.';
                $notice_class = 'notice-success';
            } else {
                $notice = $result['error'] ?? 'Initial sync failed.';
                $notice_class = 'notice-error';
            }
        } elseif ($action === 'run_queue') {
            syncly_run_dispatch_queue();
            $notice = 'Delta queue dispatch attempted.';
            $notice_class = 'notice-info';
        }
    }

    echo '<div class="wrap">';
    echo '<h1>Syncly WooCommerce</h1>';
    if (!empty($notice)) {
        echo '<div class="notice ' . esc_attr($notice_class) . '"><p>' . esc_html($notice) . '</p></div>';
    }

    if (!$connected) {
        echo "<h2>Welcome to Syncly</h2>";
        echo "<p>Connect your store to manage products, orders & inventory.</p>";
        echo '<form method="post">';
        wp_nonce_field('syncly_admin_action', 'syncly_nonce');
        echo '<input type="hidden" name="syncly_action" value="connect" />';
        echo '<input type="text" name="syncly_email" placeholder="Email" required style="width:300px;"><br><br>';
        echo '<input type="password" name="syncly_password" placeholder="Password" required style="width:300px;"><br><br>';
        echo '<button type="submit" class="button button-primary">Login & Connect</button>';
        echo '</form>';
    } else {
        echo "<h2>Store Connected</h2>";
        echo "<p>Your WooCommerce store is linked with Syncly.</p>";
        echo '<p><strong>Store ID:</strong> ' . esc_html((string) $state['store_id']) . '</p>';
        echo '<p><strong>Connected At:</strong> ' . esc_html((string) $state['connected_at']) . '</p>';
        echo '<p><strong>Token Expires At:</strong> ' . esc_html((string) $state['access_expires_at']) . '</p>';
        $diagnostics = syncly_api_get_diagnostics($state['store_id']);
        if (!empty($diagnostics['success']) && !empty($diagnostics['data'])) {
            $d = $diagnostics['data'];
            echo '<h3>Backend Diagnostics</h3>';
            echo '<p>Events: ' . esc_html((string) ($d['total_events'] ?? 0)) . ' | Failed Jobs: ' . esc_html((string) ($d['failed_jobs'] ?? 0)) . ' | Dead Letters: ' . esc_html((string) ($d['dead_letters'] ?? 0)) . '</p>';
        }

        $last = get_option(SYNCLY_OPTION_LAST_SYNC_STATUS, []);
        if (is_array($last) && !empty($last)) {
            echo '<h3>Last Queue Dispatch</h3>';
            echo '<p>Time: ' . esc_html((string) ($last['time'] ?? '-')) . ' | Processed: ' . esc_html((string) ($last['processed'] ?? 0)) . ' | Success: ' . esc_html((string) ($last['ok'] ?? 0)) . ' | Failed: ' . esc_html((string) ($last['failed'] ?? 0)) . '</p>';
        }

        echo '<form method="post" style="display:inline-block;margin-right:8px;">';
        wp_nonce_field('syncly_admin_action', 'syncly_nonce');
        echo '<input type="hidden" name="syncly_action" value="initial_sync" />';
        echo '<button type="submit" class="button button-primary">Run Initial Sync</button>';
        echo '</form>';

        echo '<form method="post" style="display:inline-block;margin-right:8px;">';
        wp_nonce_field('syncly_admin_action', 'syncly_nonce');
        echo '<input type="hidden" name="syncly_action" value="run_queue" />';
        echo '<button type="submit" class="button">Dispatch Delta Queue</button>';
        echo '</form>';

        echo '<form method="post" style="display:inline-block;">';
        wp_nonce_field('syncly_admin_action', 'syncly_nonce');
        echo '<input type="hidden" name="syncly_action" value="disconnect" />';
        echo '<button type="submit" class="button">Disconnect Store</button>';
        echo '</form>';
    }

    echo '</div>';
}