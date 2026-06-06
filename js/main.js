let allRooms = [];
let itemsPerPage = 4; // HIỂN THỊ 4 PHÒNG TRÊN 1 TRANG THEO YÊU CẦU
let currentHotelPage = 1;
let currentHomestayPage = 1;
let currentResortPage = 1; // Quản lý trang cho khối Resort mới

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

$(document).ready(function () {
   loadRooms().then(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const searchKeyword = urlParams.get('search') || urlParams.get('loc');

      if (searchKeyword) {
         $('#searchName').val(searchKeyword);
         applyFilters();
         $('html, body').animate({ scrollTop: $(".city-filter-bar").offset().top - 100 }, 500);
      }
   });

   $('#btnFilter').on('click', applyFilters);

   $('.search-tabs .tab-item').on('click', function () {
      $('.search-tabs .tab-item').removeClass('active');
      $(this).addClass('active');
      $('#filterType').val($(this).attr('data-type'));

      currentHotelPage = 1;
      currentHomestayPage = 1;
      currentResortPage = 1;
      applyFilters();
   });

   $('#filterType').on('change', function () {
      const val = $(this).val();
      $('.search-tabs .tab-item').removeClass('active');
      $(`.search-tabs .tab-item[data-type="${val}"]`).addClass('active');
   });

   $('.city-filter-bar .nav-link').on('click', function () {
      $('.city-filter-bar .nav-link').removeClass('active');
      $(this).addClass('active');

      currentHotelPage = 1;
      currentHomestayPage = 1;
      currentResortPage = 1;
      applyFilters();
   });

   $(document).on('click', '.page-link', function (e) {
      e.preventDefault();
      const targetPage = parseInt($(this).attr('data-page'));
      const section = $(this).attr('data-section');

      if (section === 'hotel') {
         currentHotelPage = targetPage;
         $('html, body').animate({ scrollTop: $("#hotelSectionBlock").offset().top - 120 }, 300);
      } else if (section === 'homestay') {
         currentHomestayPage = targetPage;
         $('html, body').animate({ scrollTop: $("#homestaySectionBlock").offset().top - 120 }, 300);
      } else if (section === 'resort') {
         currentResortPage = targetPage;
         $('html, body').animate({ scrollTop: $("#resortSectionBlock").offset().top - 120 }, 300);
      }
      applyFilters();
   });
});

async function loadRooms() {
   try {
      const res = await API.getRooms();
      allRooms = Array.isArray(res) ? res : [];
      applyFilters();
   } catch (error) {
      $('#hotelContainer').html(`<div class="alert alert-danger w-100 text-center">Lỗi kết nối dữ liệu.</div>`);
   }
}

