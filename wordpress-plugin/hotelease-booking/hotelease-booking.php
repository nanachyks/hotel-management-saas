<?php
/**
 * Plugin Name: HotelEase Booking
 * Description: Show room types and take live bookings from your WordPress site, backed by your HotelEase account.
 * Version: 1.0.0
 * Author: HotelEase
 * License: GPL-2.0-or-later
 * Text Domain: hotelease-booking
 */

if (!defined('ABSPATH')) {
    exit;
}

define('HOTELEASE_BOOKING_VERSION', '1.0.0');
define('HOTELEASE_BOOKING_PATH', plugin_dir_path(__FILE__));
define('HOTELEASE_BOOKING_URL', plugin_dir_url(__FILE__));

require_once HOTELEASE_BOOKING_PATH . 'includes/class-hotelease-api-client.php';
require_once HOTELEASE_BOOKING_PATH . 'includes/settings-page.php';
require_once HOTELEASE_BOOKING_PATH . 'includes/shortcode.php';
require_once HOTELEASE_BOOKING_PATH . 'includes/ajax-handlers.php';

register_activation_hook(__FILE__, function () {
    add_option('hotelease_api_url', '');
    add_option('hotelease_api_key', '');
    add_option('hotelease_api_secret', '');
});
