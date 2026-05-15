let allRooms = [];
let allBookings = [];
let itemsPerPage = 8;

let currentRoomPage = 1;
let currentBookingPage = 1;
let roomModal;

let promotions = JSON.parse(localStorage.getItem('stayeasy_promos')) || [
    { code: 'STAYEASY15', discount: 15 },
    { code: 'SUMMER2026', discount: 20 }
];

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

// HÀM BỎ DẤU (ĐÃ NÂNG CẤP CHỐNG LỖI SẬP WEB)
function removeAccents(str) {
    if (!str) return '';
    // Ép kiểu String() để tránh lỗi nếu dữ liệu API vô tình bị biến thành Số
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

window.switchAdminTab = function (targetTabId) {
    $(`#adminSidebarMenu button[data-bs-target="${targetTabId}"]`).tab('show');
}

$(document).ready(function () {
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
                alert("Đã cập nhật!");
            } else {
                if (allRooms.length >= 100) {
                    alert("CẢNH BÁO: MockAPI chỉ giới hạn 100 phòng! Vui lòng xóa bớt phòng cũ.");
                    btnSubmit.prop('disabled', false).text('Lưu Dữ Liệu');
                    return;
                }
                await API.createRoom(roomData);
                alert("Đã thêm phòng mới!");
            }

            roomModal.hide();
            $('body').removeClass('modal-open').css('padding-right', '');
            $('.modal-backdrop').remove();

            currentRoomPage = 1;
            await loadAdminData();
        } catch (error) {
            alert("Lỗi! Vui lòng kiểm tra kết nối API.");
            console.error(error);
        } finally {
            btnSubmit.prop('disabled', false).text('Lưu Dữ Liệu');
        }
    });

    $('#searchRoomInput').on('input', function () {
        currentRoomPage = 1;
        renderRoomTable();
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

    $('#promoForm').on('submit', function (e) {
        e.preventDefault();
        const code = $('#promoCodeInput').val().trim().toUpperCase();
        const discount = parseInt($('#promoDiscountInput').val());

        if (promotions.some(p => p.code === code)) {
            alert("Mã này đã tồn tại!"); return;
        }

        promotions.push({ code, discount });
        localStorage.setItem('stayeasy_promos', JSON.stringify(promotions));

        $('#promoModal').modal('hide');
        $(this)[0].reset();
        renderPromotions();
        alert("Thêm mã khuyến mãi thành công!");
    });
});

