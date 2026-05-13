<?php

if (!defined('ABSPATH')) {
    exit;
}

class Syncly_Woo_Admin
{
    private static $instance = null;

    public static function instance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        add_action('admin_menu', [$this, 'menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('add_meta_boxes', [$this, 'product_metabox']);
    }

    public function menu()
    {
        add_menu_page(
            __('Syncly', 'syncly'),
            __('Syncly', 'syncly'),
            'manage_woocommerce',
            'syncly',
            [$this, 'render_page'],
            'dashicons-update',
            56
        );
    }

    public function register_settings()
    {
        register_setting('syncly', 'syncly_api_url', ['type' => 'string', 'sanitize_callback' => 'esc_url_raw']);
        register_setting('syncly', 'syncly_connector_email', ['type' => 'string', 'sanitize_callback' => 'sanitize_email']);
        register_setting('syncly', 'syncly_connector_password', ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field']);
    }

    public function render_page()
    {
        if (!current_user_can('manage_woocommerce')) {
            return;
        }
        $url = esc_attr(get_option('syncly_api_url', ''));
        echo '<div class="wrap"><h1>Syncly</h1>';
        echo '<p>' . esc_html__('Point this site at your Syncly Node API and connector credentials (same as Laravel Shopify app).', 'syncly') . '</p>';
        echo '<form method="post" action="options.php">';
        settings_fields('syncly');
        echo '<table class="form-table"><tr><th>API base URL</th><td><input type="url" name="syncly_api_url" value="' . $url . '" class="regular-text" placeholder="https://your-api.example.com" /></td></tr>';
        echo '<tr><th>Connector email</th><td><input type="email" name="syncly_connector_email" value="' . esc_attr(get_option('syncly_connector_email', '')) . '" class="regular-text" /></td></tr>';
        echo '<tr><th>Connector password</th><td><input type="password" name="syncly_connector_password" value="" class="regular-text" autocomplete="new-password" placeholder="Leave blank to keep current" /></td></tr></table>';
        submit_button();
        echo '</form></div>';
    }

    public function product_metabox()
    {
        add_meta_box(
            'syncly_product',
            __('Syncly', 'syncly'),
            [$this, 'render_product_metabox'],
            'product',
            'side',
            'default'
        );
    }

    public function render_product_metabox($post)
    {
        $meta = get_post_meta($post->ID, '_syncly_public_id', true);
        echo '<p><strong>' . esc_html__('Syncly ID', 'syncly') . '</strong><br />';
        echo esc_html($meta ? $meta : '—');
        echo '</p>';
        echo '<p class="description">' . esc_html__('Set after successful connector sync.', 'syncly') . '</p>';
    }
}