function applyFilters() {
   const nameStr = ($('#searchName').val() || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
   const typeStr = $('#filterType').val();
   const cityStr = ($('.city-filter-bar .nav-link.active').attr('data-city') || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

   let baseFiltered = allRooms.filter(r => {
      const roomName = (r.name || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const roomLoc = (r.location || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

      const matchSearch = roomName.includes(nameStr) || roomLoc.includes(nameStr);
      const matchType = (typeStr === '' || r.type === typeStr);
      const matchCity = (cityStr === '' || roomName.includes(cityStr) || roomLoc.includes(cityStr));

      return matchSearch && matchType && matchCity;
   });

   // Tách riêng 3 mảng dữ liệu theo Loại hình
   let hotelData = baseFiltered.filter(r => r.type === 'Standard' || r.type === 'Deluxe');
   let homestayData = baseFiltered.filter(r => r.type === 'Homestay');
   let resortData = baseFiltered.filter(r => r.type === 'Resort');

   // Xử lý Ẩn/Hiện các khối theo bộ lọc
   if (typeStr === 'Homestay') {
      $('#hotelSectionBlock, #resortSectionBlock, #promoBannerBlock').hide();
      $('#homestaySectionBlock').show();
   } else if (typeStr === 'Resort') {
      $('#hotelSectionBlock, #homestaySectionBlock, #promoBannerBlock').hide();
      $('#resortSectionBlock').show();
   } else if (typeStr === 'Standard' || typeStr === 'Deluxe') {
      $('#homestaySectionBlock, #resortSectionBlock, #promoBannerBlock').hide();
      $('#hotelSectionBlock').show();
   } else {
      $('#hotelSectionBlock, #homestaySectionBlock, #resortSectionBlock, #promoBannerBlock').show();
   }

   // Render dữ liệu vào từng container tương ứng
   renderPaginatedSection(hotelData, 'hotelContainer', 'hotelPagination', currentHotelPage, 'hotel');
   renderPaginatedSection(homestayData, 'homestayContainer', 'homestayPagination', currentHomestayPage, 'homestay');
   renderPaginatedSection(resortData, 'resortContainer', 'resortPagination', currentResortPage, 'resort');
}

function renderPaginatedSection(data, containerId, paginationId, currentPage, sectionType) {
   const container = $('#' + containerId);
   container.empty();

   if (data.length === 0) {
      container.html(`<div class="col-12 text-center py-4"><p class="text-muted mb-0">Không tìm thấy phòng phù hợp trong mục này.</p></div>`);
      $('#' + paginationId).empty();
      return;
   }

   let startIndex = (currentPage - 1) * itemsPerPage;
   let endIndex = startIndex + itemsPerPage;
   let pagedData = data.slice(startIndex, endIndex);

   pagedData.forEach(room => {
      const finalId = room.id || room.ID || room.Id;
      const safePrice = Number(room.price) || 0;
      const oldPrice = safePrice * 1.25;
      const rating = (8 + Math.random() * 1.8).toFixed(1);
      const reviews = Math.floor(Math.random() * 500) + 120;
      const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop";

      container.append(`
         <div class="col-md-6 col-lg-3">
             <a href="detail.html?id=${finalId}" class="text-decoration-none d-block h-100 room-link" data-id="${finalId}">
                 <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden room-card-hover transition-all" style="background-color: #fff;">
                     <div class="position-relative">
                         <img src="${room.image || fallbackImage}" class="card-img-top w-100" style="height: 200px; object-fit: cover;" onerror="this.src='${fallbackImage}'">
                         <div class="position-absolute top-0 start-0 px-3 py-1 bg-dark text-white fw-bold" style="opacity: 0.9; font-size: 0.8rem; border-bottom-right-radius: 12px;">
                             <i class="bi bi-geo-alt-fill text-white me-1"></i> ${room.location || 'Việt Nam'}
                         </div>
                         <div class="position-absolute px-2 py-1 text-white fw-bold shadow-sm" style="bottom: 0; right: 0; background-color: #2563eb; border-top-left-radius: 10px; font-size: 0.9rem;">
                             Tiết kiệm 20%
                         </div>
                     </div>
                     <div class="card-body p-3 d-flex flex-column">
                         <h6 class="card-title fw-bold text-dark mb-1 text-truncate" title="${room.name}" style="font-size: 1.05rem;">
                             ${room.name || 'Tên phòng chưa cập nhật'}
                         </h6>
                         <div class="d-flex align-items-center mb-3" style="font-size: 0.8rem;">
                             <span class="text-warning me-1">
                                 <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-half"></i>
                             </span>
                             <span class="fw-bold ms-1" style="color: #0071c2;">${rating}/10</span>
                             <span class="text-muted ms-1">• ${reviews} đánh giá</span>
                         </div>
                         <div class="mt-auto">
                             <del class="text-muted d-block" style="font-size: 0.85rem;">${formatVND(oldPrice)}</del>
                             <span class="fw-bold d-block" style="color: #2563eb; font-size: 1.3rem;">
                                 ${formatVND(safePrice)}
                             </span>
                             <small class="text-muted d-block mt-1" style="font-size: 0.75rem;">Chưa bao gồm thuế và phí</small>
                         </div>
                     </div>
                 </div>
             </a>
         </div>
      `);
   });

   let totalPages = Math.ceil(data.length / itemsPerPage);
   renderPaginationUI(totalPages, currentPage, paginationId, sectionType);
}

function renderPaginationUI(totalPages, currentPage, paginationId, sectionType) {
   const pagContainer = $('#' + paginationId);
   pagContainer.empty();

   if (totalPages <= 1) return;

   let html = `<nav><ul class="pagination mb-0">`;
   html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
               <a class="page-link shadow-sm fw-bold" href="#" data-page="${currentPage - 1}" data-section="${sectionType}">«</a>
             </li>`;

   for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                   <a class="page-link shadow-sm fw-bold" href="#" data-page="${i}" data-section="${sectionType}">${i}</a>
                 </li>`;
   }

   html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
               <a class="page-link shadow-sm fw-bold" href="#" data-page="${currentPage + 1}" data-section="${sectionType}">»</a>
             </li>`;

   html += `</ul></nav>`;
   pagContainer.html(html);
}

$('#hotelContainer, #homestayContainer, #resortContainer').off('click', '.room-link').on('click', '.room-link', function (e) {
   e.preventDefault();
   const roomId = $(this).attr('data-id');
   const checkIn = $('#searchCheckIn').val();
   const checkOut = $('#searchCheckOut').val();

   let url = `detail.html?id=${roomId}`;
   if (checkIn && checkOut) url += `&in=${checkIn}&out=${checkOut}`;

   window.location.href = url;
});