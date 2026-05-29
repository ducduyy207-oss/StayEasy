// Auth Guard tối cao — show login modal thay vì redirect
const _adminEmail = localStorage.getItem('adminEmail');
const _adminRole = localStorage.getItem('userRole');
const _isAuthenticated = (_adminRole === 'superadmin' && _adminEmail === 'admin@gmail.com');

if (!_isAuthenticated) {
    // Hiển thị login modal khi DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        const loginModalEl = document.getElementById('loginModal');
        if (!loginModalEl) {
            // Fallback: nếu không có modal, set localStorage tự động (dev mode)
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'superadmin');
            localStorage.setItem('userName', 'Admin');
            localStorage.setItem('adminEmail', 'admin@gmail.com');
            location.reload();
            return;
        }
        const loginModal = new bootstrap.Modal(loginModalEl);
        loginModal.show();

        document.getElementById('btnLogin').addEventListener('click', function () {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (email === 'admin@gmail.com' && password === 'admin123') {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userRole', 'superadmin');
                localStorage.setItem('userName', 'Admin');
                localStorage.setItem('adminEmail', 'admin@gmail.com');
                location.reload();
            } else {
                showToast('Sai email hoặc mật khẩu!', 'error');
            }
        });
    });
}

// ============= TOAST SYSTEM (thay thế alert) =============
window.showToast = function (message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

    const iconMap = {
        success: { icon: 'bi-check-circle-fill', class: 'toast-success' },
        error: { icon: 'bi-exclamation-circle-fill', class: 'toast-error' },
        warning: { icon: 'bi-exclamation-triangle-fill', class: 'toast-warning' },
        info: { icon: 'bi-info-circle-fill', class: 'toast-info' }
    };
    const config = iconMap[type] || iconMap.info;

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast-custom ${config.class}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="bi ${config.icon}"></i></div>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
            <i class="bi bi-x-lg"></i>
        </button>
    `;
    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// ============= CONFIRM MODAL CHUYÊN NGHIỆP (thay confirm) =============
window.showConfirm = function (title, message, onConfirm, iconType = 'warning') {
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) { if (window.confirm(message)) onConfirm(); return; }
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;

    const icon = document.getElementById('confirmIcon');
    icon.className = `confirm-modal-icon icon-${iconType}`;
    const iconMap = {
        warning: 'bi-exclamation-triangle-fill',
        danger: 'bi-trash-fill',
        success: 'bi-check-circle-fill',
        info: 'bi-info-circle-fill'
    };
    icon.innerHTML = `<i class="bi ${iconMap[iconType] || iconMap.warning}"></i>`;

    const okBtn = document.getElementById('confirmOkBtn');
    const newBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newBtn, okBtn);
    newBtn.addEventListener('click', () => { modal.hide(); onConfirm(); });

    modal.show();
};

// Hàm toàn cục xử lý đăng xuất hệ thống an toàn
window.logoutAdmin = function () {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('adminEmail');
    window.location.href = 'index.html';
}

let allRooms = [];
let allBookings = [];
let itemsPerPage = 8;

let currentRoomPage = 1;
let currentBookingPage = 1;
let currentCustomerPage = 1;
let roomModal;
let revenueChart = null;
let bookingStatusFilter = 'all';
let bookingKeyword = '';

let promotions = JSON.parse(localStorage.getItem('stayeasy_promos')) || [
    { code: 'STAYEASY15', discount: 15, roomName: '' },
    { code: 'SUMMER2026', discount: 20, roomName: '' }
];
let editingPromoIndex = -1;
// Khởi tạo danh sách Đánh giá giả lập (Vì MockAPI chưa có bảng này)
let fakeReviews = JSON.parse(localStorage.getItem('stayeasy_reviews')) || [];
if (fakeReviews.length === 0) {
    fakeReviews = [
        { id: 1, roomName: "Vinpearl Resort & Spa Phú Quốc", customerName: "Mai T.", rating: 9.5, content: "Trải nghiệm thật tuyệt vời khi lưu trú tại đây.", date: "15/05/2026", status: "published" },
        { id: 2, roomName: "Novotel Đà Nẵng Premier", customerName: "David L.", rating: 8.8, content: "Phòng sạch sẽ, nhân viên thân thiện.", date: "12/05/2026", status: "published" },
        { id: 3, roomName: "Sapa Eco Homestay", customerName: "Hoàng N.", rating: 4.5, content: "Mạng wifi hơi yếu vào buổi tối.", date: "10/05/2026", status: "published" }
    ];
    localStorage.setItem('stayeasy_reviews', JSON.stringify(fakeReviews));
}

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

function removeAccents(str) {
    if (!str) return '';
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Điều hướng hoán đổi Tab thủ công chuẩn và mượt mà hơn bằng Native Bootstrap 5 JS API
window.switchAdminTab = function (targetTabId) {
    const triggerEl = document.querySelector(`#adminSidebarMenu button[data-bs-target="${targetTabId}"]`);
    if (triggerEl) {
        const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);
        tab.show();
    }
}

