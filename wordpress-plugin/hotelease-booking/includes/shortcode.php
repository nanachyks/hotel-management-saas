<?php
if (!defined('ABSPATH')) {
    exit;
}

add_action('wp_enqueue_scripts', function () {
    wp_register_style('hotelease-booking', HOTELEASE_BOOKING_URL . 'assets/css/hotelease-booking.css', array(), HOTELEASE_BOOKING_VERSION);
    wp_register_script('hotelease-booking', HOTELEASE_BOOKING_URL . 'assets/js/hotelease-booking.js', array(), HOTELEASE_BOOKING_VERSION, true);
});

add_shortcode('hotelease_booking', function ($atts) {
    $client = new HotelEase_API_Client();

    if (!$client->is_configured()) {
        if (current_user_can('manage_options')) {
            return '<p class="hotelease-notice hotelease-notice-error">HotelEase Booking is not configured. '
                . '<a href="' . esc_url(admin_url('options-general.php?page=hotelease-booking')) . '">Add your API credentials</a>.</p>';
        }
        return '';
    }

    $room_types = $client->get_room_types();
    if (is_wp_error($room_types)) {
        if (current_user_can('manage_options')) {
            return '<p class="hotelease-notice hotelease-notice-error">Could not load room types: ' . esc_html($room_types->get_error_message()) . '</p>';
        }
        return '<p class="hotelease-notice hotelease-notice-error">Booking is temporarily unavailable. Please try again later.</p>';
    }
    if (empty($room_types)) {
        return '<p class="hotelease-notice">No room types are available for booking right now.</p>';
    }

    wp_enqueue_style('hotelease-booking');
    wp_enqueue_script('hotelease-booking');
    wp_localize_script('hotelease-booking', 'HotelEaseBooking', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('hotelease_booking_nonce'),
    ));

    ob_start();
    ?>
    <div class="hotelease-booking-widget">
        <div class="hotelease-room-types">
            <?php foreach ($room_types as $rt): ?>
                <label class="hotelease-room-type-card">
                    <input type="radio" name="hotelease_room_type_id" value="<?php echo esc_attr($rt['id']); ?>" required />
                    <div class="hotelease-room-type-body">
                        <h3><?php echo esc_html($rt['name']); ?></h3>
                        <p class="hotelease-room-type-desc"><?php echo esc_html($rt['description']); ?></p>
                        <p class="hotelease-room-type-meta">
                            <span class="hotelease-price"><?php echo esc_html(number_format((float) $rt['base_price'], 2)); ?> / night</span>
                            <span class="hotelease-capacity">Sleeps <?php echo esc_html($rt['capacity']); ?></span>
                        </p>
                    </div>
                </label>
            <?php endforeach; ?>
        </div>

        <form class="hotelease-booking-form">
            <div class="hotelease-form-row">
                <label>Check-in<input type="date" name="check_in_date" required /></label>
                <label>Check-out<input type="date" name="check_out_date" required /></label>
            </div>
            <div class="hotelease-form-row">
                <label>First name<input type="text" name="first_name" required /></label>
                <label>Last name<input type="text" name="last_name" required /></label>
            </div>
            <div class="hotelease-form-row">
                <label>Email<input type="email" name="email" required /></label>
                <label>Phone<input type="tel" name="phone" required /></label>
            </div>
            <button type="submit" class="hotelease-submit">Check Availability &amp; Book</button>
            <div class="hotelease-form-message" role="status" aria-live="polite"></div>
        </form>
    </div>
    <?php
    return ob_get_clean();
});
