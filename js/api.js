const API_URL = 'https://69ead53215c7e2d5126a102c.mockapi.io/v1';

const API = {
   // API KHO PHÒNG
   getRooms: () => fetch(`${API_URL}/rooms`).then(res => res.json()),
   createRoom: (data) => fetch(`${API_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
   }).then(res => res.json()),
   updateRoom: (id, data) => fetch(`${API_URL}/rooms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
   }).then(res => res.json()),
   deleteRoom: (id) => fetch(`${API_URL}/rooms/${id}`, { method: 'DELETE' }),

   // API ĐƠN ĐẶT PHÒNG
   getBookings: () => fetch(`${API_URL}/bookings`).then(res => res.json()),
   // Lấy đơn hàng theo email khách (filter phía client vì MockAPI free không hỗ trợ query param ổn định)
   getBookingsByEmail: async (email) => {
      const all = await fetch(`${API_URL}/bookings`).then(res => res.json());
      return all.filter(b => b.customerEmail === email || b.userId === email);
   },
   createBooking: (data) => {
      return new Promise((resolve, reject) => {
         $.ajax({
            url: `${API_URL}/bookings`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: resolve,
            error: reject
         });
      });
   },
   // Đã đồng bộ tên hàm để Admin gọi được
   updateBooking: (id, data) => fetch(`${API_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
   }).then(res => res.json()),
   // Đã bổ sung hàm Xóa để dọn rác
   deleteBooking: (id) => fetch(`${API_URL}/bookings/${id}`, { method: 'DELETE' })
};