$(document).ready(function () {
    // =================================================================
    // ĐỒNG BỘ THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP THẬT LÊN DROPDOWN TRÊN HEADER
    // =================================================================
    const currentAdminName = (localStorage.getItem('userName') || "Quản Trị Viên").replace(/Tổng /i, '').trim();
    const currentAdminRole = localStorage.getItem('userRole') || "admin";

    // Đổ text ra thanh Header ngoài
    $('#adminHeaderName').text(currentAdminName.toUpperCase());
    $('#adminHeaderRole').text(currentAdminRole === 'superadmin' ? '⭐ Quản Trị Viên' : '👤 Nhân viên');

    // Đổ text ra phần khối tiêu đề nhỏ bên trong thẻ Dropdown panel
    $('#dropdownUserFullname').text(currentAdminName);
    $('#dropdownUserRole').text("Quyền hạn: " + currentAdminRole);

    // Tự động tạo ảnh đại diện tròn theo Tên chữ cái viết tắt của người dùng (Avatar generator chuyên nghiệp)
    $('#adminHeaderAvatar').attr('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(currentAdminName)}&background=2563eb&color=fff&bold=true`);

    roomModal = new bootstrap.Modal(document.getElementById('roomModal'));

    loadAdminData();

    $('#adminSidebarMenu button').on('shown.bs.tab', function (e) {
        $('#headerTitle').text($(e.target).text().trim());
    });

    $('#btnAddRoom').on('click', function () {
        $('#roomModalTitle').text('Thêm Phòng Mới');
        $('#roomForm')[0].reset();
        $('#adminRoomId').val('');
        roomModal.show();
    });
    $('#btnDeleteAllRooms').on('click', async function () {
        if (allRooms.length === 0) {
            showToast('Không có phòng nào để xoá.', 'warning');
            return;
        }

        showConfirm('Xoá toàn bộ phòng', `Xoá toàn bộ ${allRooms.length} phòng? Hành động này không thể hoàn tác!`, async function () {
            try {
                await Promise.all(allRooms.map(room => API.deleteRoom(room.id)));
                showToast('Đã xoá toàn bộ phòng!', 'success');
                currentRoomPage = 1;
                await loadAdminData();
            } catch (error) {
                showToast('Lỗi khi xoá toàn bộ phòng!', 'error');
                console.error(error);
            }
        }, 'danger');
    });


    $('#roomForm').off('submit').on('submit', async function (e) {
        e.preventDefault();

        const btnSubmit = $(this).find('button[type="submit"]');
        btnSubmit.prop('disabled', true).text('Đang lưu...');

        const roomId = $('#adminRoomId').val();
        const roomData = {
            name: String($('#admName').val() || ''),
            location: String($('#admLocation').val() || ''),
            price: Number($('#admPrice').val()) || 0,
            guests: Number($('#admGuests').val()) || 1,
            type: String($('#admType').val() || 'Standard'),
            image: String($('#admImage').val() || '')
        };

        try {
            if (roomId) {
                await API.updateRoom(roomId, roomData);
                showToast('Đã cập nhật phòng!', 'success');
            } else {
                if (allRooms.length >= 100) {
                    showToast('CẢNH BÁO: MockAPI chỉ giới hạn 100 phòng! Vui lòng xóa bớt phòng cũ.', 'warning');
                    btnSubmit.prop('disabled', false).text('Lưu Dữ Liệu');
                    return;
                }
                await API.createRoom(roomData);
                showToast('Đã thêm phòng mới!', 'success');
            }

            roomModal.hide();
            $('body').removeClass('modal-open').css('padding-right', '');
            $('.modal-backdrop').remove();

            currentRoomPage = 1;
            await loadAdminData();
        } catch (error) {
            showToast('Lỗi! Vui lòng kiểm tra kết nối API.', 'error');
            console.error(error);
        } finally {
            btnSubmit.prop('disabled', false).text('Lưu Dữ Liệu');
        }
    });

    $('#searchRoomInput').on('input', function () {
        currentRoomPage = 1;
        renderRoomTable();
    });

    $('#searchBookingInput').on('input', function () {
        bookingKeyword = $(this).val();
        currentBookingPage = 1;
        renderBookingTable();
    });

    // Search promo
    $('#searchPromoInput').on('input', function () {
        renderPromotions();
    });

    $(document).on('click', '#roomPagination .page-link', function (e) {
        e.preventDefault();
        if ($(this).parent().hasClass('disabled')) return;
        currentRoomPage = parseInt($(this).attr('data-page'));
        renderRoomTable();
    });

    $(document).on('click', '#bookingPagination .page-link', function (e) {
        e.preventDefault();
        if ($(this).parent().hasClass('disabled')) return;
        currentBookingPage = parseInt($(this).attr('data-page'));
        renderBookingTable();
    });

    $(document).on('click', '#customerPagination .page-link', function (e) {
        e.preventDefault();
        if ($(this).parent().hasClass('disabled')) return;
        currentCustomerPage = parseInt($(this).attr('data-page'));
        renderCustomerTable();
    });

    $(document).on('click', '#revenuePagination .page-link', function (e) {
        e.preventDefault();
        if ($(this).parent().hasClass('disabled')) return;
        currentRevenuePage = parseInt($(this).attr('data-page'));
        renderRevenueTab();
    });

    $(document).on('click', '#reviewPagination .page-link', function (e) {
        e.preventDefault();
        if ($(this).parent().hasClass('disabled')) return;
        currentReviewPage = parseInt($(this).attr('data-page'));
        renderReviewTable();
    });

    $('#promoForm').on('submit', function (e) {
        e.preventDefault();
        const code = $('#promoCodeInput').val().trim().toUpperCase();
        const discount = parseInt($('#promoDiscountInput').val());
        const roomName = $('#promoRoomInput').val().trim();

        if (editingPromoIndex >= 0) {
            if (promotions.some((p, i) => p.code === code && i !== editingPromoIndex)) {
                showToast('Mã này đã tồn tại!', 'warning'); return;
            }
            promotions[editingPromoIndex] = { code, discount, roomName };
        } else {
            if (promotions.some(p => p.code === code)) {
                showToast('Mã này đã tồn tại!', 'warning'); return;
            }
            promotions.push({ code, discount, roomName });
        }

        localStorage.setItem('stayeasy_promos', JSON.stringify(promotions));

        $('#promoModal').modal('hide');
        $(this)[0].reset();
        editingPromoIndex = -1;
        renderPromotions();
        showToast(editingPromoIndex >= 0 ? "Cập nhật thành công!" : "Thêm mã khuyến mãi thành công!", 'success');
    });
    $('#promoModal').on('hidden.bs.modal', function () {
        editingPromoIndex = -1;
        $('#promoModalTitle').text('Tạo Mã Mới');
        $('#btnPromoSubmit').text('Thêm Mã Ưu Đãi');
        $('#promoForm')[0].reset();
    });

    $('#btnDeleteAllPromos').on('click', function () {
        if (promotions.length === 0) {
            showToast('Không có mã nào để xoá.', 'warning');
            return;
        }
        showConfirm('Xoá tất cả mã', `Xoá toàn bộ ${promotions.length} mã khuyến mãi? Hành động này không thể hoàn tác!`, function () {
            promotions = [];
            localStorage.setItem('stayeasy_promos', JSON.stringify(promotions));
            renderPromotions();
            showToast('Đã xoá tất cả mã khuyến mãi!', 'success');
        }, 'danger');
    });
});

async function loadAdminData() {
    try {
        let resRooms = await API.getRooms().catch(() => []);
        let resBookings = await API.getBookings().catch(() => []);

        allRooms = Array.isArray(resRooms) ? resRooms : [];

        // Load từ localStorage trước (booking mới từ detail.html)
        let localBookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
        // Merge với API bookings, ưu tiên localStorage
        let apiBookings = Array.isArray(resBookings) ? resBookings : [];

        // Merge: local bookings + API bookings (tránh duplicate)
        let mergedBookings = [...localBookings];
        apiBookings.forEach(apiB => {
            if (!mergedBookings.find(b => b.id === apiB.id)) {
                mergedBookings.push(apiB);
            }
        });

        allBookings = mergedBookings;

        updateDashboardStats();
        renderRoomTable();
        renderBookingTable();
        renderRevenueTab();
        renderPromotions();
        renderCustomerTable();
        renderReviewTable();
        renderRevenueChart();
        renderTopRooms();
        renderActivityFeed();
        updateDashboardPromoCount();
    } catch (error) {
        console.error("Lỗi:", error);
    }
}

function updateDashboardStats() {
    $('#dashTotalRooms').text(allRooms.length);
    $('#roomCountBadge').text(`${allRooms.length} phòng`);
    $('#dashTotalBookings').text(allBookings.length);

    const pendingBookings = allBookings.filter(b => b.status === "Pending");
    $('#dashPendingBookings').html(`<i class="bi bi-clock-history me-1"></i>${pendingBookings.length} đơn chờ duyệt`);

    $('#notificationCount').text(pendingBookings.length);
    const notiList = $('#notificationList');
    notiList.empty();

    if (pendingBookings.length === 0) {
        notiList.append('<li><span class="dropdown-item text-muted text-center py-3">Không có thông báo mới</span></li>');
    } else {
        pendingBookings.forEach(b => {
            notiList.append(`
                <li><a class="dropdown-item border-bottom py-2" href="#" onclick="switchAdminTab('#tab-bookings')">
                    <span class="fw-bold text-primary">${b.customerName || 'Khách hàng'}</span> vừa đặt phòng!
                    <div class="small text-muted">${b.roomName || ''}</div>
                </a></li>
            `);
        });
    }

    const revenue = allBookings.reduce((sum, b) => b.status === "Confirmed" ? sum + (Number(b.totalPrice) || 0) : sum, 0);
    $('#dashRevenue').text(formatVND(revenue));
}

function renderRoomTable() {
    const tbody = $('#adminRoomTable');
    tbody.empty();

    if (allRooms.length === 0) {
        tbody.html(`<tr><td colspan="4" class="text-center text-muted py-4">Chưa có phòng nào trong hệ thống.</td></tr>`);
        $('#roomPagination').empty();
        $('#roomPaginationInfo').text('');
        return;
    }

    const keyword = removeAccents($('#searchRoomInput').val());
    const filtered = allRooms.filter(r =>
        removeAccents(r.name).includes(keyword) ||
        removeAccents(r.location).includes(keyword) ||
        removeAccents(r.type).includes(keyword)
    );

    if (filtered.length === 0) {
        tbody.html(`<tr><td colspan="4" class="text-center text-muted py-4">Không tìm thấy phòng phù hợp.</td></tr>`);
        $('#roomPagination').empty();
        $('#roomPaginationInfo').text('');
        return;
    }

    const start = (currentRoomPage - 1) * itemsPerPage;
    const pagedRooms = filtered.slice(start, start + itemsPerPage);

    pagedRooms.forEach(room => {
        tbody.append(`
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${room.image || 'https://via.placeholder.com/60'}" class="rounded-3 object-fit-cover shadow-sm" width="60" height="60" alt="Room Image">
                        <div>
                            <h6 class="mb-1 fw-bold text-dark">${room.name}</h6>
                            <small class="text-muted"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${room.location}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border px-2 py-1">${room.type}</span></td>
                <td class="fw-bold text-success">${formatVND(room.price)}</td>
                <td class="text-muted"><i class="bi bi-person-fill text-secondary me-1"></i>${room.guests} Khách</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light text-primary shadow-sm me-2" onclick="editRoom('${room.id}')" title="Sửa">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-danger shadow-sm" onclick="deleteRoom('${room.id}')" title="Xóa">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    $('#roomPaginationInfo').text(`Trang ${currentRoomPage} / ${totalPages || 1}`);
    renderPaginationUI(totalPages, currentRoomPage, 'roomPagination');
}

function renderBookingTable() {
    const tbody = $('#adminBookingTable');
    tbody.empty();

    // Cập nhật badge đếm số lượng từng trạng thái
    const counts = { all: allBookings.length, Pending: 0, Confirmed: 0, Cancelled: 0 };
    allBookings.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
    $('#countAll').text(counts.all);
    $('#countPending').text(counts.Pending);
    $('#countConfirmed').text(counts.Confirmed);
    $('#countCancelled').text(counts.Cancelled);

    if (allBookings.length === 0) {
        tbody.html(`<tr><td colspan="6" class="text-center text-muted py-4">Hiện chưa có đơn đặt phòng nào.</td></tr>`);
        $('#bookingPagination').empty();
        $('#bookingPaginationInfo').text('');
        return;
    }

    // Lọc theo trạng thái + từ khoá
    let filtered = [...allBookings];
    if (bookingStatusFilter !== 'all') {
        filtered = filtered.filter(b => b.status === bookingStatusFilter);
    }
    if (bookingKeyword) {
        const kw = removeAccents(bookingKeyword);
        filtered = filtered.filter(b =>
            removeAccents(b.customerName || '').includes(kw) ||
            removeAccents(b.roomName || '').includes(kw) ||
            removeAccents(b.customerPhone || '').includes(kw)
        );
    }

    if (filtered.length === 0) {
        tbody.html(`<tr><td colspan="6" class="text-center text-muted py-4">Không có đơn phù hợp.</td></tr>`);
        $('#bookingPagination').empty();
        $('#bookingPaginationInfo').text('');
        return;
    }

    let sortedBookings = filtered.reverse();
    const start = (currentBookingPage - 1) * itemsPerPage;
    const pagedBookings = sortedBookings.slice(start, start + itemsPerPage);

    pagedBookings.forEach(b => {
        let statusBadge = '';
        let actionBtns = '';

        if (b.status === "Pending") {
            statusBadge = '<span class="badge badge-soft-warning"><i class="bi bi-hourglass-split me-1"></i>Chờ duyệt</span>';
            actionBtns = `
                <button class="btn btn-sm btn-success shadow-sm me-1" onclick="updateBookingStatus('${b.id}', 'Confirmed')" title="Duyệt"><i class="bi bi-check-lg"></i></button>
                <button class="btn btn-sm btn-danger shadow-sm me-1" onclick="updateBookingStatus('${b.id}', 'Cancelled')" title="Từ chối"><i class="bi bi-x-lg"></i></button>
            `;
        } else if (b.status === "Confirmed") {
            statusBadge = '<span class="badge badge-soft-success"><i class="bi bi-check-circle me-1"></i>Đã duyệt</span>';
        } else {
            statusBadge = '<span class="badge badge-soft-danger"><i class="bi bi-x-circle me-1"></i>Đã hủy</span>';
        }

        actionBtns += `
            <button class="btn btn-sm btn-light text-primary shadow-sm me-1" onclick="editBooking('${b.id}')" title="Sửa"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-light text-primary shadow-sm me-1" onclick="viewBookingDetail('${b.id}')" title="Xem chi tiết"><i class="bi bi-eye"></i></button>
            <button class="btn btn-sm btn-light text-danger shadow-sm" onclick="deleteBooking('${b.id}')" title="Xoá"><i class="bi bi-trash"></i></button>
        `;

        tbody.append(`
            <tr>
                <td class="ps-4 fw-bold text-dark">
                    ${b.customerName || 'Khách hàng'}
                    <div class="small fw-normal text-muted mt-1">SĐT: ${b.customerPhone || 'N/A'}</div>
                </td>
                <td><span class="text-primary fw-bold">${b.roomName || 'Phòng'}</span></td>
                <td>
                    <div class="small"><span class="text-muted">In:</span> ${b.checkIn || ''} ${b.checkInTime ? `<span class="badge bg-light text-primary ms-1">${b.checkInTime}</span>` : ''}</div>
                    <div class="small"><span class="text-muted">Out:</span> ${b.checkOut || ''} ${b.checkOutTime ? `<span class="badge bg-light text-danger ms-1">${b.checkOutTime}</span>` : ''}</div>
                    <div class="small mt-1">
                        <span class="badge bg-light text-dark border"><i class="bi bi-person me-1"></i>${b.adults || 1} NL</span>
                        <span class="badge bg-light text-dark border"><i class="bi bi-person-badge me-1"></i>${b.children || 0} TE</span>
                    </div>
                </td>
                <td class="fw-bold text-success">${formatVND(b.totalPrice)}</td>
                <td>${statusBadge}</td>
                <td class="text-end pe-4">${actionBtns}</td>
            </tr>
        `);
    });

    const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
    $('#bookingPaginationInfo').text(`Trang ${currentBookingPage} / ${totalPages || 1}`);
    renderPaginationUI(totalPages, currentBookingPage, 'bookingPagination');
}

let currentRevenuePage = 1;
let currentReviewPage = 1;

function renderRevenueTab() {
    const confirmedBookings = allBookings.filter(b => b.status === "Confirmed");
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

    $('#revTotalAmount').text(formatVND(totalRevenue));
    $('#revTotalBookings').text(confirmedBookings.length + " đơn");

    const tbody = $('#revenueTableBody');
    tbody.empty();

    if (confirmedBookings.length === 0) {
        tbody.html(`<tr><td colspan="4" class="text-center text-muted py-4">Chưa có giao dịch nào thành công.</td></tr>`);
        $('#revenuePagination').empty();
        $('#revenuePaginationInfo').text('');
        return;
    }

    let sortedRevenue = [...confirmedBookings].reverse();

    // Phân trang
    const start = (currentRevenuePage - 1) * itemsPerPage;
    const pagedRevenue = sortedRevenue.slice(start, start + itemsPerPage);

    pagedRevenue.forEach(b => {
        tbody.append(`
            <tr>
                <td class="ps-4 fw-bold text-dark">${b.customerName || ''}</td>
                <td><span class="text-primary fw-bold">${b.roomName || ''}</span></td>
                <td class="small text-muted">${b.checkIn || ''} đến ${b.checkOut || ''}</td>
                <td class="text-end pe-4 fw-bold text-success">+ ${formatVND(b.totalPrice)}</td>
            </tr>
        `);
    });

    const totalPages = Math.ceil(sortedRevenue.length / itemsPerPage);
    $('#revenuePaginationInfo').text(`Trang ${currentRevenuePage} / ${totalPages || 1}`);
    renderPaginationUI(totalPages, currentRevenuePage, 'revenuePagination');
}

function renderPromotions() {
    const tbody = $('#promoTableBody');
    tbody.empty();

    // Lấy giá trị search
    const searchTerm = $('#searchPromoInput').val().trim().toUpperCase();

    // Lọc promotions theo search term
    const filteredPromos = promotions.filter(p =>
        p.code.toUpperCase().includes(searchTerm) ||
        (p.roomName && p.roomName.toUpperCase().includes(searchTerm))
    );

    if (filteredPromos.length === 0) {
        tbody.html(`<tr><td colspan="5" class="text-center text-muted py-4">Chưa có mã khuyến mãi nào.</td></tr>`);
        return;
    }

    filteredPromos.forEach((p, index) => {
        tbody.append(`
    <tr>
        <td class="ps-4"><span class="badge bg-danger fs-6">${p.code}</span></td>
        <td class="fw-bold text-success fs-5">Giảm ${p.discount}%</td>
        <td class="text-muted small">
            ${p.roomName
                ? `<span class="badge bg-warning text-dark"><i class="bi bi-building me-1"></i>${p.roomName}</span>`
                : `<span class="badge bg-secondary"><i class="bi bi-globe me-1"></i>Tất cả phòng</span>`
            }
        </td>
        <td><span class="badge badge-soft-success"><i class="bi bi-check-circle me-1"></i>Đang chạy</span></td>
        <td class="text-end pe-4">
            <button class="btn btn-sm btn-light text-primary shadow-sm me-2" onclick="editPromo(${index})" title="Sửa">
                <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-light text-danger shadow-sm" onclick="deletePromo(${index})" title="Xoá">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    </tr>
`);
    });
}

function renderCustomerTable() {
    const tbody = $('#customerTableBody');
    tbody.empty();

    const uniqueCustomers = [];
    const customerMap = new Map();

    allBookings.forEach(b => {
        if (!b.customerName || !b.customerPhone) return;
        const key = b.customerPhone;
        if (!customerMap.has(key)) {
            customerMap.set(key, {
                name: b.customerName,
                phone: b.customerPhone,
                totalSpent: 0,
                bookingCount: 0
            });
        }

        const customer = customerMap.get(key);
        customer.bookingCount += 1;
        if (b.status === "Confirmed") {
            customer.totalSpent += (Number(b.totalPrice) || 0);
        }
    });

    uniqueCustomers.push(...customerMap.values());

    if (uniqueCustomers.length === 0) {
        tbody.html(`<tr><td colspan="4" class="text-center text-muted py-4">Chưa có dữ liệu khách hàng.</td></tr>`);
        $('#customerPagination').empty();
        $('#customerPaginationInfo').text('');
        return;
    }

    const start = (currentCustomerPage - 1) * itemsPerPage;
    const pagedCustomers = uniqueCustomers.slice(start, start + itemsPerPage);

    pagedCustomers.forEach((c, index) => {
        let membership = '<span class="badge bg-secondary">Mới</span>';
        if (c.totalSpent >= 20000000) membership = '<span class="badge bg-warning text-dark"><i class="bi bi-star-fill me-1"></i>VIP Vàng</span>';
        else if (c.totalSpent >= 5000000) membership = '<span class="badge bg-info text-white"><i class="bi bi-star-half me-1"></i>Bạc</span>';

        tbody.append(`
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark">${c.name}</div>
                    <small class="text-muted">${c.bookingCount} lần đặt (${formatVND(c.totalSpent)})</small>
                </td>
                <td class="text-primary">${c.phone}</td>
                <td>${membership}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-light btn-sm text-danger shadow-sm" title="Xoá khách hàng" onclick="deleteCustomer('${c.phone}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `);
    });

    const totalPages = Math.ceil(uniqueCustomers.length / itemsPerPage);
    $('#customerPaginationInfo').text(`Trang ${currentCustomerPage} / ${totalPages || 1}`);
    renderPaginationUI(totalPages, currentCustomerPage, 'customerPagination');
}

function renderReviewTable() {
    const tbody = $('#reviewTableBody');
    tbody.empty();

    if (fakeReviews.length === 0) {
        tbody.html(`<tr><td colspan="4" class="text-center text-muted py-4">Chưa có đánh giá nào.</td></tr>`);
        $('#reviewPagination').empty();
        $('#reviewPaginationInfo').text('');
        return;
    }

    // Phân trang
    const start = (currentReviewPage - 1) * itemsPerPage;
    const pagedReviews = fakeReviews.slice(start, start + itemsPerPage);

    pagedReviews.forEach((review, idx) => {
        const index = start + idx;
        let statusBadge = review.status === "published"
            ? '<span class="badge badge-soft-success">Đã duyệt</span>'
            : '<span class="badge badge-soft-danger">Đã ẩn</span>';

        let actionBtn = review.status === "published"
            ? `<button class="btn btn-sm btn-light text-danger shadow-sm" onclick="toggleReviewStatus(${index})" title="Ẩn đánh giá"><i class="bi bi-eye-slash"></i></button>`
            : `<button class="btn btn-sm btn-light text-success shadow-sm" onclick="toggleReviewStatus(${index})" title="Hiện đánh giá"><i class="bi bi-eye"></i></button>`;

        tbody.append(`
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark">${review.customerName}</div>
                    <small class="text-muted">${review.date}</small>
                </td>
                <td class="text-primary" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${review.roomName}</td>
                <td><span class="badge bg-warning text-dark"><i class="bi bi-star-fill me-1"></i>${review.rating}</span></td>
                <td style="max-width: 300px;">
                    <div class="small text-muted" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">"${review.content}"</div>
                </td>
                <td class="text-end pe-4">
                    ${statusBadge}
                    ${actionBtn}
                </td>
            </tr>
        `);
    });

    const totalPages = Math.ceil(fakeReviews.length / itemsPerPage);
    $('#reviewPaginationInfo').text(`Trang ${currentReviewPage} / ${totalPages || 1}`);
    renderPaginationUI(totalPages, currentReviewPage, 'reviewPagination');
}

window.toggleReviewStatus = function (index) {
    if (fakeReviews[index].status === "published") {
        showConfirm('Ẩn đánh giá', 'Bạn muốn ẩn đánh giá này khỏi người dùng?', function () {
            fakeReviews[index].status = "hidden";
            localStorage.setItem('stayeasy_reviews', JSON.stringify(fakeReviews));
            renderReviewTable();
            showToast('Đã ẩn đánh giá', 'success');
        });
    } else {
        fakeReviews[index].status = "published";
        localStorage.setItem('stayeasy_reviews', JSON.stringify(fakeReviews));
        renderReviewTable();
        showToast('Đã hiển thị đánh giá', 'success');
    }
}

function renderPaginationUI(totalPages, currentPage, elementId) {
    const pag = $('#' + elementId);
    pag.empty();
    if (totalPages <= 1) return;

    pag.append(`<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link shadow-none border-0 rounded-circle mx-1 text-muted fw-bold" href="#" data-page="${currentPage - 1}">&laquo;</a></li>`);
    for (let i = 1; i <= totalPages; i++) {
        pag.append(`<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link shadow-none border-0 rounded-circle mx-1 fw-bold" href="#" data-page="${i}">${i}</a></li>`);
    }
    pag.append(`<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link shadow-none border-0 rounded-circle mx-1 text-muted fw-bold" href="#" data-page="${currentPage + 1}">&raquo;</a></li>`);
}

// ================= API ACTIONS =================

window.editRoom = function (id) {
    const room = allRooms.find(r => r.id == id);
    if (!room) return;
    $('#roomModalTitle').text('Chỉnh Sửa Phòng');
    $('#adminRoomId').val(room.id);
    $('#admName').val(room.name);
    $('#admLocation').val(room.location);
    $('#admPrice').val(room.price);
    $('#admGuests').val(room.guests);
    $('#admType').val(room.type);
    $('#admImage').val(room.image);
    roomModal.show();
}

window.deleteRoom = async function (id) {
    showConfirm('Xoá phòng', 'Xoá phòng này khỏi hệ thống?', async function () {
        try {
            await API.deleteRoom(id);
            showToast('Đã xoá phòng!', 'success');
            loadAdminData();
        } catch (e) {
            showToast('Lỗi khi xoá phòng!', 'error');
        }
    }, 'danger');
}

window.updateBookingStatus = async function (id, newStatus) {
    const action = newStatus === 'Confirmed' ? 'DUYỆT' : 'TỪ CHỐI';
    showConfirm(`Xác nhận ${action}`, `Xác nhận ${action} đơn này?`, async function () {
        try {
            if (API.updateBooking) {
                await API.updateBooking(id, { status: newStatus });
            }
            showToast(`Đã ${action.toLowerCase()} đơn!`, 'success');
            loadAdminData();
        } catch (e) {
            showToast('Lỗi duyệt đơn!', 'error');
        }
    });
}

window.deleteBooking = async function (id) {
    showConfirm('Xoá đơn đặt phòng', 'Xoá vĩnh viễn đơn này? Hành động không thể hoàn tác!', async function () {
        try {
            if (API.deleteBooking) {
                await API.deleteBooking(id);
            }
            showToast('Đã xoá đơn!', 'success');
            loadAdminData();
        } catch (e) {
            showToast('Xoá thất bại!', 'error');
        }
    }, 'danger');
}

window.deletePromo = function (index) {
    showConfirm('Xoá mã khuyến mãi', 'Chắc chắn muốn xoá mã giảm giá này?', function () {
        promotions.splice(index, 1);
        localStorage.setItem('stayeasy_promos', JSON.stringify(promotions));
        renderPromotions();
        showToast('Đã xoá mã khuyến mãi!', 'success');
    }, 'danger');
}
window.editPromo = function (index) {
    const p = promotions[index];
    if (!p) return;
    editingPromoIndex = index;
    $('#promoModalTitle').text('Chỉnh Sửa Mã');
    $('#btnPromoSubmit').text('Lưu Thay Đổi');
    $('#promoCodeInput').val(p.code);
    $('#promoDiscountInput').val(p.discount);
    $('#promoRoomInput').val(p.roomName || '');
    $('#promoModal').modal('show');
}
window.viewAsGuest = function () {
    window.open('index.html', '_blank');
}

// ============= CHART & ANALYTICS =============
function renderRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const last7Days = [];
    const revenueData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' });
        last7Days.push(dateStr);

        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const dayRevenue = allBookings
            .filter(b => b.status === 'Confirmed' && new Date(b.checkIn) >= dayStart && new Date(b.checkIn) <= dayEnd)
            .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
        revenueData.push(dayRevenue);
    }

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: revenueData,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                filler: { propagate: true }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => formatVND(v).replace('₫', '').trim() },
                    grid: { color: '#f1f5f9' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderTopRooms() {
    const container = document.getElementById('topRoomsList');
    if (!container) return;

    const roomBookingCount = {};
    allBookings.forEach(b => {
        if (b.status === 'Confirmed') {
            roomBookingCount[b.roomName] = (roomBookingCount[b.roomName] || 0) + 1;
        }
    });

    const topRooms = Object.entries(roomBookingCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (topRooms.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><h6>Chưa có dữ liệu</h6></div>';
        return;
    }

    let html = '';
    topRooms.forEach((item, idx) => {
        const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other';
        html += `
            <div class="top-room-item">
                <div class="top-room-rank ${rankClass}">${idx + 1}</div>
                <div class="flex-grow-1 min-w-0">
                    <div class="fw-bold text-dark small text-truncate">${item[0]}</div>
                    <small class="text-muted">${item[1]} đơn đặt</small>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderActivityFeed() {
    const container = document.getElementById('activityFeed');
    if (!container) return;

    const activities = [];

    allBookings.slice(-10).reverse().forEach(b => {
        let icon = 'bi-calendar-check', color = 'bg-primary';
        if (b.status === 'Pending') { icon = 'bi-hourglass-split'; color = 'bg-warning'; }
        else if (b.status === 'Cancelled') { icon = 'bi-x-circle'; color = 'bg-danger'; }

        activities.push({
            icon, color,
            title: `${b.customerName || 'Khách'} ${b.status === 'Pending' ? 'đặt phòng' : b.status === 'Confirmed' ? 'xác nhận' : 'hủy'} ${b.roomName || 'phòng'}`,
            meta: `${formatVND(b.totalPrice)} • ${b.checkIn}`
        });
    });

    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><h6>Chưa có hoạt động</h6></div>';
        return;
    }

    let html = '';
    activities.forEach(a => {
        html += `
            <div class="activity-item">
                <div class="activity-icon ${a.color}" style="background: linear-gradient(135deg, var(--primary-color), #4f46e5); color: white;">
                    <i class="bi ${a.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${a.title}</div>
                    <div class="activity-meta">${a.meta}</div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function updateDashboardPromoCount() {
    $('#dashPromoCount').text(`${promotions.length} mã đang chạy`);
}

// ============= BOOKING TOOLS =============
window.filterBookingStatus = function (status) {
    bookingStatusFilter = status;
    currentBookingPage = 1;

    // Cập nhật UI chip active
    $('.filter-chip').removeClass('active');
    $(`.filter-chip:contains("${status === 'all' ? 'Tất cả' : status === 'Pending' ? 'Chờ duyệt' : status === 'Confirmed' ? 'Đã duyệt' : 'Đã hủy'}")`).addClass('active');

    renderBookingTable();
};

window.viewBookingDetail = function (id) {
    const booking = allBookings.find(b => b.id == id);
    if (!booking) return;

    const modal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));
    const body = document.getElementById('bookingDetailBody');

    const nights = booking.checkIn && booking.checkOut
        ? Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))
        : 0;

    body.innerHTML = `
        <div class="booking-detail-row">
            <span class="label">Mã đơn:</span>
            <span class="value">#${booking.id}</span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Khách hàng:</span>
            <span class="value">${booking.customerName || 'N/A'}</span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Số điện thoại:</span>
            <span class="value">${booking.customerPhone || 'N/A'}</span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Phòng:</span>
            <span class="value">${booking.roomName || 'N/A'}</span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Check-in:</span>
            <span class="value">${booking.checkIn || 'N/A'} ${booking.checkInTime ? `<span class="badge bg-light text-primary">${booking.checkInTime}</span>` : ''}</span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Check-out:</span>
            <span class="value">${booking.checkOut || 'N/A'} ${booking.checkOutTime ? `<span class="badge bg-light text-danger">${booking.checkOutTime}</span>` : ''}</span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Số đêm:</span>
            <span class="value">${nights} đêm</span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Số khách:</span>
            <span class="value">
                <span class="badge bg-light text-dark border"><i class="bi bi-person me-1"></i>${booking.adults || 1} Người lớn</span>
                <span class="badge bg-light text-dark border"><i class="bi bi-person-badge me-1"></i>${booking.children || 0} Trẻ em</span>
            </span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Tổng tiền:</span>
            <span class="value text-success fw-bold">${formatVND(booking.totalPrice)}</span>
        </div>
        <div class="booking-detail-row">
            <span class="label">Trạng thái:</span>
            <span class="value">
                ${booking.status === 'Pending' ? '<span class="badge badge-soft-warning">Chờ duyệt</span>' :
            booking.status === 'Confirmed' ? '<span class="badge badge-soft-success">Đã duyệt</span>' :
                '<span class="badge badge-soft-danger">Đã hủy</span>'}
            </span>
        </div>
    `;

    modal.show();
};

window.exportBookingsCSV = function () {
    if (allBookings.length === 0) {
        showToast('Không có dữ liệu để xuất!', 'warning');
        return;
    }

    let csv = 'Mã đơn,Khách hàng,SĐT,Phòng,Check-in,Check-out,Tổng tiền,Trạng thái\n';

    allBookings.forEach(b => {
        const row = [
            `"${b.id}"`,
            `"${b.customerName || ''}"`,
            `"${b.customerPhone || ''}"`,
            `"${b.roomName || ''}"`,
            `"${b.checkIn || ''}"`,
            `"${b.checkOut || ''}"`,
            `"${b.totalPrice || 0}"`,
            `"${b.status || ''}"`
        ].join(',');
        csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Đã xuất file CSV thành công!', 'success');
};

// ===== BOOKING FORM FUNCTIONS =====
let currentEditingBookingId = null;

window.openBookingForm = function (bookingId = null) {
    const modal = new bootstrap.Modal(document.getElementById('bookingFormModal'));
    const form = document.getElementById('bookingForm');

    // Load room names trước
    loadRoomNamesToSelect();

    if (bookingId) {
        // Edit mode - load dữ liệu cũ từ allBookings (đã load từ API)
        document.getElementById('bookingFormTitle').textContent = 'Sửa đơn đặt phòng';
        const booking = allBookings.find(b => b.id == bookingId);

        if (booking) {
            currentEditingBookingId = bookingId;
            document.getElementById('bookingId').value = booking.id;
            document.getElementById('bCustomerName').value = booking.customerName || '';
            document.getElementById('bCustomerEmail').value = booking.customerEmail || '';
            document.getElementById('bCustomerPhone').value = booking.customerPhone || '';
            document.getElementById('bRoomName').value = booking.roomName || '';
            document.getElementById('bCheckIn').value = booking.checkIn || '';
            document.getElementById('bCheckInTime').value = booking.checkInTime || '14:00';
            document.getElementById('bCheckOut').value = booking.checkOut || '';
            document.getElementById('bCheckOutTime').value = booking.checkOutTime || '12:00';
            document.getElementById('bAdults').value = booking.adults || 1;
            document.getElementById('bChildren').value = booking.children || 0;
            document.getElementById('bTotalPrice').value = booking.totalPrice || 0;
            document.getElementById('bStatus').value = booking.status || 'Pending';

            // Update time picker displays
            document.getElementById('bCheckInTimeDisplay').value = booking.checkInTime || '14:00';
            document.getElementById('bCheckOutTimeDisplay').value = booking.checkOutTime || '12:00';
        }
    } else {
        // Add mode - reset form với giá trị mặc định
        document.getElementById('bookingFormTitle').textContent = 'Thêm đơn đặt phòng';
        currentEditingBookingId = null;
        form.reset();
        document.getElementById('bCheckInTime').value = '14:00';
        document.getElementById('bCheckOutTime').value = '12:00';
        document.getElementById('bAdults').value = 1;
        document.getElementById('bChildren').value = 0;
        document.getElementById('bStatus').value = 'Pending';
        document.getElementById('bCheckInTimeDisplay').value = '14:00';
        document.getElementById('bCheckOutTimeDisplay').value = '12:00';
    }

    modal.show();
};

function loadRoomNamesToSelect() {
    API.getRooms().then(rooms => {
        const select = document.getElementById('bRoomName');
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Chọn phòng --</option>';
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.name;
            option.textContent = room.name;
            select.appendChild(option);
        });
        select.value = currentValue;
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveBooking();
        });
    }

    // Sync time picker displays khi modal mở
    const bookingFormModal = document.getElementById('bookingFormModal');
    if (bookingFormModal) {
        bookingFormModal.addEventListener('show.bs.modal', function () {
            setTimeout(() => {
                const checkInTime = document.getElementById('bCheckInTime').value;
                const checkOutTime = document.getElementById('bCheckOutTime').value;
                document.getElementById('bCheckInTimeDisplay').value = checkInTime;
                document.getElementById('bCheckOutTimeDisplay').value = checkOutTime;
            }, 100);
        });
    }
});

