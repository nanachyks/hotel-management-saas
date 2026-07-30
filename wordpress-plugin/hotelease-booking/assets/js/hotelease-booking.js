(function () {
  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function () {
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
            if (res.success) {
              var b = res.data;
              messageEl.classList.add('hotelease-success');
              messageEl.textContent = 'Booked! Room ' + b.room_number + ' (' + b.room_type + '), '
                + b.check_in_date + ' to ' + b.check_out_date + ' — total ' + b.total_amount + '. A confirmation email is on its way.';
              form.reset();
            } else {
              messageEl.classList.add('hotelease-error');
              messageEl.textContent = (res.data && res.data.message) || 'Something went wrong. Please try again.';
            }
          })
          .catch(function () {
            messageEl.classList.add('hotelease-error');
            messageEl.textContent = 'Network error. Please try again.';
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Check Availability & Book';
          });
      });
    });
  });
})();
