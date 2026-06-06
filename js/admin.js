// Auth Guard — đọc từ adminSession (tách biệt hoàn toàn với guestSession)
const _adminSession = JSON.parse(localStorage.getItem('adminSession')) || {};
const _adminEmail = _adminSession.email || '';
const _adminRole = _adminSession.role || '';
const _isAuthenticated = (_adminRole === 'superadmin' && _adminEmail !== '');

if (!_isAuthenticated) {
    // Hiển thị login modal khi DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        const loginModalEl = document.getElementById('loginModal');
        if (!loginModalEl) {
            // Fallback: nếu không có modal, set adminSession tự động (dev mode)
            localStorage.setItem('adminSession', JSON.stringify({ email: 'admin@gmail.com', name: 'Admin', role: 'superadmin' }));
            location.reload();
            return;
        }
        const loginModal = new bootstrap.Modal(loginModalEl);
        loginModal.show();

        document.getElementById('btnLogin').addEventListener('click', function () {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (email === 'admin@gmail.com' && password === 'admin123') {
                localStorage.setItem('adminSession', JSON.stringify({ email, name: 'Quản Trị Viên', role: 'superadmin' }));
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
    localStorage.removeItem('adminSession');
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
    { code: 'STAYEASY15', discount: 15, rooms: [] },
    { code: 'SUMMER2026', discount: 20, rooms: [] }
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
    const _sess = JSON.parse(localStorage.getItem('adminSession')) || {};
    const currentAdminName = (_sess.name || 'Quản Trị Viên').replace(/Tổng /i, '').trim();
    const currentAdminRole = _sess.role || 'admin';

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
        const scope = $('input[name="promoScope"]:checked').val();
        const rooms = scope === 'all' ? [] : (window._promoSelectedRooms || []);

        if (scope === 'specific' && rooms.length === 0) {
            showToast('Vui lòng chọn ít nhất một phòng!', 'warning'); return;
        }

        if (editingPromoIndex >= 0) {
            if (promotions.some((p, i) => p.code === code && i !== editingPromoIndex)) {
                showToast('Mã này đã tồn tại!', 'warning'); return;
            }
            promotions[editingPromoIndex] = { code, discount, rooms };
        } else {
            if (promotions.some(p => p.code === code)) {
                showToast('Mã này đã tồn tại!', 'warning'); return;
            }
            promotions.push({ code, discount, rooms });
        }

        localStorage.setItem('stayeasy_promos', JSON.stringify(promotions));
        const wasEditing = editingPromoIndex >= 0;
        $('#promoModal').modal('hide');
        $(this)[0].reset();
        editingPromoIndex = -1;
        renderPromotions();
        showToast(wasEditing ? 'Cập nhật thành công!' : 'Thêm mã khuyến mãi thành công!', 'success');
    });
    $('#promoModal').on('hidden.bs.modal', function () {
        editingPromoIndex = -1;
        $('#promoModalTitle').text('Tạo Mã Mới');
        $('#btnPromoSubmit').text('Thêm Mã Ưu Đãi');
        $('#promoForm')[0].reset();
        window._promoSelectedRooms = [];
        $('#promoSelectedRoomTags').empty();
        $('#promoRoomPanel').hide();
        $('#scopeAll').prop('checked', true);
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

    const pendingCount = allBookings.filter(b => b.status === 'pending').length;
    const approvedCount = allBookings.filter(b => b.status === 'approved').length;

    // Cập nhật 4 thẻ dashboard mới
    const revenue = allBookings.reduce((sum, b) => b.status === 'approved' ? sum + (Number(b.totalPrice) || 0) : sum, 0);
    $('#dashRevenue').text(formatVND(revenue));
    $('#dashPendingBookings').html(`<i class="bi bi-clock-history me-1"></i>${pendingCount} đơn chờ admin duyệt`);
    $('#dashPaidCount').text(pendingCount + ' đơn');
    $('#dashPendingCount').text(approvedCount + ' đơn');

    // Badge thông báo: đơn pending chờ duyệt
    const urgentCount = pendingCount;
    $('#notificationCount').text(urgentCount || '');
    const notiList = $('#notificationList');
    notiList.empty();

    const paidBookings = allBookings.filter(b => b.status === 'pending');
    if (paidBookings.length === 0) {
        notiList.append('<li><span class="dropdown-item text-muted text-center py-3">Không có thông báo mới</span></li>');
    } else {
        paidBookings.forEach(b => {
            notiList.append(`
                <li><a class="dropdown-item border-bottom py-2" href="#" onclick="switchAdminTab('#tab-bookings')">
                    <i class="bi bi-bell-fill text-warning me-2"></i>
                    <span class="fw-bold text-primary">${b.customerName || 'Khách hàng'}</span> đã thanh toán!
                    <div class="small text-muted">${b.roomName || ''} · Mã: ${b.id || ''}</div>
                </a></li>
            `);
        });
    }
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
    const counts = { all: allBookings.length, pending: 0, approved: 0, cancelled: 0 };
    allBookings.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
    const unpaidCount = allBookings.filter(b => b.status !== 'cancelled' && !b.isPaid).length;
    $('#countAll').text(counts.all);
    $('#countPending').text(counts.pending);
    $('#countPaid').text(counts.approved);
    $('#countUnpaid').text(unpaidCount);

    // Badge sidebar đỏ (đơn approved chờ duyệt) + vàng (đơn pending chờ TT)
    const paidBadge = document.getElementById('sidebarBadgePaid');
    const pendingBadge = document.getElementById('sidebarBadgePending');
    if (paidBadge) paidBadge.textContent = counts.approved || '';
    if (pendingBadge) pendingBadge.textContent = counts.pending || '';

    if (allBookings.length === 0) {
        tbody.html(`<tr><td colspan="7" class="text-center text-muted py-4">Hiện chưa có đơn đặt phòng nào.</td></tr>`);
        $('#bookingPagination').empty(); $('#bookingPaginationInfo').text(''); return;
    }

    let filtered = [...allBookings];
    if (bookingStatusFilter === 'unpaid') {
        filtered = filtered.filter(b => b.status !== 'cancelled' && !b.isPaid);
    } else if (bookingStatusFilter !== 'all') {
        filtered = filtered.filter(b => b.status === bookingStatusFilter);
    }
    if (bookingKeyword) {
        const kw = removeAccents(bookingKeyword);
        filtered = filtered.filter(b =>
            removeAccents(b.customerName || '').includes(kw) ||
            removeAccents(b.roomName || '').includes(kw) ||
            removeAccents(b.id || '').includes(kw) ||
            removeAccents(b.customerPhone || '').includes(kw)
        );
    }

    if (filtered.length === 0) {
        tbody.html(`<tr><td colspan="7" class="text-center text-muted py-4">Không có đơn phù hợp.</td></tr>`);
        $('#bookingPagination').empty(); $('#bookingPaginationInfo').text(''); return;
    }

    const statusPriority = { 'pending': 0, 'approved': 1, 'cancelled': 2 };
    let sortedBookings = [...filtered].sort((a, b) => {
        const pa = statusPriority[a.status] ?? 99;
        const pb = statusPriority[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        // Cùng status: mới nhất lên trước (theo id hoặc createdAt)
        const aTime = a.confirmedAt ? new Date(a.confirmedAt.split(' ')[0].split('/').reverse().join('-') + ' ' + (a.confirmedAt.split(' ')[1] || '')) : null;
        const bTime = b.confirmedAt ? new Date(b.confirmedAt.split(' ')[0].split('/').reverse().join('-') + ' ' + (b.confirmedAt.split(' ')[1] || '')) : null;
        if (bTime && aTime) return bTime - aTime;
        if (bTime) return 1;
        if (aTime) return -1;
        return Number(b.id) - Number(a.id);
    });
    const start = (currentBookingPage - 1) * itemsPerPage;
    const pagedBookings = sortedBookings.slice(start, start + itemsPerPage);

    const methodMap = { bank: '🏦 Ngân hàng', momo: '📱 MoMo', card: '💳 Thẻ' };

    pagedBookings.forEach(b => {
        let statusBadge = '';
        let actionBtns = `<button class="btn btn-sm btn-light text-info shadow-sm me-1" onclick="viewBookingDetail('${b.id}')" title="Xem chi tiết"><i class="bi bi-eye"></i></button>`;

        if (b.status === 'pending') {
            const payLabel = b.isPaid ? '✅ Đã TT' : '⏳ Chưa TT';
            statusBadge = `<span class="badge badge-soft-warning"><i class="bi bi-hourglass-split me-1"></i>Chờ duyệt</span>
                   <span class="badge ${b.isPaid ? 'badge-soft-success' : 'bg-warning text-dark'} ms-1" style="font-size:10px;">${payLabel}</span>`;
            actionBtns += `
        <button class="btn btn-sm btn-light text-primary shadow-sm me-1" onclick="openEditBooking('${b.id}')" title="Sửa"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-success shadow-sm me-1" onclick="updateBookingStatus('${b.id}', 'approved')" title="Duyệt đơn"><i class="bi bi-check-lg"></i></button>
        <button class="btn btn-sm btn-light text-danger shadow-sm" onclick="cancelBooking('${b.id}')" title="Huỷ"><i class="bi bi-x-lg"></i></button>
    `;
        } else if (b.status === 'approved') {
            const payLabel = b.isPaid ? '✅ Đã TT' : '⚠️ Chưa TT';
            statusBadge = `<span class="badge badge-soft-success"><i class="bi bi-check-circle me-1"></i>Đã duyệt</span>
                   <span class="badge ${b.isPaid ? 'badge-soft-success' : 'bg-danger text-white'} ms-1" style="font-size:10px;">${payLabel}</span>`;
            actionBtns += `
        <button class="btn btn-sm btn-light text-primary shadow-sm me-1" onclick="openEditBooking('${b.id}')" title="Sửa ghi chú"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-light text-danger shadow-sm" onclick="cancelBooking('${b.id}')" title="Huỷ"><i class="bi bi-x-lg"></i></button>
    `;
        } else {
            statusBadge = '<span class="badge badge-soft-danger"><i class="bi bi-x-circle me-1"></i>Đã huỷ</span>';
            actionBtns += `<button class="btn btn-sm btn-light text-danger shadow-sm" onclick="deleteBooking('${b.id}')" title="Xoá vĩnh viễn"><i class="bi bi-trash"></i></button>`;
        }

        tbody.append(`
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark small">${b.id || ''}</div>
                    <div class="text-muted small mt-1">${b.createdAt || ''}</div>
                </td>
                <td>
                    <div class="fw-bold text-dark">${b.customerName || 'Khách hàng'}</div>
                    <div class="small text-muted">SĐT: ${b.customerPhone || 'N/A'}</div>
                </td>
                <td><span class="text-primary fw-bold">${b.roomName || 'Phòng'}</span></td>
                <td>
                    <div class="small"><i class="bi bi-arrow-right-circle text-muted me-1"></i>${b.checkIn || ''} ${b.checkInTime ? `<span class="badge bg-light text-primary border">${b.checkInTime}</span>` : ''}</div>
                    <div class="small"><i class="bi bi-arrow-left-circle text-muted me-1"></i>${b.checkOut || ''} ${b.checkOutTime ? `<span class="badge bg-light text-danger border">${b.checkOutTime}</span>` : ''}</div>
                </td>
                <td>
                    <div class="fw-bold text-success">${formatVND(b.totalPrice)}</div>
                    <div class="small text-muted">${methodMap[b.paymentMethod] || '—'}</div>
                </td>
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

    const searchTerm = $('#searchPromoInput').val().trim().toUpperCase();

    // Migrate old data: roomName string → rooms array
    promotions = promotions.map(p => {
        if (!p.rooms) {
            p.rooms = p.roomName ? [{ id: null, name: p.roomName }] : [];
            delete p.roomName;
        }
        return p;
    });

    const filteredPromos = promotions.filter(p =>
        p.code.toUpperCase().includes(searchTerm) ||
        (p.rooms && p.rooms.some(r => r.name.toUpperCase().includes(searchTerm)))
    );

    if (filteredPromos.length === 0) {
        tbody.html(`<tr><td colspan="5" class="text-center text-muted py-4">Chưa có mã khuyến mãi nào.</td></tr>`);
        return;
    }

    filteredPromos.forEach((p, index) => {
        const roomBadges = (!p.rooms || p.rooms.length === 0)
            ? `<span class="badge bg-secondary"><i class="bi bi-globe me-1"></i>Tất cả phòng</span>`
            : p.rooms.map(r => `<span class="badge bg-warning text-dark me-1 mb-1"><i class="bi bi-building me-1"></i>${r.name}</span>`).join('');

        tbody.append(`
    <tr>
        <td class="ps-4"><span class="badge bg-danger fs-6">${p.code}</span></td>
        <td class="fw-bold text-success fs-5">Giảm ${p.discount}%</td>
        <td class="text-muted small" style="max-width:220px;">
            <div class="d-flex flex-wrap gap-1">${roomBadges}</div>
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
    const action = newStatus === 'approved' ? 'DUYỆT' : 'TỪ CHỐI';
    showConfirm(`Xác nhận ${action}`, `Xác nhận ${action} đơn này?`, async function () {
        try {
            const bookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
            const idx = bookings.findIndex(b => b.id == id);
            if (idx !== -1) {
                bookings[idx].status = newStatus;
                if (newStatus === 'approved') {
                    const now = new Date();
                    bookings[idx].confirmedAt = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    bookings[idx].confirmedBy = 'Quản Trị Viên';
                    syncMyOrder(bookings[idx]);
                }
                localStorage.setItem('stayeasy_bookings', JSON.stringify(bookings));
            }
            if (API.updateBooking) await API.updateBooking(id, { status: newStatus });
            showToast(`Đã ${action.toLowerCase()} đơn!`, 'success');
            loadAdminData();
        } catch (e) {
            showToast('Lỗi duyệt đơn!', 'error');
        }
    });
}

window.cancelBooking = async function (id) {
    showConfirm('Huỷ đơn đặt phòng', 'Xác nhận HUỶ đơn này? Khách sẽ được thông báo.', async function () {
        try {
            const bookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
            const idx = bookings.findIndex(b => b.id == id);
            if (idx !== -1) {
                bookings[idx].status = 'cancelled';
                syncMyOrder(bookings[idx]);
                localStorage.setItem('stayeasy_bookings', JSON.stringify(bookings));
            }
            if (API.updateBooking) await API.updateBooking(id, { status: 'cancelled' });
            showToast('Đã huỷ đơn!', 'success');
            loadAdminData();
        } catch (e) {
            showToast('Lỗi khi huỷ đơn!', 'error');
        }
    }, 'danger');
}

window.remindBooking = function (id) {
    const bookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
    const idx = bookings.findIndex(b => b.id == id);
    if (idx !== -1) {
        bookings[idx].note = (bookings[idx].note ? bookings[idx].note + ' | ' : '') + 'Đã nhắc TT lúc ' + new Date().toLocaleTimeString('vi-VN');
        localStorage.setItem('stayeasy_bookings', JSON.stringify(bookings));
    }
    showToast(`Đã ghi nhận nhắc thanh toán đơn ${id}`, 'info');
}

function syncMyOrder(booking) {
    // Đồng bộ trạng thái vào localStorage "đơn của tôi" của khách
    const email = booking.customerEmail || '';
    if (!email) return;
    const key = 'stayeasy_myorders_' + email;
    let orders = JSON.parse(localStorage.getItem(key)) || [];
    const oi = orders.findIndex(o => o.id === booking.id);
    if (oi !== -1) { orders[oi] = { ...orders[oi], ...booking }; }
    else { orders.unshift(booking); }
    localStorage.setItem(key, JSON.stringify(orders));
}

// ===== OPEN EDIT BOOKING MODAL =====
window.openEditBooking = function (id) {
    const booking = allBookings.find(b => b.id == id);
    if (!booking) return;

    const isConfirmed = booking.status === 'approved';
    const isCancelled = booking.status === 'cancelled';
    const isPaid = booking.isPaid === true;

    document.getElementById('ebModalTitle').textContent = `Chỉnh sửa đơn — ${booking.id}`;
    document.getElementById('ebId').value = booking.id;
    document.getElementById('ebName').value = booking.customerName || '';
    document.getElementById('ebPhone').value = booking.customerPhone || '';
    document.getElementById('ebCheckIn').value = booking.checkIn || '';
    document.getElementById('ebCheckOut').value = booking.checkOut || '';
    document.getElementById('ebCheckInTime').value = booking.checkInTime || '14:00';
    document.getElementById('ebCheckOutTime').value = booking.checkOutTime || '12:00';
    // Sync display và active item cho custom picker
    window._pendingEbTimes = {
        checkIn: booking.checkInTime || '14:00',
        checkOut: booking.checkOutTime || '12:00'
    };
    document.getElementById('ebAdults').value = booking.adults || 1;
    document.getElementById('ebChildren').value = booking.children || 0;
    document.getElementById('ebPayMethod').value = booking.paymentMethod || 'bank';
    document.getElementById('ebStatus').value = booking.status || 'pending';
    document.getElementById('ebNote').value = booking.note || '';
    document.getElementById('ebPrice').value = booking.totalPrice || 0;

    // Kiểm soát readonly theo trạng thái
    const readonly = isCancelled;
    ['ebName', 'ebPhone', 'ebCheckIn', 'ebCheckOut', 'ebCheckInTime', 'ebAdults', 'ebChildren', 'ebPayMethod', 'ebStatus', 'ebNote', 'ebPrice'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (readonly) { el.setAttribute('disabled', true); return; }
        el.removeAttribute('disabled');
    });

    // Reset trigger time picker về mặc định
    ['ebCheckInTimeTrigger', 'ebCheckOutTimeTrigger'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.pointerEvents = ''; el.style.opacity = ''; }
    });

    if (isConfirmed) {
        ['ebName', 'ebPhone', 'ebCheckIn', 'ebCheckOut', 'ebCheckInTime', 'ebAdults', 'ebChildren', 'ebPayMethod', 'ebPrice'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('disabled', true);
        });
        // Lock trigger div của custom time picker
        ['ebCheckInTimeTrigger', 'ebCheckOutTimeTrigger'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.pointerEvents = 'none'; }
        });
    }
    if (isPaid) {
        ['ebPrice', 'ebPayMethod'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('disabled', true);
        });
    }

    document.getElementById('ebSaveBtn').style.display = readonly ? 'none' : '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('editBookingModal')).show();
}