async function saveBooking() {
    const bookingId = document.getElementById('bookingId').value;
    const customerName = document.getElementById('bCustomerName').value.trim();
    const customerEmail = document.getElementById('bCustomerEmail').value.trim();
    const customerPhone = document.getElementById('bCustomerPhone').value.trim();
    const roomName = document.getElementById('bRoomName').value.trim();
    const checkIn = document.getElementById('bCheckIn').value;
    const checkInTime = document.getElementById('bCheckInTime').value;
    const checkOut = document.getElementById('bCheckOut').value;
    const checkOutTime = document.getElementById('bCheckOutTime').value;
    const adults = parseInt(document.getElementById('bAdults').value) || 1;
    const children = parseInt(document.getElementById('bChildren').value) || 0;
    const totalPrice = parseFloat(document.getElementById('bTotalPrice').value) || 0;
    const status = document.getElementById('bStatus').value;

    if (!customerName || !customerEmail || !customerPhone || !roomName || !checkIn || !checkOut) {
        showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'warning');
        return;
    }

    if (!customerEmail.includes('@')) {
        showToast('Email phải chứa ký tự @', 'warning');
        return;
    }

    const bookingData = {
        customerName,
        customerEmail,
        customerPhone,
        roomName,
        checkIn,
        checkInTime,
        checkOut,
        checkOutTime,
        adults,
        children,
        totalPrice,
        status: status || 'Pending'
    };

    try {
        if (currentEditingBookingId) {
            // Update existing - cả API và localStorage
            await API.updateBooking(currentEditingBookingId, bookingData);

            // Update localStorage
            let bookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
            const index = bookings.findIndex(b => b.id == currentEditingBookingId);
            if (index !== -1) {
                bookings[index] = { ...bookings[index], ...bookingData };
                localStorage.setItem('stayeasy_bookings', JSON.stringify(bookings));
            }

            showToast('Cập nhật đơn đặt phòng thành công!', 'success');
        } else {
            // Add new - cả API và localStorage
            const newBooking = await API.createBooking(bookingData);

            let bookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
            bookings.push(newBooking);
            localStorage.setItem('stayeasy_bookings', JSON.stringify(bookings));

            showToast('Thêm đơn đặt phòng thành công!', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('bookingFormModal')).hide();
        await loadAdminData();
    } catch (error) {
        showToast('Lỗi khi lưu đơn đặt phòng!', 'error');
        console.error(error);
    }
}

