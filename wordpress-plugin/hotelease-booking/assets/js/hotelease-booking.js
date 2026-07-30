(function () {
  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function () {
    // Guest returning from Paystack's hosted checkout page. The webhook (server-to-server)
    // is what actually confirms the booking and sends the email — this is just messaging.
    if (/[?&]reference=/.test(window.location.search)) {
      document.querySelectorAll('.hotelease-form-message').forEach(function (messageEl) {
        messageEl.className = 'hotelease-form-message hotelease-success';
        messageEl.textContent = 'Payment received! We\'re confirming your booking — a confirmation email is on its way shortly.';
      });
    }

    var forms = document.querySelectorAll('.hotelease-booking-form');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var widget = form.closest('.hotelease-booking-widget');
        var roomTypeInput = widget.querySelector('input[name="hotelease_room_type_id"]:checked');
        var messageEl = form.querySelector('.hotelease-form-message');
        var submitBtn = form.querySelector('.hotelease-submit');

        messageEl.textContent = '';
        messageEl.className = 'hotelease-form-message';

        if (!roomTypeInput) {
          messageEl.textContent = 'Please select a room type.';
          messageEl.classList.add('hotelease-error');
          return;
        }

        var data = new FormData(form);
        var payload = {
          action: 'hotelease_booking_submit',
          nonce: window.HotelEaseBooking ? window.HotelEaseBooking.nonce : '',
          room_type_id: roomTypeInput.value,
          check_in_date: data.get('check_in_date'),
          check_out_date: data.get('check_out_date'),
          first_name: data.get('first_name'),
          last_name: data.get('last_name'),
          email: data.get('email'),
          phone: data.get('phone'),
          return_url: window.location.href,
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Booking...';

        fetch(window.HotelEaseBooking.ajaxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(payload).toString(),
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.success && res.data && res.data.payment && res.data.payment.authorization_url) {
              messageEl.classList.add('hotelease-success');
              messageEl.textContent = 'Redirecting you to complete payment…';
              window.location.href = res.data.payment.authorization_url;
              // Leave the button disabled — the page is navigating away.
              return;
            }
            if (res.success) {
              messageEl.classList.add('hotelease-error');
              messageEl.textContent = 'Booking created but payment could not be started. Please contact the hotel.';
            } else {
              messageEl.classList.add('hotelease-error');
              messageEl.textContent = (res.data && res.data.message) || 'Something went wrong. Please try again.';
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Check Availability & Book';
          })
          .catch(function () {
            messageEl.classList.add('hotelease-error');
            messageEl.textContent = 'Network error. Please try again.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Check Availability & Book';
          });
      });
    });
  });
})();
