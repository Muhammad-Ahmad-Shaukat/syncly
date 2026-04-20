<?php
/**
 * Plugin Name: Syncly WooCommerce Connector
 */

if (!defined('ABSPATH')) exit;

define('SYNCLY_PATH', plugin_dir_path(__FILE__));

require_once SYNCLY_PATH . 'includes/admin-page.php';
require_once SYNCLY_PATH . 'includes/auth.php';

add_action('admin_menu', function () {
    add_menu_page(
        'Syncly',
        'Syncly',
        'manage_options',
        'syncly',
        'syncly_admin_page'
    );
});