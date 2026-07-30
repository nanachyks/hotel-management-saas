<?php
if (!defined('ABSPATH')) {
    exit;
}

add_action('admin_menu', function () {
    add_options_page(
        'HotelEase Booking',
        'HotelEase Booking',
        'manage_options',
        'hotelease-booking',
        'hotelease_booking_render_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('hotelease_booking_settings', 'hotelease_api_url', array('sanitize_callback' => 'esc_url_raw'));
    register_setting('hotelease_booking_settings', 'hotelease_api_key', array('sanitize_callback' => 'sanitize_text_field'));
    register_setting('hotelease_booking_settings', 'hotelease_api_secret', array('sanitize_callback' => 'sanitize_text_field'));

    // Room type cache changes whenever the key/URL changes; clear it so the next
    // shortcode render picks up fresh data instead of a stale transient.
    add_action('update_option_hotelease_api_url', function () { delete_transient('hotelease_room_types'); });
    add_action('update_option_hotelease_api_key', function () { delete_transient('hotelease_room_types'); });
});

function hotelease_booking_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $client = new HotelEase_API_Client();
    $connection_status = null;
    if ($client->is_configured()) {
        $result = $client->get_room_types();
        $connection_status = is_wp_error($result)
            ? array('ok' => false, 'message' => $result->get_error_message())
            : array('ok' => true, 'message' => sprintf('Connected — found %d room type(s).', count($result)));
    }
    ?>
    <div class="wrap">
        <h1>HotelEase Booking Settings</h1>
        <p>Connect this site to your HotelEase account. Generate an API key with <strong>read</strong> and <strong>write</strong> permissions from your HotelEase dashboard under <em>API Keys</em>, then paste the values below.</p>

        <?php if ($connection_status): ?>
            <div class="notice <?php echo $connection_status['ok'] ? 'notice-success' : 'notice-error'; ?>" style="padding: 10px 12px;">
                <p><?php echo esc_html($connection_status['message']); ?></p>
            </div>
        <?php endif; ?>

        <form method="post" action="options.php">
            <?php settings_fields('hotelease_booking_settings'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="hotelease_api_url">HotelEase API URL</label></th>
                    <td>
                        <input type="url" id="hotelease_api_url" name="hotelease_api_url" class="regular-text"
                               value="<?php echo esc_attr(get_option('hotelease_api_url', '')); ?>"
                               placeholder="https://your-hotel.example.com" />
                        <p class="description">The base URL of your HotelEase server (no trailing slash, no <code>/api</code> suffix).</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="hotelease_api_key">API Key</label></th>
                    <td>
                        <input type="text" id="hotelease_api_key" name="hotelease_api_key" class="regular-text"
                               value="<?php echo esc_attr(get_option('hotelease_api_key', '')); ?>" />
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="hotelease_api_secret">API Secret</label></th>
                    <td>
                        <input type="password" id="hotelease_api_secret" name="hotelease_api_secret" class="regular-text"
                               value="<?php echo esc_attr(get_option('hotelease_api_secret', '')); ?>" autocomplete="off" />
                        <p class="description">Stored on this server only and sent to HotelEase over HTTPS with every request — it is never sent to visitors' browsers.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>

        <hr />
        <h2>Usage</h2>
        <p>Add the <code>[hotelease_booking]</code> shortcode to any page or post to display room types and a booking form.</p>
    </div>
    <?php
}
