let allRooms = [];
let itemsPerPage = 8; // Số phòng trên 1 trang
let currentHotelPage = 1;
let currentHomestayPage = 1;

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

$(document).ready(function () {
   initSearchDates();

   loadRooms().then(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const searchKeyword = urlParams.get('search');

      if (searchKeyword) {
         $('#searchName').val(searchKeyword);
         applyFilters();
         $('html, body').animate({ scrollTop: $(".city-tabs-container").offset().top - 100 }, 500);
      }
   });

   // Nút tìm kiếm thanh Hero
   $('#btnFilter').on('click', applyFilters);

   // Chọn Loại phòng trên Banner
   $('.search-tabs .tab-item').on('click', function () {
      $('.search-tabs .tab-item').removeClass('active');
      $(this).addClass('active');
      $('#filterType').val($(this).attr('data-type'));

      // Reset trang về 1 khi đổi bộ lọc
      currentHotelPage = 1;
      currentHomestayPage = 1;
      applyFilters();
   });

   // Đổi Dropdown loại phòng
   $('#filterType').on('change', function () {
      const val = $(this).val();
      $('.search-tabs .tab-item').removeClass('active');
      $(`.search-tabs .tab-item[data-type="${val}"]`).addClass('active');
   });

   // Chọn Tab Thành Phố
   $('.city-tabs .nav-link').on('click', function () {
      $('.city-tabs .nav-link').removeClass('active');
      $(this).addClass('active');

      currentHotelPage = 1;
      currentHomestayPage = 1;
      applyFilters();
   });

   // Sự kiện bấm nút Chuyển trang (1, 2, 3...)
   $(document).on('click', '.page-link', function (e) {
      e.preventDefault();
      const targetPage = parseInt($(this).attr('data-page'));
      const section = $(this).attr('data-section');

      if (section === 'hotel') {
         currentHotelPage = targetPage;
         $('html, body').animate({ scrollTop: $("#hotelSectionBlock").offset().top - 120 }, 300);
      } else {
         currentHomestayPage = targetPage;
         $('html, body').animate({ scrollTop: $("#homestaySectionBlock").offset().top - 120 }, 300);
      }
      applyFilters();
   });
});

function initSearchDates() {
   const today = new Date().toISOString().split('T')[0];
   $('#searchCheckIn').attr('min', today);
   $('#searchCheckIn').on('change', function () {
      const checkInDate = new Date($(this).val());
      if (!isNaN(checkInDate.getTime())) {
         checkInDate.setDate(checkInDate.getDate() + 1);
         $('#searchCheckOut').attr('min', checkInDate.toISOString().split('T')[0]);
         if ($('#searchCheckOut').val() < checkInDate.toISOString().split('T')[0]) {
            $('#searchCheckOut').val('');
         }
      }
   });
}

async function loadRooms() {
   try {
      allRooms = await API.getRooms();
      applyFilters();
   } catch (error) {
      $('#hotelContainer').html(`<div class="alert alert-danger w-100 text-center">Lỗi kết nối dữ liệu.</div>`);
   }
}