$(document).on('click', '#ebSaveBtn', async function () {
    const id = document.getElementById('ebId').value;
    const bookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
    let idx = bookings.findIndex(b => b.id == id);

    // Nếu không có trong localStorage thì lấy từ allBookings (API)
    if (idx === -1) {
        const fromApi = allBookings.find(b => b.id == id);
        if (!fromApi) { showToast('Không tìm thấy đơn!', 'error'); return; }
        bookings.unshift({ ...fromApi });
        idx = 0;
    }

    const old = { ...bookings[idx] };
    const now = new Date();
    const ts = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const changes = [];
    const newName = document.getElementById('ebName').value;
    const newPhone = document.getElementById('ebPhone').value;
    const newCheckIn = document.getElementById('ebCheckIn').value;
    const newCheckOut = document.getElementById('ebCheckOut').value;
    const newNote = document.getElementById('ebNote').value;
    const newStatus = document.getElementById('ebStatus').value;

    if (newName !== old.customerName) changes.push(`Tên: ${old.customerName} → ${newName}`);
    if (newPhone !== old.customerPhone) changes.push(`SĐT: ${old.customerPhone} → ${newPhone}`);
    if (newCheckIn !== old.checkIn) changes.push(`Check-in: ${old.checkIn} → ${newCheckIn}`);
    if (newCheckOut !== old.checkOut) changes.push(`Check-out: ${old.checkOut} → ${newCheckOut}`);
    if (newStatus !== old.status) changes.push(`Trạng thái: ${old.status} → ${newStatus}`);

    bookings[idx] = {
        ...bookings[idx],
        customerName: newName,
        customerPhone: newPhone,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        checkInTime: document.getElementById('ebCheckInTime').value,
        checkOutTime: document.getElementById('ebCheckOutTime').value,
        adults: parseInt(document.getElementById('ebAdults').value) || 1,
        children: parseInt(document.getElementById('ebChildren').value) || 0,
        paymentMethod: document.getElementById('ebPayMethod').disabled ? bookings[idx].paymentMethod : document.getElementById('ebPayMethod').value,
        status: newStatus,
        note: newNote,
        totalPrice: document.getElementById('ebPrice').disabled ? bookings[idx].totalPrice : (parseFloat(document.getElementById('ebPrice').value) || bookings[idx].totalPrice),
        editHistory: [...(bookings[idx].editHistory || []), {
            editedAt: ts,
            editedBy: 'Quản Trị Viên',
            changes: changes.join(' | ') || 'Cập nhật ghi chú'
        }]
    };

    localStorage.setItem('stayeasy_bookings', JSON.stringify(bookings));
    syncMyOrder(bookings[idx]);
    if (API.updateBooking) {
        API.updateBooking(bookings[idx].id, {
            status: bookings[idx].status,
            customerName: bookings[idx].customerName,
            customerPhone: bookings[idx].customerPhone,
            checkIn: bookings[idx].checkIn,
            checkOut: bookings[idx].checkOut,
            checkInTime: bookings[idx].checkInTime,
            checkOutTime: bookings[idx].checkOutTime,
            note: bookings[idx].note,
            editHistory: bookings[idx].editHistory
        }).catch(() => { });
    }
    bootstrap.Modal.getInstance(document.getElementById('editBookingModal')).hide();
    showToast('Đã lưu thay đổi!', 'success');
    loadAdminData();
});
window.deleteBooking = async function (id) {
    showConfirm('Xoá đơn đặt phòng', 'Xoá vĩnh viễn đơn này? Hành động không thể hoàn tác!', async function () {
        try {
            if (API.deleteBooking) {
                await API.deleteBooking(id);
            }
            // Xóa khỏi localStorage
            let localBookings = JSON.parse(localStorage.getItem('stayeasy_bookings')) || [];
            localBookings = localBookings.filter(b => b.id != id);
            localStorage.setItem('stayeasy_bookings', JSON.stringify(localBookings));
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

    const rooms = p.rooms || [];
    window._promoSelectedRooms = [...rooms];

    if (rooms.length === 0) {
        $('#scopeAll').prop('checked', true);
        $('#promoRoomPanel').hide();
    } else {
        $('#scopeSpecific').prop('checked', true);
        $('#promoRoomPanel').show();
        renderPromoRoomList(rooms);
    }

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
            .filter(b => b.status === 'approved' && new Date(b.checkIn) >= dayStart && new Date(b.checkIn) <= dayEnd)
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
        if (b.status === 'approved') {
            roomBookingCount[b.roomName] = (roomBookingCount[b.roomName] || 0) + 1;
        }
    });

    const topRooms = Object.entries(roomBookingCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

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
        if (b.status === 'pending') { icon = 'bi-hourglass-split'; color = 'bg-warning'; }
        else if (b.status === 'cancelled') { icon = 'bi-x-circle'; color = 'bg-danger'; }

        activities.push({
            icon, color,
            title: `${b.customerName || 'Khách'} ${b.status === 'pending' ? 'đặt phòng' : b.status === 'approved' ? 'xác nhận' : 'hủy'} ${b.roomName || 'phòng'}`,
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
    bookingStatusFilter = status === 'unpaid' ? 'unpaid' : status;
    currentBookingPage = 1;

    // Cập nhật UI chip active
    $('.filter-chip').removeClass('active');
    $(`.filter-chip[onclick*="'${status}'"]`).addClass('active');
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
                ${booking.status === 'pending' ? '<span class="badge badge-soft-warning">⏳ Chờ duyệt</span>' :
            booking.status === 'approved' ? '<span class="badge badge-soft-success">✅ Đã duyệt</span>' :
                '<span class="badge badge-soft-danger">❌ Đã huỷ</span>'}
                ${booking.status !== 'cancelled' ? (booking.isPaid
            ? '<span class="badge badge-soft-success ms-1">Đã TT</span>'
            : '<span class="badge badge-soft-warning ms-1">Chưa TT</span>') : ''}
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
            document.getElementById('bStatus').value = booking.status || 'pending';

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
        document.getElementById('bStatus').value = 'pending';
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
        status: status || 'pending'
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

// Helper: set giá trị cho custom time picker (display + hidden + active item)
function setTimePicker(prefix, field, time) {
    const display = document.getElementById(prefix + field + 'TimeDisplay');
    const hidden = document.getElementById(prefix + field + 'Time');
    const panel = document.getElementById(prefix + field + 'TimePanel');
    if (display) display.value = time;
    if (hidden) hidden.value = time;
    if (panel) {
        panel.querySelectorAll('.atp-time-item').forEach(function (el) {
            el.classList.toggle('active', el.dataset.time === time);
        });
    }
}

// ===== ADMIN TIME PICKER 2 COLUMNS =====
function initBookingTimePickers(modalId) {
    const allConfigs = {
        bookingFormModal: [
            { triggerId: 'bCheckInTimeTrigger', panelId: 'bCheckInTimePanel', displayId: 'bCheckInTimeDisplay', hiddenId: 'bCheckInTime' },
            { triggerId: 'bCheckOutTimeTrigger', panelId: 'bCheckOutTimePanel', displayId: 'bCheckOutTimeDisplay', hiddenId: 'bCheckOutTime' }
        ],
        editBookingModal: [
            { triggerId: 'ebCheckInTimeTrigger', panelId: 'ebCheckInTimePanel', displayId: 'ebCheckInTimeDisplay', hiddenId: 'ebCheckInTime' },
            { triggerId: 'ebCheckOutTimeTrigger', panelId: 'ebCheckOutTimePanel', displayId: 'ebCheckOutTimeDisplay', hiddenId: 'ebCheckOutTime' }
        ]
    };

    const configs = allConfigs[modalId] || [];

    configs.forEach(function (cfg) {
        const trigger = document.getElementById(cfg.triggerId);
        const panel = document.getElementById(cfg.panelId);
        const display = document.getElementById(cfg.displayId);
        const hidden = document.getElementById(cfg.hiddenId);
        if (!trigger || !panel) return;

        // Clone để xóa event listener cũ tránh bị bind nhiều lần
        const newTrigger = trigger.cloneNode(true);
        trigger.parentNode.replaceChild(newTrigger, trigger);

        function closeAll() {
            document.querySelectorAll('.admin-time-picker-panel').forEach(p => p.classList.remove('open'));
            document.querySelectorAll('.admin-time-picker-trigger').forEach(t => t.classList.remove('active'));
        }

        newTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = panel.classList.contains('open');
            closeAll();
            if (!isOpen) {
                panel.classList.add('open');
                newTrigger.classList.add('active');
            }
        });

        panel.querySelectorAll('.atp-time-item').forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                const time = this.dataset.time;
                if (hidden) hidden.value = time;
                // Lấy lại display theo id thay vì dùng biến cũ bị stale sau clone
                const freshDisplay = document.getElementById(cfg.displayId);
                if (freshDisplay) freshDisplay.value = time;
                panel.querySelectorAll('.atp-time-item').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                closeAll();
            });
        });
    });

    // Đóng panel khi click ra ngoài (chỉ bind 1 lần)
    if (!document._atpOutsideClick) {
        document._atpOutsideClick = true;
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.admin-time-picker-wrapper')) {
                document.querySelectorAll('.admin-time-picker-panel').forEach(p => p.classList.remove('open'));
                document.querySelectorAll('.admin-time-picker-trigger').forEach(t => t.classList.remove('active'));
            }
        });
    }
}

