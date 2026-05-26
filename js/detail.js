let currentRoom = null;
let discountPercent = 0;

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

function removeAccents(str) {
   if (!str) return '';
   return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

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

   // Tự động điền tên nếu người dùng đã đăng nhập tài khoản trước đó
   if (localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('test_user_email')) {
      let userEmail = localStorage.getItem('test_user_email').split('@')[0];
      $('#revName').val(userEmail);
   }

   // Gắn sự kiện nút áp dụng khuyến mãi
   $('#btnApplyPromo').on('click', applyPromoCode);

   // Thay đổi ngày tự động tính tiền
   $('.calc-date').on('change', calculatePrice);

   // SỰ KIỆN GỬI FORM ĐÁNH GIÁ MỚI
   $('#addReviewForm').on('submit', function (e) {
      e.preventDefault();
      if (!currentRoom) return;

      let reviews = JSON.parse(localStorage.getItem('stayeasy_reviews')) || [];
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

      const newReview = {
         id: Date.now(),
         roomName: currentRoom.name,
         customerName: $('#revName').val().trim(),
         rating: parseFloat($('#revRating').val()),
         content: $('#revContent').val().trim(),
         date: dateStr,
         status: "published"
      };

      reviews.unshift(newReview); // Thêm lên đầu mảng để đẩy bình luận cũ xuống dưới
      localStorage.setItem('stayeasy_reviews', JSON.stringify(reviews));

      alert('🎉 Cảm ơn bạn đã gửi đánh giá! Bình luận của bạn đã được lưu và hiển thị công khai.');
      $('#revContent').val('');

      renderRoomReviews(); // Gọi cập nhật render lại danh sách tại chỗ
   });

   // SỰ KIỆN CLICK NÚT XEM THÊM BÌNH LUẬN
   $(document).on('click', '#btnLoadMoreReviews', function (e) {
      e.preventDefault();
      // Gỡ bỏ class ẩn hiển thị tất cả card đánh giá
      $('#reviewsList .review-card.d-none').removeClass('d-none');
      // Xóa bỏ nút xem thêm sau khi đã mở rộng thành công
      $(this).remove();
   });
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
         $('#dtlDesc').text(currentRoom.description || 'Chưa có thông tin mô tả chi tiết cho phòng nghỉ này.');
         $('#dtlGuests').text(currentRoom.guests);

         const price = Number(currentRoom.price) || 0;
         $('#dtlPrice').text(formatVND(price));
         $('#dtlOldPrice').text(formatVND(price * 1.25));

         renderRoomReviews(); // Khởi chạy nạp bình luận

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

// HÀM ĐỒNG BỘ HIỂN THỊ ĐÁNH GIÁ CHÂN THỰC & KHỐNG CHẾ SỐ LƯỢNG VIEW
function renderRoomReviews() {
   if (!currentRoom) return;

   let reviews = JSON.parse(localStorage.getItem('stayeasy_reviews')) || [];

   // Lọc ra danh sách bình luận thật của phòng này và đang hiển thị (published)
   const filteredReviews = reviews.filter(r => r.roomName === currentRoom.name && r.status === "published");

   // Định nghĩa 3 mẫu có sẵn cố định hệ thống
   const defaultReviews = [
      {
         customerName: "Stephen E.",
         rating: 8.8,
         content: "Phòng sạch sẽ và được trình bày đẹp. Luôn có nước nóng và nhân viên rất tuyệt vời và rất hữu ích. Đáng giá tiền.",
         date: "translated by Google"
      },
      {
         customerName: "Mai T.",
         rating: 9.5,
         content: "Trải nghiệm thật tuyệt vời khi lưu trú tại đây. Điểm ăn sáng ngon, view nhìn ra trung tâm rất ấn tượng.",
         date: "Đã xác thực chỗ nghỉ"
      },
      {
         customerName: "Trần Q.",
         rating: 8.5,
         content: "Tôi đã có một kỳ nghỉ rất thoải mái. Giường êm, không gian yên tĩnh dù nằm ngay khu vực trung tâm.",
         date: "Đã xác thực chỗ nghỉ"
      }
   ];

   // Gộp bình luận thật lên trước để đẩy bình luận có sẵn xuống phía sau
   const allReviewsToRender = [...filteredReviews, ...defaultReviews];

   // Cập nhật tổng số lượng hiển thị trên badge tiêu đề
   const baseFakeCount = 142;
   const totalDisplayCount = allReviewsToRender.length + baseFakeCount;
   $('#dtlReviewCount').text(`Từ ${totalDisplayCount} đánh giá chân thực`);

   // Tính toán điểm số trung bình thực tế
   let sumScore = 0;
   allReviewsToRender.forEach(r => sumScore += parseFloat(r.rating));
   let avgScore = (sumScore / allReviewsToRender.length).toFixed(1);
   $('#dtlRatingNum').text(avgScore);

   let ratingText = "Tuyệt vời";
   if (parseFloat(avgScore) < 8.0) ratingText = "Tốt";
   else if (parseFloat(avgScore) < 9.0) ratingText = "Rất tốt";
   $('#dtlRatingText').text(ratingText);

   const reviewsHtml = [];

   // Duyệt mảng kết xuất giao diện và khống chế ẩn từ phần tử thứ 4 trở đi
   allReviewsToRender.forEach((r, index) => {
      // Nếu vị trí index >= 3 (tức là từ phần tử thứ 4), tự động thêm class d-none của Bootstrap để ẩn đi
      let hiddenClass = index >= 3 ? "d-none" : "";

      reviewsHtml.push(`
            <div class="review-card ${hiddenClass}">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center">
                        <div class="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold me-3" style="width: 40px; height: 40px;">
                            ${r.customerName ? r.customerName.charAt(0).toUpperCase() : 'K'}
                        </div>
                        <div>
                            <span class="fw-bold d-block">${r.customerName}</span>
                            <small class="text-muted">Khách hàng StayEasy</small>
                        </div>
                    </div>
                    <div class="text-primary fw-bold" style="background: #eef2ff; padding: 4px 10px; border-radius: 6px;">
                        ${r.rating} / 10
                    </div>
                </div>
                <p class="mb-0 text-dark" style="line-height: 1.6;">"${r.content}"</p>
                <div class="text-end mt-2"><small class="text-muted" style="font-size: 0.75rem;">${r.date.includes('/') ? 'Ngày đăng: ' + r.date : r.date}</small></div>
            </div>
      `);
   });

   $('#reviewsList').html(reviewsHtml.join(''));

   // Nếu tổng số lượng bình luận vượt quá 3, bổ sung thêm nút "Xem thêm bình luận" vào cuối danh sách
   if (allReviewsToRender.length > 3) {
      let remainCount = allReviewsToRender.length - 3;
      $('#reviewsList').append(`
          <button id="btnLoadMoreReviews" class="btn btn-outline-primary w-100 py-2 fw-bold rounded-3 shadow-sm mt-2 mb-4">
             <i class="bi bi-chevron-down me-1"></i> Xem thêm bình luận (Còn ${remainCount} đánh giá khác)
          </button>
       `);
   }
}

function initDateValidation() {
   // Ngày tháng giờ dùng flatpickr ở detail.html nên chỉ cần lắng nghe hidden inputs
   // Khi flatpickr set giá trị vào #cIn / #cOut, tính giá tự động
   $('#cIn, #cOut').on('change', calculatePrice);
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
   const codeInput = $('#promoCode').val().trim().toUpperCase(); // Tự đổi về in hoa để so sánh

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