// TẢI DỮ LIỆU (ĐÃ NÂNG CẤP CHỐNG LỖI MOCKAPI)
async function loadAdminData() {
    try {
        let resRooms = await API.getRooms().catch(() => []);
        let resBookings = await API.getBookings().catch(() => []);

        // Đảm bảo dữ liệu luôn là mảng, phòng ngừa API trả về chuỗi "Not found"
        allRooms = Array.isArray(resRooms) ? resRooms : [];
        allBookings = Array.isArray(resBookings) ? resBookings : [];

        updateDashboardStats();
        renderRoomTable();
        renderBookingTable();
        renderRevenueTab();
        renderPromotions();
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
        tbody.html(`<tr><td colspan="5" class="text-center text-muted py-4">Chưa có phòng nào trong hệ thống.</td></tr>`);
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
        tbody.html(`<tr><td colspan="5" class="text-center text-muted py-4">Không tìm thấy phòng phù hợp.</td></tr>`);
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
                        <img src="${room.image || ''}" class="rounded-3 shadow-sm" width="55" height="55" style="object-fit:cover;" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                        <div>
                            <p class="fw-bold mb-1 text-dark">${room.name || 'Phòng không tên'}</p>
                            <small class="text-muted"><i class="bi bi-geo-alt"></i> ${room.location || 'Chưa cập nhật'}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-soft-primary">${room.type || 'Standard'}</span></td>
                <td class="fw-bold text-danger">${formatVND(room.price)}</td>
                <td><i class="bi bi-person me-1 text-muted"></i>${room.guests || 1}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-light btn-sm text-primary me-2 shadow-sm" onclick="editRoom('${room.id}')"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-light btn-sm text-danger shadow-sm" onclick="deleteRoom('${room.id}')"><i class="bi bi-trash"></i></button>
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

    if (allBookings.length === 0) {
        tbody.html(`<tr><td colspan="6" class="text-center text-muted py-4">Hiện chưa có đơn đặt phòng nào.</td></tr>`);
        $('#bookingPagination').empty();
        $('#bookingPaginationInfo').text('');
        return;
    }

    let sortedBookings = [...allBookings].reverse();
    const start = (currentBookingPage - 1) * itemsPerPage;
    const pagedBookings = sortedBookings.slice(start, start + itemsPerPage);

    pagedBookings.forEach(b => {
        let statusBadge = '';
        let actionBtns = '';

        if (b.status === "Pending") {
            statusBadge = '<span class="badge badge-soft-warning"><i class="bi bi-hourglass-split me-1"></i>Chờ duyệt</span>';
            actionBtns = `
                <button class="btn btn-sm btn-success shadow-sm me-1" onclick="updateBookingStatus('${b.id}', 'Confirmed')" title="Duyệt"><i class="bi bi-check-lg"></i></button>
                <button class="btn btn-sm btn-danger shadow-sm me-2" onclick="updateBookingStatus('${b.id}', 'Cancelled')" title="Từ chối"><i class="bi bi-x-lg"></i></button>
            `;
        } else if (b.status === "Confirmed") {
            statusBadge = '<span class="badge badge-soft-success"><i class="bi bi-check-circle me-1"></i>Đã duyệt</span>';
        } else {
            statusBadge = '<span class="badge badge-soft-danger"><i class="bi bi-x-circle me-1"></i>Đã hủy</span>';
        }

        actionBtns += `<button class="btn btn-sm btn-light text-danger shadow-sm ms-2" onclick="deleteBooking('${b.id}')" title="Xóa vĩnh viễn"><i class="bi bi-trash"></i></button>`;

        tbody.append(`
            <tr>
                <td class="ps-4 fw-bold text-dark">
                    ${b.customerName || 'Khách hàng'}
                    <div class="small fw-normal text-muted mt-1">SĐT: ${b.customerPhone || 'N/A'}</div>
                </td>
                <td><span class="text-primary fw-bold">${b.roomName || 'Phòng'}</span></td>
                <td>
                    <div class="small"><span class="text-muted">In:</span> ${b.checkIn || ''}</div>
                    <div class="small"><span class="text-muted">Out:</span> ${b.checkOut || ''}</div>
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

function renderRevenueTab() {
    const confirmedBookings = allBookings.filter(b => b.status === "Confirmed");
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

    $('#revTotalAmount').text(formatVND(totalRevenue));
    $('#revTotalBookings').text(confirmedBookings.length + " đơn");

    const tbody = $('#revenueTableBody');
    tbody.empty();

    if (confirmedBookings.length === 0) {
        tbody.html(`<tr><td colspan="4" class="text-center text-muted py-4">Chưa có giao dịch nào thành công.</td></tr>`);
        return;
    }

    let sortedRevenue = [...confirmedBookings].reverse();
    sortedRevenue.forEach(b => {
        tbody.append(`
            <tr>
                <td class="ps-4 fw-bold text-dark">${b.customerName || ''}</td>
                <td><span class="text-primary fw-bold">${b.roomName || ''}</span></td>
                <td class="small text-muted">${b.checkIn || ''} đến ${b.checkOut || ''}</td>
                <td class="text-end pe-4 fw-bold text-success">+ ${formatVND(b.totalPrice)}</td>
            </tr>
        `);
    });
}

function renderPromotions() {
    const tbody = $('#promoTableBody');
    tbody.empty();

    if (promotions.length === 0) {
        tbody.html(`<tr><td colspan="4" class="text-center text-muted py-4">Chưa có mã khuyến mãi nào.</td></tr>`);
        return;
    }

    promotions.forEach((p, index) => {
        tbody.append(`
            <tr>
                <td class="ps-4"><span class="badge bg-danger fs-6 tracking-wider">${p.code}</span></td>
                <td class="fw-bold text-success fs-5">Giảm ${p.discount}%</td>
                <td><span class="badge badge-soft-success"><i class="bi bi-check-circle me-1"></i>Đang chạy</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light text-danger shadow-sm" onclick="deletePromo(${index})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `);
    });
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
    if (!confirm("Xóa phòng này khỏi hệ thống?")) return;
    try {
        await API.deleteRoom(id);
        alert("Đã xóa!");
        loadAdminData();
    } catch (e) { alert("Lỗi khi xóa!"); }
}

window.updateBookingStatus = async function (id, newStatus) {
    if (!confirm('Xác nhận ' + (newStatus === 'Confirmed' ? 'DUYỆT' : 'TỪ CHỐI') + ' đơn này?')) return;
    try {
        if (API.updateBooking) {
            await API.updateBooking(id, { status: newStatus });
        }
        loadAdminData();
    } catch (e) { alert("Lỗi duyệt đơn!"); }
}

window.deleteBooking = async function (id) {
    if (!confirm('LƯU Ý: Xóa vĩnh viễn đơn này?')) return;
    try {
        if (API.deleteBooking) {
            await API.deleteBooking(id);
        }
        loadAdminData();
    } catch (e) { alert("Xóa thất bại!"); }
}

window.deletePromo = function (index) {
    if (!confirm('Chắc chắn muốn xóa mã giảm giá này?')) return;
    promotions.splice(index, 1);
    localStorage.setItem('stayeasy_promos', JSON.stringify(promotions));
    renderPromotions();
}