function applyFilters() {
   const nameStr = $('#searchName').val().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
   const typeStr = $('#filterType').val();
   const cityStr = $('.city-tabs .nav-link.active').attr('data-city').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

   // 1. Lọc chung toàn bộ dữ liệu theo Search và City
   let baseFiltered = allRooms.filter(r => {
      const roomName = (r.name || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const roomLoc = (r.location || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

      const matchSearch = roomName.includes(nameStr) || roomLoc.includes(nameStr);
      const matchType = (typeStr === '' || r.type === typeStr);
      const matchCity = (cityStr === '' || roomName.includes(cityStr) || roomLoc.includes(cityStr));

      return matchSearch && matchType && matchCity;
   });

   // 2. Ẩn / Hiện các Block tùy theo loại phòng khách chọn
   if (typeStr === 'Homestay') {
      $('#hotelSectionBlock').hide();
      $('#promoBannerBlock').hide();
      $('#homestaySectionBlock').show();
   } else if (typeStr === 'Standard' || typeStr === 'Resort' || typeStr === 'Deluxe') {
      $('#homestaySectionBlock').hide();
      $('#promoBannerBlock').hide();
      $('#hotelSectionBlock').show();
   } else {
      // Chọn "Tất cả" thì hiện đầy đủ
      $('#hotelSectionBlock').show();
      $('#promoBannerBlock').show();
      $('#homestaySectionBlock').show();
   }

   // 3. Tách dữ liệu ra 2 mảng: Khách sạn (Bao gồm Resort/Deluxe) và Homestay
   let hotelData = baseFiltered.filter(r => r.type !== 'Homestay');
   let homestayData = baseFiltered.filter(r => r.type === 'Homestay');

   // 4. Render dữ liệu kèm theo phân trang
   renderPaginatedSection(hotelData, 'hotelContainer', 'hotelPagination', currentHotelPage, 'hotel');
   renderPaginatedSection(homestayData, 'homestayContainer', 'homestayPagination', currentHomestayPage, 'homestay');
}

// Hàm cắt dữ liệu và vẽ giao diện
function renderPaginatedSection(data, containerId, paginationId, currentPage, sectionType) {
   const container = $('#' + containerId);
   container.empty();

   if (data.length === 0) {
      container.html(`<div class="col-12 text-center py-4"><p class="text-muted mb-0">Không tìm thấy phòng phù hợp trong mục này.</p></div>`);
      $('#' + paginationId).empty();
      return;
   }

   // Cắt dữ liệu cho trang hiện tại (8 phòng/trang)
   let startIndex = (currentPage - 1) * itemsPerPage;
   let endIndex = startIndex + itemsPerPage;
   let pagedData = data.slice(startIndex, endIndex);

   // Vẽ danh sách phòng
   pagedData.forEach(room => {
      const finalId = room.id || room.ID || room.Id;
      const safePrice = Number(room.price) || 0;
      const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop";
      const safeImage = room.image || fallbackImage;

      container.append(`
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <div class="card room-card h-100 shadow-sm border-0">
                    <span class="badge-type shadow">${room.type || 'Standard'}</span>
                    <img src="${safeImage}" onerror="this.src='${fallbackImage}'" class="card-img-top" alt="Hình ảnh">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold text-truncate" title="${room.name}">${room.name || 'Tên phòng chưa cập nhật'}</h5>
                        <p class="small text-muted mb-3"><i class="bi bi-people"></i> Tối đa ${room.guests || 2} khách</p>
                        <div class="mt-auto">
                            <p class="text-danger fw-bold fs-5 mb-2">${formatVND(safePrice)}<small class="text-muted fw-normal fs-6">/đêm</small></p>
                            <button class="btn btn-primary-custom w-100 fw-bold btn-book" data-id="${finalId}">Xem & Đặt phòng</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
   });

   // Vẽ thanh phân trang (Pagination)
   let totalPages = Math.ceil(data.length / itemsPerPage);
   renderPaginationUI(totalPages, currentPage, paginationId, sectionType);
}

// Hàm vẽ các nút 1, 2, 3...
function renderPaginationUI(totalPages, currentPage, paginationId, sectionType) {
   const pagContainer = $('#' + paginationId);
   pagContainer.empty();

   if (totalPages <= 1) return; // Nếu chỉ có 1 trang thì giấu thanh phân trang đi

   let html = `<nav><ul class="pagination mb-0">`;

   // Nút Lùi
   html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
               <a class="page-link shadow-sm" href="#" data-page="${currentPage - 1}" data-section="${sectionType}">«</a>
             </li>`;

   // Các số trang
   for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                   <a class="page-link shadow-sm" href="#" data-page="${i}" data-section="${sectionType}">${i}</a>
                 </li>`;
   }

   // Nút Tiến
   html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
               <a class="page-link shadow-sm" href="#" data-page="${currentPage + 1}" data-section="${sectionType}">»</a>
             </li>`;

   html += `</ul></nav>`;
   pagContainer.html(html);
}

// Xử lý chuyển sang trang chi tiết
$('#hotelSectionBlock, #homestaySectionBlock').off('click').on('click', '.btn-book', function () {
   const roomId = $(this).attr('data-id');
   if (!roomId) { alert("Lỗi dữ liệu."); return; }
   const checkIn = $('#searchCheckIn').val();
   const checkOut = $('#searchCheckOut').val();
   let url = `detail.html?id=${roomId}`;
   if (checkIn && checkOut) url += `&in=${checkIn}&out=${checkOut}`;
   window.location.href = url;
});