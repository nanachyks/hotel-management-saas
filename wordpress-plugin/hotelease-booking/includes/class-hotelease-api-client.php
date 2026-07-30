<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Thin wrapper around the HotelEase /api/public endpoints.
 * The API key/secret live only in wp_options and are attached server-side
 * (via wp_remote_*) — they never reach the visitor's browser.
 */
class HotelEase_API_Client {

    private $base_url;
    private $api_key;
    private $api_secret;

    public function __construct() {
        $this->base_url   = untrailingslashit(get_option('hotelease_api_url', ''));
        $this->api_key    = get_option('hotelease_api_key', '');
        $this->api_secret = get_option('hotelease_api_secret', '');
    }

    public function is_configured() {
        return $this->base_url && $this->api_key && $this->api_secret;
    }

    private function headers() {
        return array(
            'X-API-Key'    => $this->api_key,
            'X-API-Secret' => $this->api_secret,
            'Content-Type' => 'application/json',
        );
    }

    private function request($method, $path, $args = array()) {
        if (!$this->is_configured()) {
            return new WP_Error('hotelease_not_configured', 'HotelEase Booking is not configured yet. Set the API URL, key, and secret under Settings → HotelEase Booking.');
        }

        $url = $this->base_url . '/api/public' . $path;
        $request_args = array(
            'method'  => $method,
            'headers' => $this->headers(),
            'timeout' => 15,
        );
        if (!empty($args['body'])) {
            $request_args['body'] = wp_json_encode($args['body']);
        }
        if (!empty($args['query'])) {
            $url = add_query_arg($args['query'], $url);
        }

        $response = wp_remote_request($url, $request_args);
        if (is_wp_error($response)) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);

        if ($code < 200 || $code >= 300) {
            $message = isset($data['error']) ? $data['error'] : 'HotelEase API request failed (HTTP ' . $code . ')';
            return new WP_Error('hotelease_api_error', $message, array('status' => $code));
        }

        return $data;
    }

    /** @return array|WP_Error List of { id, name, description, base_price, capacity } */
    public function get_room_types() {
        $cached = get_transient('hotelease_room_types');
        if ($cached !== false) {
            return $cached;
        }
        $result = $this->request('GET', '/room-types');
        if (!is_wp_error($result)) {
            set_transient('hotelease_room_types', $result, 10 * MINUTE_IN_SECONDS);
        }
        return $result;
    }

    /** @return array|WP_Error List of available rooms for the date range */
    public function get_availability($check_in, $check_out, $room_type_id = '') {
        $query = array('check_in' => $check_in, 'check_out' => $check_out);
        if ($room_type_id) {
            $query['room_type_id'] = $room_type_id;
        }
        return $this->request('GET', '/availability', array('query' => $query));
    }

    /** @return array|WP_Error Pending booking + Paystack authorization_url to redirect the guest to */
    public function create_booking($room_type_id, $check_in, $check_out, $guest, $callback_url = '') {
        $body = array(
            'room_type_id'   => $room_type_id,
            'check_in_date'  => $check_in,
            'check_out_date' => $check_out,
            'guest'          => $guest,
        );
        if ($callback_url) {
            $body['callback_url'] = $callback_url;
        }
        return $this->request('POST', '/bookings', array('body' => $body));
    }
}
