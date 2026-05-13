<?php
/**
 * Plugin Name: Syncly Connector
 * Description: Connect WooCommerce to your Syncly backend — inventory and orders stay in sync.
 * Version: 0.1.0
 * Author: Syncly
 * Text Domain: syncly
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SYNCLY_WOO_VERSION', '0.1.0');
define('SYNCLY_WOO_PATH', plugin_dir_path(__FILE__));

require_once SYNCLY_WOO_PATH . 'includes/class-syncly-admin.php';
require_once SYNCLY_WOO_PATH . 'includes/class-syncly-api.php';

add_action('plugins_loaded', function () {
    if (!class_exists('WooCommerce')) {
        return;
    }
    Syncly_Woo_Admin::instance();
    Syncly_Woo_Api::instance();
});

register_activation_hook(__FILE__, function () {
    if (!get_option('syncly_api_url')) {
        add_option('syncly_api_url', 'http://127.0.0.1:3000');
    }
});
