/* StayEasy Mobile Only JS Patch
   Chỉ xử lý tương tác mobile: menu public, overlay, sidebar admin, sticky booking bar.
*/
(function () {
   'use strict';

   function isMobileNav() {
      return window.matchMedia('(max-width: 991.98px)').matches;
   }

   function isMobileDetail() {
      return window.matchMedia('(max-width: 767.98px)').matches;
   }

   function ensurePublicMenuBackdrop() {
      var backdrop = document.querySelector('.stayeasy-mobile-backdrop');
      if (!backdrop) {
         backdrop = document.createElement('div');
         backdrop.className = 'stayeasy-mobile-backdrop';
         document.body.appendChild(backdrop);
      }
      return backdrop;
   }

   function initPublicNavbar() {
      var nav = document.querySelector('.navbar-custom');
      var toggle = nav && nav.querySelector('.navbar-toggler[data-bs-target]');
      var target = toggle && document.querySelector(toggle.getAttribute('data-bs-target'));
      if (!nav || !toggle || !target) return;

      var backdrop = ensurePublicMenuBackdrop();

      function hideMenu() {
         if (!isMobileNav()) return;
         try {
            if (window.bootstrap && bootstrap.Collapse) {
               bootstrap.Collapse.getOrCreateInstance(target, { toggle: false }).hide();
            } else {
               target.classList.remove('show');
            }
         } catch (e) {
            target.classList.remove('show');
         }
         backdrop.classList.remove('show');
         document.body.classList.remove('stayeasy-menu-open');
         toggle.setAttribute('aria-expanded', 'false');
      }

      function showBackdrop() {
         if (!isMobileNav()) return;
         backdrop.classList.add('show');
         document.body.classList.add('stayeasy-menu-open');
         toggle.setAttribute('aria-expanded', 'true');
      }

      target.addEventListener('shown.bs.collapse', showBackdrop);
      target.addEventListener('show.bs.collapse', showBackdrop);
      target.addEventListener('hidden.bs.collapse', function () {
         backdrop.classList.remove('show');
         document.body.classList.remove('stayeasy-menu-open');
         toggle.setAttribute('aria-expanded', 'false');
      });

      // Fallback nếu Bootstrap event không chạy.
      toggle.addEventListener('click', function () {
         setTimeout(function () {
            if (!isMobileNav()) return;
            if (target.classList.contains('show')) showBackdrop();
         }, 60);
      });

      backdrop.addEventListener('click', hideMenu);

      // Chỉ đóng menu khi bấm link điều hướng thật sự.
      // Không đóng khi người dùng mở dropdown tài khoản / Đơn của tôi / Đăng xuất trong panel.
      target.addEventListener('click', function (ev) {
         var accountArea = ev.target.closest('.user-dropdown, .user-menu-panel, #userMenuToggle, #btnMyOrders, #myOrdersPanel');
         if (accountArea) return;
         var link = ev.target.closest('a.nav-link, .dropdown-item');
         if (link) hideMenu();
      });

      document.addEventListener('keydown', function (ev) {
         if (ev.key === 'Escape') hideMenu();
      });

      window.addEventListener('resize', function () {
         if (!isMobileNav()) hideMenu();
      });
   }

   function initDetailMobileBar() {
      if (!document.querySelector('.detail-navbar') || !document.querySelector('.booking-card')) return;

      var bar = document.querySelector('.mobile-booking-bar');
      if (!bar) {
         bar = document.createElement('div');
         bar.className = 'mobile-booking-bar';
         bar.innerHTML = '<div class="mobile-booking-price"><small>Giá mỗi đêm</small><strong id="mobileBookingPrice">0 VNĐ</strong></div><button type="button" id="mobileBookingBtn">Đặt ngay</button>';
         document.body.appendChild(bar);
      }

      function syncDetailBarState() {
         var isMobile = isMobileNav();
         document.body.classList.toggle('stayeasy-detail-page', isMobile);
         bar.hidden = !isMobile;
         bar.setAttribute('aria-hidden', isMobile ? 'false' : 'true');
      }

      var priceSource = document.getElementById('dtlPrice');
      var priceTarget = document.getElementById('mobileBookingPrice');
      var btn = document.getElementById('mobileBookingBtn');

      function syncPrice() {
         if (!priceSource || !priceTarget) return;
         var value = (priceSource.textContent || '').replace(/\s+/g, ' ').trim();
         priceTarget.textContent = value || '0 VNĐ';
      }

      syncPrice();
      syncDetailBarState();
      window.addEventListener('resize', syncDetailBarState);
      window.addEventListener('orientationchange', syncDetailBarState);

      if (priceSource && window.MutationObserver) {
         new MutationObserver(syncPrice).observe(priceSource, { childList: true, characterData: true, subtree: true });
      }

      if (btn && !btn.dataset.stayeasyDetailBound) {
         btn.dataset.stayeasyDetailBound = '1';
         btn.addEventListener('click', function () {
            var card = document.querySelector('.booking-card');
            if (!card) return;
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(function () {
               var first = card.querySelector('input, select, textarea, button');
               if (first && isMobileDetail()) first.focus({ preventScroll: true });
            }, 450);
         });
      }
   }

   function initAdminMobile() {
      var sidebar = document.querySelector('.admin-sidebar');
      var backdrop = document.getElementById('sidebarBackdrop');
      var toggle = document.getElementById('mobileMenuToggle');
      if (!sidebar) return;

      document.body.classList.add('stayeasy-admin-page');

      if (!backdrop) {
         backdrop = document.createElement('div');
         backdrop.className = 'sidebar-backdrop';
         backdrop.id = 'sidebarBackdrop';
         document.body.insertBefore(backdrop, document.body.firstChild);
      }

      function closeSidebar() {
         sidebar.classList.remove('sidebar-open');
         backdrop.classList.remove('show');
         document.body.classList.remove('admin-sidebar-is-open');
      }

      function toggleSidebar() {
         sidebar.classList.toggle('sidebar-open');
         backdrop.classList.toggle('show', sidebar.classList.contains('sidebar-open'));
         document.body.classList.toggle('admin-sidebar-is-open', sidebar.classList.contains('sidebar-open'));
      }

      // Không phá function cũ, chỉ bọc lại để chắc chắn hoạt động.
      window.closeMobileSidebar = closeSidebar;
      window.toggleMobileSidebar = toggleSidebar;

      if (toggle && !toggle.dataset.mobilePatched) {
         toggle.dataset.mobilePatched = '1';
         toggle.addEventListener('click', function (e) {
            e.preventDefault();
            toggleSidebar();
         });
      }

      backdrop.addEventListener('click', closeSidebar);
      sidebar.querySelectorAll('#adminSidebarMenu button[data-bs-toggle="pill"], a').forEach(function (el) {
         el.addEventListener('click', function () {
            if (window.matchMedia('(max-width: 768px)').matches) closeSidebar();
         });
      });

      document.addEventListener('keydown', function (ev) {
         if (ev.key === 'Escape') closeSidebar();
      });
   }

   function preventAccidentalHorizontalScroll() {
      if (!window.matchMedia('(max-width: 991.98px)').matches) return;
      document.documentElement.style.overflowX = 'hidden';
      document.body.style.overflowX = 'hidden';
   }

   document.addEventListener('DOMContentLoaded', function () {
      preventAccidentalHorizontalScroll();
      initPublicNavbar();
      initDetailMobileBar();
      initAdminMobile();
   });
})();

