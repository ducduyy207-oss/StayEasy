let currentRoom = null;
let discountPercent = 0; // Lưu tỷ lệ giảm giá (vd: 0.15 là 15%)

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

$(document).ready(function () {
   // 1. Lấy tham số id từ URL
   const urlParams = new URLSearchParams(window.location.search);
   const roomId = urlParams.get('id');

   // Hỗ trợ điền sẵn ngày nếu khách chuyển sang từ trang chủ
   const urlIn = urlParams.get('in');
   const urlOut = urlParams.get('out');
   if (urlIn) $('#cIn').val(urlIn);
   if (urlOut) $('#cOut').val(urlOut);

   if (roomId) {
      loadRoomDetail(roomId);
   } else {
      alert("Không tìm thấy thông tin phòng!");
      window.location.href = 'index.html';
   }

   initDateValidation();

   // Sự kiện bấm nút áp dụng mã giảm giá
   $('#btnApplyPromo').on('click', applyPromoCode);

   // Sự kiện thay đổi ngày tháng thì tính lại giá
   $('.calc-date').on('change', calculatePrice);
});

// 2. Tải thông tin chi tiết phòng
async function loadRoomDetail(id) {
   try {
      const rooms = await API.getRooms();
      currentRoom = rooms.find(r => r.id == id);

      if (currentRoom) {
         // Đổ dữ liệu vào giao diện
         $('#breadCrumbName').text(currentRoom.name);
         $('#dtlMainImg').attr('src', currentRoom.image);
         $('#dtlType').text(currentRoom.type);
         $('#dtlName').text(currentRoom.name);
         $('#dtlDesc').text(currentRoom.description);
         $('#dtlGuests').text(currentRoom.guests);
         $('#dtlPrice').text(formatVND(currentRoom.price));

         $('#loadingDetail').hide();
         $('#detailContent').fadeIn(400);

         // Tính tiền ngay nếu đã có ngày sẵn
         calculatePrice();
      } else {
         alert("Phòng không tồn tại!");
         window.location.href = 'index.html';
      }
   } catch (error) {
      alert("Lỗi tải dữ liệu chi tiết!");
   }
}

// 3. Ràng buộc ngày trả phòng phải sau ngày nhận phòng
function initDateValidation() {
   const today = new Date().toISOString().split('T')[0];
   $('#cIn').attr('min', today);

   $('#cIn').on('change', function () {
      const checkInDate = new Date($(this).val());
      if (!isNaN(checkInDate.getTime())) {
         checkInDate.setDate(checkInDate.getDate() + 1);
         const minOut = checkInDate.toISOString().split('T')[0];
         $('#cOut').attr('min', minOut);

         if ($('#cOut').val() && $('#cOut').val() < minOut) {
            $('#cOut').val('');
            $('#priceSummary').slideUp();
         }
      }
   });
}

// 4. Logic tính toán giá tiền & mã giảm giá
function calculatePrice() {
   const inVal = $('#cIn').val();
   const outVal = $('#cOut').val();

   if (inVal && outVal && currentRoom) {
      const d1 = new Date(inVal);
      const d2 = new Date(outVal);

      if (d2 > d1) {
         const nights = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
         const originalTotal = nights * currentRoom.price;
         const discountAmount = originalTotal * discountPercent;
         const finalTotal = originalTotal - discountAmount;

         $('#totalNights').text(nights + ' đêm');

         // Xử lý hiển thị khi có/không có giảm giá
         if (discountPercent > 0) {
            $('#originalPriceDisplay').html(`<del class="text-muted small">${formatVND(originalTotal)}</del>`);
            $('#discountDisplay').text(`- ${formatVND(discountAmount)}`).parent().attr('style', 'display: flex !important;');
         } else {
            $('#originalPriceDisplay').empty();
            $('#discountDisplay').parent().attr('style', 'display: none !important;');
         }

         $('#totalPriceDisplay').text(formatVND(finalTotal));
         $('#priceSummary').slideDown(300);
         return finalTotal;
      }
   }
   $('#priceSummary').slideUp();
   return 0;
}

function applyPromoCode() {
   const code = $('#promoCode').val().trim().toUpperCase();

   if (code === 'STAYEASY15') {
      discountPercent = 0.15;
      alert('🎉 Mã giảm giá 15% đã được áp dụng!');
   } else if (code === 'SUMMER2026') {
      discountPercent = 0.20;
      alert('🎉 Mã giảm giá hè 20% đã được áp dụng!');
   } else {
      discountPercent = 0;
      alert('❌ Mã không hợp lệ!');
   }
   calculatePrice();
}

// 5. Gửi đơn đặt phòng
$('#bookingForm').on('submit', async function (e) {
   e.preventDefault();

   const finalPrice = calculatePrice();
   if (finalPrice <= 0) {
      alert('Vui lòng chọn ngày lưu trú hợp lệ!');
      return;
   }

   const btn = $('#btnSubmit');
   btn.prop('disabled', true).text('Đang gửi...');

   const payload = {
      roomId: currentRoom.id,
      roomName: currentRoom.name,
      customerName: $('#cName').val(),
      customerPhone: $('#cPhone').val(),
      checkIn: $('#cIn').val(),
      checkOut: $('#cOut').val(),
      totalPrice: finalPrice,
      status: "Pending"
   };

   try {
      await API.createBooking(payload);
      alert('✅ Đặt phòng thành công! Chúng tôi sẽ sớm liên hệ.');
      window.location.href = 'index.html';
   } catch (error) {
      alert('Lỗi khi gửi yêu cầu đặt phòng.');
   } finally {
      btn.prop('disabled', false).text('Yêu Cầu Đặt Phòng');
   }
});