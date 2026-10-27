class AppSidebar extends HTMLElement {
    connectedCallback() {
        const currentPath = window.location.pathname;
        const isPersetujuan = currentPath.includes('persetujuan.html');
        const isTimSaya = currentPath.includes('tim.html');
        const isIndex = !isPersetujuan && !isTimSaya;

        const activeClass = 'bg-[#2a5b8a] text-white shadow-md';
        const inactiveClass = 'text-gray-700 hover:bg-gray-100';

        this.innerHTML = `
        <!-- HEADER MOBILE (Hanya Muncul di Layar Kecil) -->
        <div class="md:hidden fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-40 px-5 py-3 flex justify-between items-center shadow-sm">
            <h1 class="text-xl font-bold text-[#2a5b8a]">Kerabat</h1>
            <!-- Tombol Hamburger -->
            <button id="openSidebarBtn" class="text-gray-600 focus:outline-none p-1 rounded-md hover:bg-gray-100 transition-colors">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
        </div>

        <!-- OVERLAY GELAP (Untuk menutup sidebar saat area luar diklik) -->
        <div id="sidebarOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden transition-opacity duration-300 opacity-0 md:hidden"></div>

        <!-- SIDEBAR UTAMA (Fixed di Mobile, Sticky di Desktop) -->
        <!-- Menggunakan transform -translate-x-full untuk menyembunyikan di luar layar kiri pada mobile -->
        <div id="mainSidebar" class="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col justify-between fixed md:sticky top-0 left-0 z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-300 h-screen shadow-2xl md:shadow-none">
            
            <div class="p-6">
                <!-- Header / Logo Area -->
                <div class="flex justify-between items-start mb-10 mt-2 pl-2">
                    <div>
                        <h1 class="text-2xl font-bold text-[#2a5b8a] mb-1">Kerabat</h1>
                        <p class="text-xs text-gray-500 font-medium">Sari Utami &middot; Manager</p>
                    </div>
                    <!-- Tombol Silang (Close) Khusus Mobile -->
                    <button id="closeSidebarBtn" class="md:hidden text-gray-400 hover:text-gray-700 bg-gray-50 p-1.5 rounded-lg">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Navigation -->
                <nav class="space-y-1 font-medium">
                    <a href="index.html" class="block px-4 py-2.5 rounded-lg transition-colors ${isIndex ? activeClass : inactiveClass}">
                        Ringkasan
                    </a>
                    <a href="persetujuan.html" class="flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${isPersetujuan ? activeClass : inactiveClass}">
                        <span>Persetujuan</span>
                        <span class="bg-[#d94a38] text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">3</span>
                    </a>
                    <a href="tim.html" class="block px-4 py-2.5 rounded-lg transition-colors ${isTimSaya ? activeClass : inactiveClass}">
                        Tim saya
                    </a>
                </nav>
            </div>
            
            <!-- Logout -->
            <div class="p-6 border-t border-gray-50">
                <a href="#" class="flex items-center gap-3 px-4 py-2.5 text-red-600 font-semibold rounded-lg hover:bg-red-50 hover:text-red-700 transition-all duration-200 group">
                    <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Keluar
                </a>
            </div>
        </div>
        `;

        // LOGIKA JAVASCRIPT UNTUK BUKA/TUTUP SIDEBAR DI MOBILE
        const openBtn = this.querySelector('#openSidebarBtn');
        const closeBtn = this.querySelector('#closeSidebarBtn');
        const sidebar = this.querySelector('#mainSidebar');
        const overlay = this.querySelector('#sidebarOverlay');

        // Fungsi Buka Menu
        openBtn.addEventListener('click', () => {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        });

        // Fungsi Tutup Menu
        const closeMenu = () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 300); // Tunggu animasi selesai
        };

        closeBtn.addEventListener('click', closeMenu);
        overlay.addEventListener('click', closeMenu); // Tutup saat area gelap diklik
    }
}
customElements.define('app-sidebar', AppSidebar);