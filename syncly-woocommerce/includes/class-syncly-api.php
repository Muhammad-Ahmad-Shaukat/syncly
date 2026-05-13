<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Minimal API helper — extend with signed webhook posts to your backend as needed.
 */
class Syncly_Woo_Api
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
        add_action('woocommerce_update_product', [$this, 'on_product_save'], 20, 1);
    }

    public function on_product_save($product_id)
    {
        // Placeholder: push webhook to Syncly when REST routes are wired.
        do_action('syncly_product_updated', $product_id);
    }
}
