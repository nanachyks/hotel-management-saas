=== HotelEase Booking ===
Contributors: hotelease
Tags: hotel, booking, reservations
Requires at least: 5.8
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Show your HotelEase room types and take live bookings directly from WordPress.

== Description ==

This plugin connects your WordPress site to your HotelEase account via a
read/write API key. It adds a `[hotelease_booking]` shortcode that renders
your room types and a booking form; submissions are checked for
availability and create a real booking (plus a confirmation email) in
your HotelEase dashboard.

Your API key and secret are stored on the WordPress server and are only
ever sent from server to server — they are never exposed to site visitors.

== Installation ==

1. Upload the `hotelease-booking` folder to `/wp-content/plugins/`.
2. Activate the plugin through the "Plugins" menu in WordPress.
3. In your HotelEase dashboard, go to API Keys and create a new key with
   `read` and `write` permissions.
4. In WordPress, go to Settings → HotelEase Booking and enter your
   HotelEase server URL, the API key, and the API secret.
5. Add `[hotelease_booking]` to any page or post.

== Changelog ==

= 1.0.0 =
* Initial release: room type display, availability check, and booking
  creation via the HotelEase public API.
