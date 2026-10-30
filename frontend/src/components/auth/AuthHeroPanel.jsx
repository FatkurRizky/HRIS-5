/**
 * Panel kiri halaman autentikasi: Branding & proposisi nilai utama HRIS (Pages 1 & 2 desain_UI.pdf).
 */
export default function AuthHeroPanel() {
  return (
    <div className="relative bg-gradient-to-br from-[#1b4642] via-[#163e3b] to-[#0f2e2c] p-8 sm:p-14 lg:p-16 xl:p-24 flex flex-col justify-between overflow-hidden text-white min-h-[500px] lg:min-h-screen">
      {/* Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-[#c59858] opacity-20 blur-[120px] rounded-full pointer-events-none" />

      {/* Concentric Ripple Rings */}
      <div className="absolute -bottom-48 -right-48 w-[800px] h-[800px] pointer-events-none">
        <div className="absolute w-[800px] h-[800px] rounded-full border border-[rgba(77,137,130,0.22)]" />
        <div className="absolute w-[640px] h-[640px] top-[80px] left-[80px] rounded-full border border-[rgba(77,137,130,0.22)]" />
        <div className="absolute w-[480px] h-[480px] top-[160px] left-[160px] rounded-full border border-[rgba(77,137,130,0.22)]" />
        <div className="absolute w-[320px] h-[320px] top-[240px] left-[240px] rounded-full border border-[rgba(77,137,130,0.22)]" />
      </div>

      {/* Top Branding */}
      <div className="relative z-10 flex items-center space-x-3.5">
        <div className="w-8 h-8 rounded-[8px] bg-[#e68a35] shadow-sm flex items-center justify-center shrink-0">
          <svg
            className="w-4.5 h-4.5 text-white opacity-95"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a2 2 0 00-2 2v1a2 2 0 002 2 2 2 0 002-2V4a2 2 0 00-2-2zM4 7a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
          </svg>
        </div>
        <span className="text-white text-[16px] sm:text-[17px] font-bold tracking-tight">
          Human Resource Information System
        </span>
      </div>

      {/* Bottom Headline & Features */}
      <div className="relative z-10 mt-20 lg:mt-32 max-w-xl">
        <h1 className="text-4xl sm:text-5xl lg:text-[50px] xl:text-[54px] font-extrabold text-white leading-[1.15] tracking-tight mb-10">
          Absensi, cuti, dan
          <br />
          gaji di satu
          <br />
          tempat
        </h1>

        <ul className="space-y-5 text-[15px] sm:text-[16px] text-[#9db7b2] font-medium leading-relaxed">
          {[
            'Clock in dari radius kantor, tanpa mesin fingerprint',
            'Cuti disetujui Manager lalu HR, statusnya terlihat jelas',
            'Slip gaji dihitung otomatis dari absensi dan lembur',
          ].map((item) => (
            <li key={item} className="flex items-start space-x-3.5">
              <svg
                className="w-5.5 h-5.5 text-[#e68a35] shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
