// Chỉ lấy link gốc, KHÔNG chứa /rooms hay /bookings ở cuối
const API_URL = "https://69ead53215c7e2d5126a102c.mockapi.io/v1";

// --- API CHO PHÒNG (ROOMS) ---
async function fetchRooms() {
   let res = await fetch(`${API_URL}/rooms`);
   return await res.json();
}

async function createRoom(data) {
   await fetch(`${API_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
   });
}

async function updateRoom(id, data) {
   await fetch(`${API_URL}/rooms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
   });
}

async function deleteRoom(id) {
   await fetch(`${API_URL}/rooms/${id}`, { method: 'DELETE' });
}

// --- API CHO ĐẶT PHÒNG (BOOKINGS) ---
async function fetchBookings() {
   let res = await fetch(`${API_URL}/bookings`);
   return await res.json();
}

async function createBooking(data) {
   await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
   });
}

async function updateBookingStatus(id, status) {
   await fetch(`${API_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status })
   });
}