/* HOTFIX 20260607-2: admin menu + user dropdown mobile */
(function () {
   'use strict';

   function isMobilePublic() {
      return window.matchMedia('(max-width: 991.98px)').matches;
   }

   function forceAdminSidebar() {
      var sidebar = document.querySelector('.admin-sidebar');
      var toggle = document.getElementById('mobileMenuToggle');
      if (!sidebar || !toggle) return;

      var backdrop = document.getElementById('sidebarBackdrop');
      if (!backdrop) {
         backdrop = document.createElement('div');
         backdrop.id = 'sidebarBackdrop';
         backdrop.className = 'sidebar-backdrop';
         document.body.insertBefore(backdrop, document.body.firstChild);
      }

      function openSidebar() {
         sidebar.classList.add('sidebar-open');
         backdrop.classList.add('show');
         document.body.classList.add('admin-sidebar-is-open');
         toggle.setAttribute('aria-expanded', 'true');
      }

      function closeSidebar() {
         sidebar.classList.remove('sidebar-open');
         backdrop.classList.remove('show');
         document.body.classList.remove('admin-sidebar-is-open');
         toggle.setAttribute('aria-expanded', 'false');
      }

      function toggleSidebar(e) {
         if (e) {
            e.preventDefault();
            e.stopPropagation();
         }
         if (sidebar.classList.contains('sidebar-open')) closeSidebar();
         else openSidebar();
      }

      window.toggleMobileSidebar = toggleSidebar;
      window.closeMobileSidebar = closeSidebar;

      // Xoá toàn bộ listener/onclick cũ để tránh lỗi bấm 1 lần nhưng toggle 2 lần.
      if (!toggle.dataset.adminHotfixClean) {
         var cleanToggle = toggle.cloneNode(true);
         cleanToggle.removeAttribute('onclick');
         cleanToggle.dataset.adminHotfixClean = '1';
         toggle.parentNode.replaceChild(cleanToggle, toggle);
         toggle = cleanToggle;
      }
      toggle.onclick = null;
      if (!toggle.dataset.adminHotfixBound) {
         toggle.dataset.adminHotfixBound = '1';
         toggle.addEventListener('click', toggleSidebar);
      }
      backdrop.onclick = closeSidebar;

      sidebar.querySelectorAll('button[data-bs-toggle="pill"], a').forEach(function (el) {
         el.addEventListener('click', function () {
            if (window.matchMedia('(max-width: 768px)').matches) closeSidebar();
         });
      });
   }

   function forceUserMenuMobile() {
      if (document.documentElement.dataset.stayeasyUserMenuHotfix) return;
      document.documentElement.dataset.stayeasyUserMenuHotfix = '1';
      document.addEventListener('click', function (ev) {
         var toggle = ev.target.closest('#userMenuToggle');
         if (toggle && isMobilePublic()) {
            ev.preventDefault();
            ev.stopPropagation();
            var wrap = toggle.closest('.user-dropdown');
            var panel = wrap && wrap.querySelector('.user-menu-panel');
            if (!panel) return;
            var isOpen = panel.classList.contains('stayeasy-user-menu-open') || panel.style.display === 'block';
            panel.classList.toggle('stayeasy-user-menu-open', !isOpen);
            panel.style.display = isOpen ? 'none' : 'block';
            return;
         }

      }, true);

   }

   function makeExploreTabsSwipeable() {
      var nav = document.querySelector('.explore-tab-nav');
      if (!nav || nav.dataset.hotfixSwipe) return;
      nav.dataset.hotfixSwipe = '1';
      nav.addEventListener('click', function (ev) {
         var btn = ev.target.closest('.explore-tab-btn');
         if (btn && isMobilePublic()) {
            setTimeout(function () {
               try { btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (e) { }
            }, 30);
         }
      });
   }

   function initHotfixes() {
      forceAdminSidebar();
      forceUserMenuMobile();
      makeExploreTabsSwipeable();
   }

   if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHotfixes);
   else initHotfixes();
   window.addEventListener('load', initHotfixes);
})();

