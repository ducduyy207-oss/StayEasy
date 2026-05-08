let roomModal;

// Tải dữ liệu bảng Phòng
async function loadAdminRooms() {
   let rooms = await fetchRooms();
   let html = '';
   for (let r of rooms) {
      html += `
            <tr>
                <td>${r.id}</td>
                <td><img src="${r.image}" width="60" height="40" style="object-fit:cover; border-radius:4px;"></td>
                <td class="fw-bold">${r.name}</td>
                <td><span class="badge bg-secondary">${r.type}</span></td>
                <td>${r.capacity} người</td>
                <td class="text-danger fw-bold">${formatCurrency(r.price)}</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-edit" data-id="${r.id}" data-obj='${JSON.stringify(r)}'>Sửa</button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}">Xóa</button>
                </td>
            </tr>
        `;
   }
   $('#admin-room-list').html(html);
}

// Tải dữ liệu bảng Đơn Đặt Phòng
async function loadAdminBookings() {
   let bookings = await fetchBookings();
   let html = '';
   for (let b of bookings) {
      let statusBadge = b.status === "Confirmed" ? "bg-success" : (b.status === "Cancelled" ? "bg-danger" : "bg-warning text-dark");
      html += `
            <tr>
                <td>#${b.id}</td>
                <td>Phòng ${b.roomId}</td>
                <td class="fw-bold">${b.customerName}</td>
                <td>${b.checkIn}</td>
                <td>${b.checkOut}</td>
                <td class="text-danger fw-bold">${formatCurrency(b.totalPrice)}</td>
                <td><span class="badge ${statusBadge}">${b.status}</span></td>
                <td>
                    ${b.status === "Pending" ? `
                        <button class="btn btn-sm btn-success btn-approve" data-id="${b.id}">Duyệt</button>
                        <button class="btn btn-sm btn-danger btn-reject" data-id="${b.id}">Từ chối</button>
                    ` : '<i>Đã xử lý</i>'}
                </td>
            </tr>
        `;
   }
   $('#admin-booking-list').html(html);
}

$(document).ready(function () {
   roomModal = new bootstrap.Modal(document.getElementById('roomModal'));

   // Chạy lúc load trang
   loadAdminRooms();
   loadAdminBookings();

   // Mở form Thêm mới
   $('#btnAddRoom').click(function () {
      $('#adminRoomForm')[0].reset();
      $('#editRoomId').val("");
      $('#roomModalTitle').text("Thêm phòng mới");
      roomModal.show();
   });

   // Mở form Sửa
   $('#admin-room-list').on('click', '.btn-edit', function () {
      let r = JSON.parse($(this).attr('data-obj'));
      $('#editRoomId').val(r.id);
      $('#rName').val(r.name);
      $('#rType').val(r.type);
      $('#rPrice').val(r.price);
      $('#rCap').val(r.capacity);
      $('#rImg').val(r.image);
      $('#roomModalTitle').text("Sửa thông tin phòng");
      roomModal.show();
   });

   // Submit Thêm/Sửa
   $('#adminRoomForm').on('submit', async function (e) {
      e.preventDefault();
      let id = $('#editRoomId').val();
      let data = {
         name: $('#rName').val(),
         type: $('#rType').val(),
         price: $('#rPrice').val(),
         capacity: $('#rCap').val(),
         image: $('#rImg').val()
      };

      if (id) {
         await updateRoom(id, data);
         alert("Cập nhật thành công!");
      } else {
         await createRoom(data);
         alert("Thêm phòng thành công!");
      }
      roomModal.hide();
      loadAdminRooms();
   });

   // Xóa phòng
   $('#admin-room-list').on('click', '.btn-delete', async function () {
      if (confirm("Bạn có chắc chắn muốn xóa phòng này?")) {
         await deleteRoom($(this).data('id'));
         loadAdminRooms();
      }
   });

   // Duyệt / Từ chối Đơn
   $('#admin-booking-list').on('click', '.btn-approve', async function () {
      await updateBookingStatus($(this).data('id'), "Confirmed");
      loadAdminBookings();
   });
   $('#admin-booking-list').on('click', '.btn-reject', async function () {
      await updateBookingStatus($(this).data('id'), "Cancelled");
      loadAdminBookings();
   });
});