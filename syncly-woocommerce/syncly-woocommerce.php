<?php
/**
 * Plugin Name: Syncly WooCommerce Connector
 */

if (!defined('ABSPATH')) exit;

define('SYNCLY_PATH', plugin_dir_path(__FILE__));

/**
 * Load Composer (safe)
 */
$autoload = SYNCLY_PATH . 'vendor/autoload.php';
if (file_exists($autoload)) {
    require_once $autoload;
}

/**
 * Load .env safely (optional)
 */
if (file_exists(SYNCLY_PATH . '.env')) {
    if (class_exists('\Dotenv\Dotenv')) {
        $dotenv = Dotenv\Dotenv::createImmutable(SYNCLY_PATH);
        $dotenv->load();
    }
}

/**
 * Expose API base as constant (api-client expects SYNCLY_API_URL; Dotenv only fills $_ENV).
 */
if (!defined('SYNCLY_API_URL')) {
    $syncly_api_url = '';
    if (isset($_ENV['SYNCLY_API_URL'])) {
        $syncly_api_url = (string) $_ENV['SYNCLY_API_URL'];
    } elseif (function_exists('getenv')) {
        $g = getenv('SYNCLY_API_URL');
        $syncly_api_url = $g !== false ? (string) $g : '';
    }
    if ($syncly_api_url !== '') {
        define('SYNCLY_API_URL', rtrim($syncly_api_url, '/'));
    }
}

/**
 * Includes
 */
require_once SYNCLY_PATH . 'includes/api-client.php';
require_once SYNCLY_PATH . 'includes/connector-state.php';
require_once SYNCLY_PATH . 'includes/sync-engine.php';
require_once SYNCLY_PATH . 'includes/rest-endpoints.php';
require_once SYNCLY_PATH . 'includes/event-hooks.php';
require_once SYNCLY_PATH . 'includes/admin-page.php';

/**
 * Admin menu
 */
add_action('admin_menu', function () {
    add_menu_page(
        'Syncly',
        'Syncly',
        'manage_options',
        'syncly',
        'syncly_admin_page',
        'dashicons-update'
    );
});

register_activation_hook(__FILE__, function () {
    if (!wp_next_scheduled('syncly_dispatch_queue_cron')) {
        wp_schedule_event(time() + 60, 'minute', 'syncly_dispatch_queue_cron');
    }
});

register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('syncly_dispatch_queue_cron');
});

add_filter('cron_schedules', function ($schedules) {
    if (!isset($schedules['minute'])) {
        $schedules['minute'] = [
            'interval' => 60,
            'display' => 'Every Minute',
        ];
    }
    return $schedules;
});

add_action('syncly_dispatch_queue_cron', 'syncly_run_dispatch_queue');