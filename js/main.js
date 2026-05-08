let roomsData = [];

function renderRooms(rooms) {
   let html = "";
   for (let room of rooms) {
      html += `
            <div class="col-md-4 col-sm-6">
                <div class="card room-card h-100">
                    <div class="position-relative">
                        <img src="${room.image}" class="card-img-top" alt="room">
                        <span class="room-type-badge">${room.type}</span>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-truncate" title="${room.name}">${room.name}</h5>
                        <p class="text-muted small mb-1">👨‍👩‍👧‍👦 Tối đa: ${room.capacity} khách</p>
                        <p class="room-price mt-auto mb-3">${formatCurrency(room.price)} <span class="fs-6 text-dark fw-normal">VND/đêm</span></p>
                        <button class="btn btn-book-now w-100 btn-book" 
                            data-id="${room.id}" data-name="${room.name}" data-price="${room.price}">
                            Chọn phòng này
                        </button>
                    </div>
                </div>
            </div>
        `;
   }
   $('#room-list').html(html);
}

$(document).ready(async function () {
   $('#loading').show();
   roomsData = await fetchRooms();
   renderRooms(roomsData);
   $('#loading').hide();

   // Lọc phòng
   $('#filterType').on('change', function () {
      let type = $(this).val();
      let filtered = type ? roomsData.filter(r => r.type === type) : roomsData;
      renderRooms(filtered);
   });

   // Mở form đặt phòng
   $('#room-list').on('click', '.btn-book', function () {
      $('#roomId').val($(this).data('id'));
      $('#roomPrice').val($(this).data('price'));
      $('#modalRoomName').text($(this).data('name'));

      $('#bookingForm')[0].reset();
      $('#pricePreview').hide();
      $('.text-danger').text("");

      new bootstrap.Modal(document.getElementById('bookingModal')).show();
   });

   // Tính tiền tự động
   $('#checkIn, #checkOut').on('change', function () {
      let inDate = $('#checkIn').val();
      let outDate = $('#checkOut').val();
      let price = $('#roomPrice').val();

      if (inDate && outDate) {
         let nights = calculateNights(inDate, outDate);
         if (nights > 0) {
            $('#nightsCount').text(nights);
            $('#totalPriceCalc').text(formatCurrency(nights * price));
            $('#pricePreview').slideDown();
         } else {
            $('#pricePreview').slideUp();
         }
      }
   });

   // Submit form (Validation)
   $('#bookingForm').on('submit', async function (e) {
      e.preventDefault();
      let name = $('#customerName').val().trim();
      let inDate = $('#checkIn').val();
      let outDate = $('#checkOut').val();
      let isValid = true;

      $('.text-danger').text("");

      if (!name) { $('#nameError').text("Vui lòng nhập tên."); isValid = false; }
      if (!inDate || !outDate) { $('#dateError').text("Chọn ngày đầy đủ."); isValid = false; }
      else if (calculateNights(inDate, outDate) <= 0) { $('#dateError').text("Ngày trả phải sau ngày nhận."); isValid = false; }

      if (isValid) {
         let btn = $(this).find('button[type="submit"]');
         btn.text("Đang xử lý...").prop('disabled', true);

         await createBooking({
            roomId: $('#roomId').val(),
            customerName: name,
            checkIn: inDate,
            checkOut: outDate,
            totalNights: Number($('#nightsCount').text()),
            totalPrice: Number($('#totalPriceCalc').text().replace(/\./g, '')),
            status: "Pending"
         });

         alert("🎉 Đặt phòng thành công! Chúng tôi sẽ liên hệ sớm.");
         bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
         btn.text("Xác nhận đặt phòng").prop('disabled', false);
      }
   });
});