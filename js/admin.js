let allRooms = [];
let itemsPerPage = 10; // Một trang hiện 10 dòng là đẹp nhất
let currentPage = 1;

const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

$(document).ready(function () {
    loadAdminRooms();

    // Bắt sự kiện bấm vào số trang
    $(document).on('click', '#adminPagination .page-link', function (e) {
        e.preventDefault();
        const targetPage = $(this).attr('data-page');
        if (targetPage) {
            currentPage = parseInt(targetPage);
            renderAdminTable();
        }
    });
});

async function loadAdminRooms() {
    try {
        // Lấy toàn bộ 100 phòng từ MockAPI[cite: 1]
        allRooms = await API.getRooms();
        renderAdminTable();
    } catch (error) {
        console.error("Lỗi:", error);
    }
}

function renderAdminTable() {
    const tbody = $('#adminRoomList');
    tbody.empty();

    // Tính toán vị trí bắt đầu và kết thúc của trang hiện tại
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pagedRooms = allRooms.slice(start, end);

    pagedRooms.forEach(room => {
        tbody.append(`
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${room.image}" class="rounded-3 me-3" style="width: 45px; height: 45px; object-fit: cover;">
                        <div>
                            <div class="fw-bold">${room.name}</div>
                            <div class="text-muted small">${room.location || 'Việt Nam'}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-soft-primary">${room.type}</span></td>
                <td class="fw-bold text-primary">${formatVND(room.price)}</td>
                <td><i class="bi bi-people me-1"></i>${room.guests} người</td>
                <td><span class="badge badge-soft-success">Sẵn sàng</span></td>
                <td class="text-end">
                    <button class="btn btn-action btn-edit-act" onclick="editRoom('${room.id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-action btn-del-act" onclick="deleteRoom('${room.id}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `);
    });

    // Cập nhật dòng chữ thông báo số lượng
    $('#adminPaginationInfo').text(`Hiển thị dòng ${start + 1} đến ${Math.min(end, allRooms.length)} trong tổng số ${allRooms.length}`);

    renderPaginationButtons();
}

function renderPaginationButtons() {
    const totalPages = Math.ceil(allRooms.length / itemsPerPage);
    const pagContainer = $('#adminPagination');
    pagContainer.empty();

    if (totalPages <= 1) return;

    // Nút Trước
    pagContainer.append(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}"><i class="bi bi-chevron-left"></i></a>
        </li>
    `);

    // Các số trang 1, 2, 3...
    for (let i = 1; i <= totalPages; i++) {
        // Tối ưu: Nếu quá nhiều trang thì bạn có thể code thêm logic rút gọn dấu "..."
        pagContainer.append(`
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `);
    }

    // Nút Sau
    pagContainer.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}"><i class="bi bi-chevron-right"></i></a>
        </li>
    `);
}