/* HOTFIX 3 — Fix cứng admin hamburger + mở Đơn của tôi trên mobile */
(function () {
   'use strict';

   function isAdminPage() {
      return !!document.querySelector('.admin-sidebar, #mobileMenuToggle, #adminSidebarMenu');
   }

   function isMobileAdmin() {
      return window.matchMedia('(max-width: 768px)').matches;
   }

   function isMobilePublic() {
      return window.matchMedia('(max-width: 991.98px)').matches;
   }

   function ensureAdminBackdrop() {
      var backdrop = document.getElementById('sidebarBackdrop');
      if (!backdrop) {
         backdrop = document.createElement('div');
         backdrop.id = 'sidebarBackdrop';
         backdrop.className = 'sidebar-backdrop';
         document.body.insertBefore(backdrop, document.body.firstChild);
      }
      return backdrop;
   }

   function getAdminParts() {
      return {
         sidebar: document.querySelector('.admin-sidebar'),
         toggle: document.getElementById('mobileMenuToggle'),
         backdrop: ensureAdminBackdrop()
      };
   }

   function openAdminSidebar() {
      var p = getAdminParts();
      if (!p.sidebar || !p.toggle || !isMobileAdmin()) return;
      document.body.classList.add('stayeasy-admin-page', 'admin-sidebar-is-open');
      p.sidebar.classList.add('sidebar-open');
      p.backdrop.classList.add('show');
      p.toggle.setAttribute('aria-expanded', 'true');
   }

   function closeAdminSidebar() {
      var p = getAdminParts();
      if (!p.sidebar) return;
      document.body.classList.remove('admin-sidebar-is-open');
      p.sidebar.classList.remove('sidebar-open');
      p.backdrop.classList.remove('show');
      if (p.toggle) p.toggle.setAttribute('aria-expanded', 'false');
   }

   function toggleAdminSidebar() {
      var p = getAdminParts();
      if (!p.sidebar) return;
      if (p.sidebar.classList.contains('sidebar-open') || document.body.classList.contains('admin-sidebar-is-open')) {
         closeAdminSidebar();
      } else {
         openAdminSidebar();
      }
   }

   function initAdminHamburgerHardFix() {
      if (!isAdminPage()) return;
      document.body.classList.add('stayeasy-admin-page');
      ensureAdminBackdrop();
      window.openMobileSidebar = openAdminSidebar;
      window.closeMobileSidebar = closeAdminSidebar;
      window.toggleMobileSidebar = toggleAdminSidebar;

      // Bắt click ở capture phase để chặn mọi onclick/listener cũ gây toggle kép.
      if (!document.documentElement.dataset.stayeasyAdminHardfix3) {
         document.documentElement.dataset.stayeasyAdminHardfix3 = '1';
         document.addEventListener('click', function (ev) {
            var toggle = ev.target.closest && ev.target.closest('#mobileMenuToggle');
            if (toggle && isMobileAdmin()) {
               ev.preventDefault();
               ev.stopImmediatePropagation();
               toggleAdminSidebar();
               return false;
            }

            var backdrop = ev.target.closest && ev.target.closest('#sidebarBackdrop');
            if (backdrop && isMobileAdmin()) {
               ev.preventDefault();
               ev.stopImmediatePropagation();
               closeAdminSidebar();
               return false;
            }

            var navItem = ev.target.closest && ev.target.closest('#adminSidebarMenu button[data-bs-toggle="pill"], #adminSidebarMenu a');
            if (navItem && isMobileAdmin()) {
               setTimeout(closeAdminSidebar, 120);
            }
         }, true);

         document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') closeAdminSidebar();
         }, true);

         window.addEventListener('resize', function () {
            if (!isMobileAdmin()) closeAdminSidebar();
         });
      }
   }

   function formatVND(value) {
      var n = Number(value || 0);
      try { return new Intl.NumberFormat('vi-VN').format(n) + ' đ'; }
      catch (e) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ'; }
   }

   function getCurrentUserEmail() {
      var guestSession = {};
      try { guestSession = JSON.parse(localStorage.getItem('guestSession') || '{}') || {}; } catch (e) { }
      return guestSession.email || localStorage.getItem('userEmail') || '';
   }

   function getCachedOrders(email) {
      var keys = [];
      if (email) keys.push('stayeasy_myorders_' + email);
      keys.push('myBookings', 'bookings', 'stayeasyBookings');
      for (var i = 0; i < keys.length; i++) {
         try {
            var raw = localStorage.getItem(keys[i]);
            if (!raw) continue;
            var data = JSON.parse(raw);
            if (Array.isArray(data)) return data;
         } catch (e) { }
      }
      return [];
   }

   function statusBadge(order) {
      var status = order.status || 'pending';
      if (status === 'approved') return '<span class="badge rounded-pill" style="background:#dcfce7;color:#15803d;border:1px solid #86efac;font-size:10px;">✅ Đã duyệt</span>';
      if (status === 'cancelled') return '<span class="badge rounded-pill" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;font-size:10px;">❌ Đã huỷ</span>';
      return '<span class="badge rounded-pill" style="background:#fef9c3;color:#854d0e;border:1px solid #fde047;font-size:10px;">⏳ Chờ duyệt</span>';
   }

   function payBadge(order) {
      if (order.status === 'cancelled') return '';
      return order.isPaid
         ? '<span class="badge rounded-pill ms-1 bg-success" style="font-size:10px;">Đã thanh toán</span>'
         : '<span class="badge rounded-pill ms-1 bg-warning text-dark" style="font-size:10px;">Chưa thanh toán</span>';
   }

   function renderOrders(listEl, orders) {
      if (!listEl) return;
      if (!orders || !orders.length) {
         listEl.innerHTML = '<p class="text-muted text-center small py-3 mb-0"><i class="bi bi-inbox me-1"></i>Chưa có đơn nào</p>';
         return;
      }
      listEl.innerHTML = orders.map(function (o, idx) {
         var id = o.id || (idx + 1);
         var roomName = o.roomName || o.hotelName || o.room || 'Đơn đặt phòng';
         var checkIn = o.checkIn || o.checkin || o.startDate || '';
         var checkOut = o.checkOut || o.checkout || o.endDate || '';
         var total = o.totalPrice || o.price || o.total || 0;
         return '<div class="mb-2 order-card-item" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:11px 12px;">' +
            '<div class="d-flex justify-content-between align-items-center gap-2 mb-2">' +
            '<span class="fw-bold text-muted" style="font-size:11px;font-family:monospace;">#' + id + '</span>' +
            '<div class="d-flex align-items-center gap-1 flex-wrap justify-content-end">' + statusBadge(o) + payBadge(o) + '</div>' +
            '</div>' +
            '<div class="fw-semibold text-dark mb-2" style="font-size:13px;"><i class="bi bi-buildings me-1 text-primary opacity-75"></i>' + roomName + '</div>' +
            '<div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">' +
            '<span class="text-muted" style="font-size:12px;"><i class="bi bi-calendar3 me-1"></i>' + checkIn + (checkIn || checkOut ? ' → ' : '') + checkOut + '</span>' +
            '<span class="fw-bold" style="font-size:13px;color:#2563eb;">' + formatVND(total) + '</span>' +
            '</div>' +
            (o.status === 'approved' && !o.isPaid ? '<div class="mt-2 px-2 py-1 rounded-2 d-flex align-items-center gap-1" style="background:#fff7ed;border:1px solid #fb923c;"><i class="bi bi-exclamation-circle-fill" style="font-size:11px;color:#ea580c;"></i><span style="font-size:11px;color:#c2410c;font-weight:600;">Vui lòng thanh toán để nhận phòng</span></div>' : '') +
            '</div>';
      }).join('');
   }

   async function refreshOrdersIntoPanel() {
      var panel = document.getElementById('myOrdersPanel');
      var listEl = document.getElementById('myOrdersList');
      if (!panel || !listEl) return;
      var email = getCurrentUserEmail();
      var orders = getCachedOrders(email);
      renderOrders(listEl, orders);
      try {
         if (email && window.API && typeof API.getBookingsByEmail === 'function') {
            var fresh = await API.getBookingsByEmail(email);
            if (Array.isArray(fresh)) {
               localStorage.setItem('stayeasy_myorders_' + email, JSON.stringify(fresh));
               renderOrders(listEl, fresh);
               var badge = document.getElementById('orderCountBadge');
               if (badge) badge.textContent = fresh.length ? fresh.length : '';
            }
         }
      } catch (e) { }
   }

   function toggleMyOrdersPanel(forceOpen) {
      var panel = document.getElementById('myOrdersPanel');
      if (!panel) return;
      var willOpen = typeof forceOpen === 'boolean' ? forceOpen : !(panel.classList.contains('stayeasy-orders-open') || panel.style.display === 'block');
      panel.classList.toggle('stayeasy-orders-open', willOpen);
      panel.style.display = willOpen ? 'block' : 'none';
      if (willOpen) refreshOrdersIntoPanel();
   }

   function initUserOrdersHardFix() {
      if (document.documentElement.dataset.stayeasyOrdersHardfix3) return;
      document.documentElement.dataset.stayeasyOrdersHardfix3 = '1';
      document.addEventListener('click', function (ev) {
         var ordersBtn = ev.target.closest && ev.target.closest('#btnMyOrders');
         if (ordersBtn && isMobilePublic()) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            var menu = ordersBtn.closest('.user-menu-panel');
            if (menu) {
               menu.classList.add('stayeasy-user-menu-open');
               menu.style.display = 'block';
            }
            toggleMyOrdersPanel();
            return false;
         }
      }, true);
   }

   function initHotfix3() {
      initAdminHamburgerHardFix();
      initUserOrdersHardFix();
   }

   if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHotfix3);
   else initHotfix3();
   window.addEventListener('load', initHotfix3);
})();

