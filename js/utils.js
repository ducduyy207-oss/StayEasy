// Hàm định dạng tiền tệ Việt Nam (VD: 1500000 -> 1.500.000)
const formatCurrency = (number) => {
   return Number(number).toLocaleString('vi-VN');
};

// Hàm tính số đêm lưu trú
const calculateNights = (checkIn, checkOut) => {
   const date1 = new Date(checkIn);
   const date2 = new Date(checkOut);
   const diffTime = date2.getTime() - date1.getTime();
   return Math.ceil(diffTime / (1000 * 3600 * 24));
};