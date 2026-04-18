<?php
/**
 * Plugin Name: Syncly
 * Version: 0.1.0
 * Author: The WordPress Contributors
 * Author URI: https://woocommerce.com
 * Text Domain: syncly
 * Domain Path: /languages
 *
 * License: GNU General Public License v3.0
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 *
 * @package extension
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'SYNCLY_MAIN_PLUGIN_FILE' ) ) {
	define( 'SYNCLY_MAIN_PLUGIN_FILE', __FILE__ );
}

require_once plugin_dir_path( __FILE__ ) . '/vendor/autoload_packages.php';

use Syncly\Admin\Setup;

// phpcs:disable WordPress.Files.FileName

/**
 * WooCommerce fallback notice.
 *
 * @since 0.1.0
 */
function syncly_missing_wc_notice() {
	/* translators: %s WC download URL link. */
	echo '<div class="error"><p><strong>' . sprintf( esc_html__( 'Syncly requires WooCommerce to be installed and active. You can download %s here.', 'syncly' ), '<a href="https://woocommerce.com/" target="_blank">WooCommerce</a>' ) . '</strong></p></div>';
}

register_activation_hook( __FILE__, 'syncly_activate' );

/**
 * Activation hook.
 *
 * @since 0.1.0
 */
function syncly_activate() {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', 'syncly_missing_wc_notice' );
		return;
	}
}

if ( ! class_exists( 'Syncly' ) ) :
	/**
	 * The Syncly class.
	 */
	class Syncly {
		/**
		 * This class instance.
		 *
		 * @var \Syncly single instance of this class.
		 */
		private static $instance;

		/**
		 * Constructor.
		 */
		public function __construct() {
			if ( is_admin() ) {
				new Setup();
			}
		}

		/**
		 * Cloning is forbidden.
		 */
		public function __clone() {
			wc_doing_it_wrong( __FUNCTION__, __( 'Cloning is forbidden.', 'syncly' ), $this->version );
		}

		/**
		 * Unserializing instances of this class is forbidden.
		 */
		public function __wakeup() {
			wc_doing_it_wrong( __FUNCTION__, __( 'Unserializing instances of this class is forbidden.', 'syncly' ), $this->version );
		}

		/**
		 * Gets the main instance.
		 *
		 * Ensures only one instance can be loaded.
		 *
		 * @return \syncly
		 */
		public static function instance() {

			if ( null === self::$instance ) {
				self::$instance = new self();
			}

			return self::$instance;
		}
	}
endif;

add_action( 'plugins_loaded', 'syncly_init', 10 );

/**
 * Initialize the plugin.
 *
 * @since 0.1.0
 */
function syncly_init() {
	load_plugin_textdomain( 'syncly', false, plugin_basename( dirname( __FILE__ ) ) . '/languages' );

	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', 'syncly_missing_wc_notice' );
		return;
	}

	Syncly::instance();
}