/* HOTFIX 4 — ADMIN MOBILE PREMIUM UI */
(function () {
   'use strict';

   function isAdminPage() {
      return !!document.querySelector('.admin-sidebar, #adminSidebarMenu, #mobileMenuToggle');
   }

   function isMobileAdmin() {
      return window.matchMedia('(max-width: 768px)').matches;
   }

   function ensureBodyClass() {
      if (isAdminPage()) document.body.classList.add('stayeasy-admin-page');
   }

   function ensureSidebarCloseButton() {
      var sidebarHeader = document.querySelector('.admin-sidebar > .p-4.border-bottom');
      if (!sidebarHeader || sidebarHeader.querySelector('.admin-mobile-sidebar-close')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'admin-mobile-sidebar-close';
      btn.setAttribute('aria-label', 'Đóng menu quản trị');
      btn.innerHTML = '<i class="bi bi-x-lg"></i>';
      btn.addEventListener('click', function (e) {
         e.preventDefault();
         if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
         else {
            document.querySelector('.admin-sidebar')?.classList.remove('sidebar-open');
            document.getElementById('sidebarBackdrop')?.classList.remove('show');
            document.body.classList.remove('admin-sidebar-is-open');
         }
      });
      sidebarHeader.appendChild(btn);
   }

   function strengthenAdminSidebar() {
      var sidebar = document.querySelector('.admin-sidebar');
      var toggle = document.getElementById('mobileMenuToggle');
      if (!sidebar || !toggle) return;
      var backdrop = document.getElementById('sidebarBackdrop');
      if (!backdrop) {
         backdrop = document.createElement('div');
         backdrop.id = 'sidebarBackdrop';
         backdrop.className = 'sidebar-backdrop';
         document.body.insertBefore(backdrop, document.body.firstChild);
      }

      function open() {
         if (!isMobileAdmin()) return;
         document.body.classList.add('stayeasy-admin-page', 'admin-sidebar-is-open');
         sidebar.classList.add('sidebar-open');
         backdrop.classList.add('show');
         toggle.setAttribute('aria-expanded', 'true');
      }

      function close() {
         sidebar.classList.remove('sidebar-open');
         backdrop.classList.remove('show');
         document.body.classList.remove('admin-sidebar-is-open');
         toggle.setAttribute('aria-expanded', 'false');
      }

      function toggleSidebar(ev) {
         if (ev) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
         }
         if (sidebar.classList.contains('sidebar-open')) close();
         else open();
         return false;
      }

      window.openMobileSidebar = open;
      window.closeMobileSidebar = close;
      window.toggleMobileSidebar = toggleSidebar;

      if (!document.documentElement.dataset.stayeasyAdminHotfix4Sidebar) {
         document.documentElement.dataset.stayeasyAdminHotfix4Sidebar = '1';
         document.addEventListener('click', function (ev) {
            var t = ev.target.closest && ev.target.closest('#mobileMenuToggle');
            if (t && isMobileAdmin()) return toggleSidebar(ev);

            var b = ev.target.closest && ev.target.closest('#sidebarBackdrop');
            if (b && isMobileAdmin()) {
               ev.preventDefault();
               ev.stopImmediatePropagation();
               close();
               return false;
            }

            var item = ev.target.closest && ev.target.closest('#adminSidebarMenu button[data-bs-toggle="pill"], #adminSidebarMenu a');
            if (item && isMobileAdmin()) setTimeout(close, 120);
         }, true);

         document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') close();
         }, true);
      }
   }

   function getHeaders(table) {
      return Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) {
         return (th.textContent || '').replace(/\s+/g, ' ').trim();
      });
   }

   function enhanceTable(table) {
      if (!table) return;
      table.classList.add('admin-mobile-card-table');
      var headers = getHeaders(table);
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function (tr) {
         var cells = tr.querySelectorAll('td');
         if (cells.length <= 1 || cells[0].hasAttribute('colspan')) {
            tr.classList.add('admin-empty-row');
         }
         cells.forEach(function (td, index) {
            var label = headers[index] || '';
            if (td.hasAttribute('colspan')) label = '';
            td.setAttribute('data-admin-label', label);
            td.classList.toggle('admin-mobile-primary', index === 0 && cells.length > 1);
            td.classList.toggle('admin-mobile-actions', /hành động|xóa|xoá/i.test(label));
         });
      });
   }

   var enhanceTimer = null;
   function enhanceAdminTables() {
      if (!isAdminPage()) return;
      document.querySelectorAll('main table.table').forEach(enhanceTable);
   }

   function scheduleEnhance() {
      clearTimeout(enhanceTimer);
      enhanceTimer = setTimeout(enhanceAdminTables, 60);
   }

   function observeAdminTables() {
      if (!isAdminPage() || document.documentElement.dataset.stayeasyAdminHotfix4Tables) return;
      document.documentElement.dataset.stayeasyAdminHotfix4Tables = '1';
      enhanceAdminTables();
      var root = document.querySelector('main') || document.body;
      if (window.MutationObserver) {
         new MutationObserver(function (mutations) {
            var should = mutations.some(function (m) {
               return m.type === 'childList' && Array.prototype.some.call(m.addedNodes, function (n) {
                  return n.nodeType === 1 && (n.matches?.('tr, td, table, tbody') || n.querySelector?.('tr, td, table, tbody'));
               });
            });
            if (should) scheduleEnhance();
         }).observe(root, { childList: true, subtree: true });
      }
   }

   function improveHeaderTitle() {
      if (!isAdminPage() || document.documentElement.dataset.stayeasyAdminHotfix4Title) return;
      document.documentElement.dataset.stayeasyAdminHotfix4Title = '1';
      var title = document.getElementById('headerTitle');
      document.addEventListener('shown.bs.tab', function (ev) {
         if (!title) return;
         var btn = ev.target;
         if (!btn || !btn.matches('#adminSidebarMenu button[data-bs-toggle="pill"]')) return;
         var clone = btn.cloneNode(true);
         clone.querySelectorAll('i, .badge').forEach(function (x) { x.remove(); });
         title.textContent = (clone.textContent || '').replace(/\s+/g, ' ').trim() || title.textContent;
         setTimeout(scheduleEnhance, 50);
      });
   }

   function polishAdminMobile() {
      ensureBodyClass();
      ensureSidebarCloseButton();
      strengthenAdminSidebar();
      observeAdminTables();
      improveHeaderTitle();
      scheduleEnhance();
   }

   if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', polishAdminMobile);
   else polishAdminMobile();
   window.addEventListener('load', polishAdminMobile);
   window.addEventListener('resize', function () {
      if (isAdminPage()) scheduleEnhance();
   });
})();

