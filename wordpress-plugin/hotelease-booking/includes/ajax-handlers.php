<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Handles the booking form submission. Open to logged-out visitors
 * (nopriv) since this is a public-facing booking widget; protected by
 * a nonce plus the usual HotelEase API-key auth on the server side.
 */
function hotelease_booking_handle_submit() {
    check_ajax_referer('hotelease_booking_nonce', 'nonce');

    $room_type_id = isset($_POST['room_type_id']) ? sanitize_text_field(wp_unslash($_POST['room_type_id'])) : '';
    $check_in     = isset($_POST['check_in_date']) ? sanitize_text_field(wp_unslash($_POST['check_in_date'])) : '';
    $check_out    = isset($_POST['check_out_date']) ? sanitize_text_field(wp_unslash($_POST['check_out_date'])) : '';
    $first_name   = isset($_POST['first_name']) ? sanitize_text_field(wp_unslash($_POST['first_name'])) : '';
    $last_name    = isset($_POST['last_name']) ? sanitize_text_field(wp_unslash($_POST['last_name'])) : '';
    $email        = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
    $phone        = isset($_POST['phone']) ? sanitize_text_field(wp_unslash($_POST['phone'])) : '';

    if (!$room_type_id || !$check_in || !$check_out || !$first_name || !$last_name || !$email || !$phone) {
        wp_send_json_error(array('message' => 'Please fill in all fields.'), 400);
    }
    if (!is_email($email)) {
        wp_send_json_error(array('message' => 'Please enter a valid email address.'), 400);
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $check_in) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $check_out)) {
        wp_send_json_error(array('message' => 'Invalid date format.'), 400);
    }

    $client = new HotelEase_API_Client();

    $availability = $client->get_availability($check_in, $check_out, $room_type_id);
    if (is_wp_error($availability)) {
        wp_send_json_error(array('message' => $availability->get_error_message()), 502);
    }
    if (empty($availability)) {
        wp_send_json_error(array('message' => 'Sorry, no rooms of that type are available for the selected dates.'), 409);
    }

    $result = $client->create_booking($room_type_id, $check_in, $check_out, array(
        'first_name' => $first_name,
        'last_name'  => $last_name,
        'email'      => $email,
        'phone'      => $phone,
    ));

    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()), 502);
    }

    wp_send_json_success($result);
}
add_action('wp_ajax_hotelease_booking_submit', 'hotelease_booking_handle_submit');
add_action('wp_ajax_nopriv_hotelease_booking_submit', 'hotelease_booking_handle_submit');
