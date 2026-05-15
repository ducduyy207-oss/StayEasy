let currentRoom = null;
let discountPercent = 0;

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

$(document).ready(function () {
   const urlParams = new URLSearchParams(window.location.search);
   const roomId = urlParams.get('id');

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

   // Gắn sự kiện nút áp dụng khuyến mãi
   $('#btnApplyPromo').on('click', applyPromoCode);

   // Thay đổi ngày tự động tính tiền
   $('.calc-date').on('change', calculatePrice);
});

async function loadRoomDetail(id) {
   try {
      const rooms = await API.getRooms();
      currentRoom = rooms.find(r => r.id == id);

      if (currentRoom) {
         $('#breadCrumbName').text(currentRoom.name);
         $('#dtlMainImg').attr('src', currentRoom.image);
         $('#dtlType').text(currentRoom.type);
         $('#dtlName').text(currentRoom.name);
         $('#dtlDesc').text(currentRoom.description);
         $('#dtlGuests').text(currentRoom.guests);

         const price = Number(currentRoom.price) || 0;
         $('#dtlPrice').text(formatVND(price));
         $('#dtlOldPrice').text(formatVND(price * 1.25));

         generateFakeReviews(); // Gọi hàm tạo bình luận ảo

         $('#loadingDetail').hide();
         $('#detailContent').fadeIn(400);

         calculatePrice();
      } else {
         alert("Phòng không tồn tại!");
         window.location.href = 'index.html';
      }
   } catch (error) {
      alert("Lỗi tải dữ liệu chi tiết!");
   }
}

// HÀM TẠO BÌNH LUẬN ẢO
function generateFakeReviews() {
   const rating = (8.5 + Math.random() * 1.3).toFixed(1);
   const reviewCount = Math.floor(Math.random() * 800) + 150;

   let ratingText = "Tuyệt hảo";
   if (rating < 9.0) ratingText = "Rất tốt";
   if (rating >= 9.5) ratingText = "Xuất sắc";

   $('#dtlRatingNum').text(rating);
   $('#dtlRatingText').text(ratingText);
   $('#dtlReviewCount').text(`Từ ${reviewCount} đánh giá chân thực`);

   const fakeNames = ["Stephen E.", "Mai T.", "Trần Q.", "David L.", "Sophia W.", "Hoàng N."];
   const fakeContents = [
      "Phòng sạch sẽ và được trình bày đẹp. Luôn có nước nóng và nhân viên rất tuyệt vời và rất hữu ích. Đáng giá tiền.",
      "Trải nghiệm thật tuyệt vời khi lưu trú tại đây. Điểm ăn sáng ngon, view nhìn ra trung tâm rất ấn tượng.",
      "Tôi đã có một kỳ nghỉ rất thoải mái. Giường êm, không gian yên tĩnh dù nằm ở trung tâm.",
      "Mọi thứ đều hoàn hảo, từ lúc check-in đến lúc check-out. Chắc chắn sẽ quay lại vào năm sau."
   ];

   const reviewsHtml = [];
   for (let i = 0; i < 3; i++) {
      const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
      const content = fakeContents[Math.floor(Math.random() * fakeContents.length)];
      const indvRating = (parseFloat(rating) + (Math.random() * 0.4 - 0.2)).toFixed(1);

      reviewsHtml.push(`
            <div class="review-card">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center">
                        <div class="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold me-3" style="width: 40px; height: 40px;">
                            ${name.charAt(0)}
                        </div>
                        <div>
                            <span class="fw-bold d-block">${name}</span>
                            <small class="text-muted">Đã lưu trú 2 đêm</small>
                        </div>
                    </div>
                    <div class="text-primary fw-bold" style="background: #eef2ff; padding: 4px 10px; border-radius: 6px;">
                        ${indvRating} / 10
                    </div>
                </div>
                <p class="mb-0 text-dark" style="line-height: 1.6;">"${content}"</p>
                <div class="text-end mt-2"><small class="text-muted" style="font-size: 0.7rem;">translated by Google</small></div>
            </div>
        `);
   }

   $('#reviewsList').html(reviewsHtml.join(''));
}

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
   const codeInput = $('#promoCode').val().trim().toUpperCase();

   if (!codeInput) {
      alert("Vui lòng nhập mã khuyến mãi!");
      return;
   }

   const activePromos = JSON.parse(localStorage.getItem('stayeasy_promos')) || [
      { code: 'STAYEASY15', discount: 15 },
      { code: 'SUMMER2026', discount: 20 }
   ];

   const validPromo = activePromos.find(p => p.code === codeInput);

   if (validPromo) {
      discountPercent = validPromo.discount / 100;
      alert(`🎉 Áp dụng mã ${validPromo.code} thành công (Giảm ${validPromo.discount}%)!`);
   } else {
      discountPercent = 0;
      alert('❌ Mã không hợp lệ hoặc đã bị vô hiệu hóa!');
   }

   calculatePrice();
}

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
      btn.prop('disabled', false).text('Chọn phòng ngay');
   }
});