document.addEventListener('shown.bs.modal', function (e) {
    if (e.target && (e.target.id === 'bookingFormModal' || e.target.id === 'editBookingModal')) {
        initBookingTimePickers(e.target.id);
        // Set giờ SAU KHI picker đã init
        if (e.target.id === 'editBookingModal' && window._pendingEbTimes) {
            setTimePicker('eb', 'CheckIn', window._pendingEbTimes.checkIn);
            setTimePicker('eb', 'CheckOut', window._pendingEbTimes.checkOut);
            window._pendingEbTimes = null;
        }
    }
});

// ============= PROMO ROOM SELECTION UI =============
window._promoSelectedRooms = [];

function renderPromoRoomList(preSelected) {
    const container = $('#promoRoomCheckboxList');
    container.empty();

    const rooms = allRooms || [];
    if (rooms.length === 0) {
        container.html('<div class="text-muted small text-center py-3"><i class="bi bi-inbox me-1"></i>Chưa có phòng nào trong hệ thống. Dùng nhập tay bên dưới.</div>');
    } else {
        rooms.forEach(function (room) {
            const isChecked = (preSelected || []).some(r => String(r.id) === String(room.id));
            container.append(`
                <div class="promo-room-item">
                    <input class="promo-room-cb" type="checkbox" 
                        id="pcb_${room.id}" value="${room.id}" data-name="${room.name}" ${isChecked ? 'checked' : ''}>
                    <label for="pcb_${room.id}">${room.name}</label>
                </div>
            `);
        });
    }
    syncPromoRoomTags();
}