/* HOTFIX 5 — Admin mobile: gắn loại bảng + tinh chỉnh card sau render */
(function () {
   'use strict';

   function isAdminPage() {
      return !!document.querySelector('.admin-sidebar, #adminSidebarMenu, #mobileMenuToggle');
   }

   function tableKindFromTbody(tbody) {
      if (!tbody || !tbody.id) return 'generic';
      var id = tbody.id.toLowerCase();
      if (id.includes('room')) return 'rooms';
      if (id.includes('booking')) return 'bookings';
      if (id.includes('revenue')) return 'revenue';
      if (id.includes('promo')) return 'promotions';
      if (id.includes('customer')) return 'customers';
      if (id.includes('review')) return 'reviews';
      return 'generic';
   }

   function normalizeTable(table) {
      if (!table) return;
      var tbody = table.querySelector('tbody');
      var kind = tableKindFromTbody(tbody);
      table.classList.add('admin-mobile-card-table');
      table.setAttribute('data-admin-kind', kind);

      var headers = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) {
         return (th.textContent || '').replace(/\s+/g, ' ').trim();
      });

      Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function (tr) {
         tr.setAttribute('data-admin-row-kind', kind);
         var cells = Array.prototype.slice.call(tr.querySelectorAll('td'));
         if (cells.length <= 1 || (cells[0] && cells[0].hasAttribute('colspan'))) {
            tr.classList.add('admin-empty-row');
         }
         cells.forEach(function (td, index) {
            var label = headers[index] || '';
            if (td.hasAttribute('colspan')) label = '';
            td.setAttribute('data-admin-label', label);
            td.classList.toggle('admin-mobile-primary', index === 0 && cells.length > 1);
            td.classList.toggle('admin-mobile-actions', /hành động|xóa|xoá/i.test(label));
            td.setAttribute('data-admin-cell-index', String(index + 1));
         });
      });
   }

   function normalizeAll() {
      if (!isAdminPage()) return;
      document.body.classList.add('stayeasy-admin-page');
      document.querySelectorAll('main table.table').forEach(normalizeTable);
   }

   var timer = null;
   function schedule() {
      clearTimeout(timer);
      timer = setTimeout(normalizeAll, 80);
   }

   function init() {
      if (!isAdminPage()) return;
      normalizeAll();
      var root = document.querySelector('main') || document.body;
      if (window.MutationObserver && !document.documentElement.dataset.stayeasyAdminHotfix5Observer) {
         document.documentElement.dataset.stayeasyAdminHotfix5Observer = '1';
         new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
      }
      document.addEventListener('shown.bs.tab', schedule, true);
   }

   if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
   else init();
   window.addEventListener('load', init);
   window.addEventListener('resize', schedule);
})();