window.editBooking = function (bookingId) {
    openBookingForm(bookingId);
};

// ===== DELETE CUSTOMER =====
window.deleteCustomer = async function (phone) {
    if (!confirm(`Bạn có chắc muốn xoá tất cả đơn đặt phòng của khách hàng này?`)) return;

    try {
        // Tìm tất cả booking của khách hàng này
        const customerBookings = allBookings.filter(b => b.customerPhone === phone);

        // Xoá từ API
        for (const booking of customerBookings) {
            try {
                await API.deleteBooking(booking.id);
            } catch (e) {
                console.warn('Không xoá được từ API:', booking.id);
            }
        }

        // Xoá từ localStorage
        let bookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
        bookings = bookings.filter(b => b.customerPhone !== phone);
        localStorage.setItem('stayeasy_bookings', JSON.stringify(bookings));

        showToast('Xoá khách hàng thành công!', 'success');
        await loadAdminData();
    } catch (error) {
        showToast('Lỗi khi xoá khách hàng!', 'error');
        console.error(error);
    }
};

window.deleteAllCustomers = async function () {
    if (!confirm('Bạn có chắc muốn xoá TẤT CẢ khách hàng và đơn đặt phòng? Hành động này không thể hoàn tác!')) return;

    try {
        // Xoá tất cả từ API
        for (const booking of allBookings) {
            try {
                await API.deleteBooking(booking.id);
            } catch (e) {
                console.warn('Không xoá được từ API:', booking.id);
            }
        }

        // Xoá tất cả từ localStorage
        localStorage.setItem('stayeasy_bookings', JSON.stringify([]));

        showToast('Xoá tất cả khách hàng thành công!', 'success');
        await loadAdminData();
    } catch (error) {
        showToast('Lỗi khi xoá tất cả khách hàng!', 'error');
        console.error(error);
    }
};