function syncPromoRoomTags() {
    const fromCheckboxes = [];
    $('.promo-room-cb:checked').each(function () {
        fromCheckboxes.push({ id: $(this).val(), name: $(this).data('name') });
    });
    const manualRooms = (window._promoSelectedRooms || []).filter(r => r.id === null);
    window._promoSelectedRooms = [...fromCheckboxes, ...manualRooms];
    renderPromoSelectedTags();
}

function renderPromoSelectedTags() {
    const tags = $('#promoSelectedRoomTags');
    tags.empty();
    (window._promoSelectedRooms || []).forEach(function (r, i) {
        tags.append(`
            <span class="promo-room-tag">
                <i class="bi bi-building" style="font-size:11px;"></i>
                ${r.name}
                <button type="button" class="tag-remove" onclick="removePromoRoom(${i})">
                    <i class="bi bi-x"></i>
                </button>
            </span>
        `);
    });
}

window.removePromoRoom = function (i) {
    const removed = window._promoSelectedRooms[i];
    window._promoSelectedRooms.splice(i, 1);
    // Nếu là phòng từ checkbox thì bỏ check
    if (removed && removed.id !== null) {
        $(`#pcb_${removed.id}`).prop('checked', false);
    }
    renderPromoSelectedTags();
};

// Event: radio scope toggle
$(document).on('change', 'input[name="promoScope"]', function () {
    if ($(this).val() === 'specific') {
        $('#promoRoomPanel').show();
        renderPromoRoomList(window._promoSelectedRooms);
    } else {
        $('#promoRoomPanel').hide();
        window._promoSelectedRooms = [];
        renderPromoSelectedTags();
    }
});

// Event: checkbox change
$(document).on('change', '.promo-room-cb', function () {
    syncPromoRoomTags();
});

// Event: nút thêm phòng thủ công
$(document).on('click', '#btnAddManualRoom', function () {
    const name = $('#promoRoomManualInput').val().trim();
    if (!name) return;
    const already = (window._promoSelectedRooms || []).some(r => r.name.toLowerCase() === name.toLowerCase());
    if (already) { showToast('Phòng này đã được chọn!', 'warning'); return; }
    window._promoSelectedRooms = window._promoSelectedRooms || [];
    window._promoSelectedRooms.push({ id: null, name });
    $('#promoRoomManualInput').val('');
    renderPromoSelectedTags();
});

// Populate khi mở modal tạo mới
$(document).on('show.bs.modal', '#promoModal', function () {
    if (editingPromoIndex < 0) {
        window._promoSelectedRooms = [];
        renderPromoSelectedTags();
        renderPromoRoomList([]);
    }
});