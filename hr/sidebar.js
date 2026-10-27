document.addEventListener("DOMContentLoaded", function() {
    let currentPath = window.location.pathname.split('/').pop();
    if (currentPath === '') currentPath = 'index.html';

    const menus = [
        { name: 'Beranda', url: 'index.html', icon: 'ph-squares-four' },
        { name: 'Karyawan', url: 'karyawan.html', icon: 'ph-users' },
        { name: 'Absensi Pribadi', url: 'absensi-pribadi.html', icon: 'ph-fingerprint' },
        { name: 'Rekap Absensi', url: 'rekap-absensi.html', icon: 'ph-list-checks' },
        { name: 'Pengajuan Cuti', url: 'pengajuan-cuti.html', icon: 'ph-calendar-plus' },
        { name: 'Approval Cuti', url: 'approval-cuti.html', icon: 'ph-check-square' },
        { name: 'Payroll', url: 'payroll.html', icon: 'ph-wallet' }
    ];

    let navLinksHTML = '';
    menus.forEach(menu => {
        const isActive = currentPath === menu.url;
        
        const activeClass = isActive 
            ? 'bg-accent text-brand-superdark font-bold transition-transform hover:scale-[1.02]' 
            : 'text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-colors';
            
        const iconClass = isActive ? `ph-fill ${menu.icon}` : `ph ${menu.icon}`;

        navLinksHTML += `
            <a href="${menu.url}" class="flex items-center px-4 py-3 rounded-xl ${activeClass}">
                <i class="${iconClass} text-xl mr-3"></i>
                ${menu.name}
            </a>
        `;
    });

    const sidebarHTML = `
        <aside id="sidebar" class="bg-brand-superdark text-white w-64 flex flex-col shrink-0 fixed lg:relative inset-y-0 left-0 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 h-screen overflow-y-auto">
            
            <div class="flex-1 flex flex-col">
                <div class="p-6 pt-8 mt-12 lg:mt-0 flex items-start gap-4">
                    <div class="w-3.5 h-7 bg-accent rounded-[4px] mt-1 shrink-0"></div>
                    <h1 class="text-base font-bold leading-snug tracking-tight">
                        Human<br>Resource<br>Information<br>System
                    </h1>
                </div>

                <nav class="flex flex-col px-4 mt-2 space-y-1">
                    ${navLinksHTML}
                </nav>
            </div>

            <!-- Bagian Bawah (Kotak Akun di atas, Keluar di bawah) -->
            <div class="p-4 mt-auto space-y-3 mb-4">
                <!-- Kotak Info Akun -->
                <div class="bg-[#1A4540] p-4 rounded-xl">
                    <p class="text-[11px] text-gray-400 mb-1">Masuk sebagai</p>
                    <p class="text-sm font-semibold text-white">Rina Kusuma &middot; HR</p>
                </div>
                
                <!-- Tombol Keluar (Paling Bawah) -->
                <a href="#" class="flex items-center px-4 py-3 bg-[#1A4540] text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold group">
                    <i class="ph ph-sign-out text-xl mr-3 group-hover:animate-pulse"></i>
                    Keluar
                </a>
            </div>
            
        </aside>

        <div id="sidebarOverlay" class="fixed inset-0 bg-black/50 z-30 hidden lg:hidden"></div>
    `;

    const sidebarContainer = document.getElementById('global-sidebar-container');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = sidebarHTML;
    }

    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (btn && sidebar && overlay) {
        function toggleSidebar() {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        }
        btn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
    }
});