// ===== ADMIN TIME PICKER 2 COLUMNS =====
document.addEventListener('DOMContentLoaded', function () {
    // Check-in time picker
    const checkInTrigger = document.getElementById('bCheckInTimeTrigger');
    const checkInPanel = document.getElementById('bCheckInTimePanel');
    const checkInDisplay = document.getElementById('bCheckInTimeDisplay');
    const checkInHidden = document.getElementById('bCheckInTime');

    if (checkInTrigger && checkInPanel) {
        function updateCheckInDisplay() {
            const time = checkInHidden.value;
            checkInDisplay.value = time;
        }

        function toggleCheckInPanel(open) {
            if (open === undefined) open = !checkInPanel.classList.contains('open');
            checkInPanel.classList.toggle('open', open);
            checkInTrigger.classList.toggle('active', open);
        }

        checkInTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleCheckInPanel();
        });

        document.querySelectorAll('#bCheckInTimePanel .atp-time-item').forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                const time = this.dataset.time;
                checkInHidden.value = time;
                document.querySelectorAll('#bCheckInTimePanel .atp-time-item').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                updateCheckInDisplay();
                toggleCheckInPanel(false);
            });
        });

        document.addEventListener('click', function (e) {
            if (!checkInPanel.contains(e.target) && !checkInTrigger.contains(e.target)) {
                toggleCheckInPanel(false);
            }
        });

        updateCheckInDisplay();
    }

    // Check-out time picker
    const checkOutTrigger = document.getElementById('bCheckOutTimeTrigger');
    const checkOutPanel = document.getElementById('bCheckOutTimePanel');
    const checkOutDisplay = document.getElementById('bCheckOutTimeDisplay');
    const checkOutHidden = document.getElementById('bCheckOutTime');

    if (checkOutTrigger && checkOutPanel) {
        function updateCheckOutDisplay() {
            const time = checkOutHidden.value;
            checkOutDisplay.value = time;
        }

        function toggleCheckOutPanel(open) {
            if (open === undefined) open = !checkOutPanel.classList.contains('open');
            checkOutPanel.classList.toggle('open', open);
            checkOutTrigger.classList.toggle('active', open);
        }

        checkOutTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleCheckOutPanel();
        });

        document.querySelectorAll('#bCheckOutTimePanel .atp-time-item').forEach(item => {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                const time = this.dataset.time;
                checkOutHidden.value = time;
                document.querySelectorAll('#bCheckOutTimePanel .atp-time-item').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                updateCheckOutDisplay();
                toggleCheckOutPanel(false);
            });
        });

        document.addEventListener('click', function (e) {
            if (!checkOutPanel.contains(e.target) && !checkOutTrigger.contains(e.target)) {
                toggleCheckOutPanel(false);
            }
        });

        updateCheckOutDisplay();
    }
});