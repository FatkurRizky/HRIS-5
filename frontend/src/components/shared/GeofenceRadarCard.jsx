import { KAMPUS_2_UNP_OFFICE } from '../../lib/constants'

/**
 * Kartu radar geofence bersama untuk Portal Karyawan & Portal HR.
 * Menampilkan posisi terhadap Kampus 2 UNP Kediri (-7.8036003, 112.005465) dengan batas 200 meter.
 */
export default function GeofenceRadarCard({
  officeLocation,
  maxOfficeRadius,
  simulatedDistance,
  setSimulatedDistance,
  realCoords,
  gpsLoading,
  detectRealGps,
  isWithinGeofence,
  variant = 'warm', // 'warm' (Employee) | 'emerald' (HR)
  headerSlot = null,
  footerSlot = null,
}) {
  const isEmerald = variant === 'emerald'
  const sliderMax = Math.max(400, maxOfficeRadius * 2)

  // Skala posisi titik relatif terhadap lingkaran radius (di dalam lingkaran bila <= maxOfficeRadius)
  const ratio = maxOfficeRadius > 0 ? simulatedDistance / maxOfficeRadius : 0
  const clampedOffset = Math.min(44, Math.round(ratio * 22))

  return (
    <div
      className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs ${
        isEmerald ? 'border-stone-200' : 'border-[#ece7de]'
      }`}
    >
      {headerSlot}

      <div className="flex items-center justify-between gap-2 mb-1 text-xs flex-wrap">
        <span className="text-stone-700 font-medium">
          Jarak ke <strong className="text-stone-900">{officeLocation.name}</strong>:{' '}
          <strong className="text-stone-900 text-sm">{simulatedDistance} m</strong>
          <span className="text-stone-400 ml-1">(Batas: {maxOfficeRadius} m)</span>
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
            isWithinGeofence
              ? 'bg-[#e8f7ee] text-[#1b7a43]'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {isWithinGeofence
            ? `Dalam radius (≤${maxOfficeRadius}m)`
            : `Luar radius (>${maxOfficeRadius}m)`}
        </span>
      </div>

      <div className="text-[11px] text-stone-500 mb-3 flex items-center gap-2 flex-wrap">
        <span>
          Koordinat: {officeLocation.latitude}, {officeLocation.longitude}
        </span>
        <a
          href={officeLocation.mapsUrl || KAMPUS_2_UNP_OFFICE.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className={`font-semibold hover:underline ${
            isEmerald ? 'text-[#0f3832]' : 'text-[#c44d27]'
          }`}
        >
          Lihat Maps ↗
        </a>
        {realCoords && (
          <span className="text-[#1b7a43] font-semibold">
            • GPS Aktif ({realCoords.latitude.toFixed(5)},{' '}
            {realCoords.longitude.toFixed(5)})
          </span>
        )}
      </div>

      {/* Lingkaran Radar Area Kampus */}
      <div
        className={`rounded-2xl h-60 flex flex-col items-center justify-center relative mb-4 overflow-hidden ${
          isEmerald
            ? 'bg-[#f3f5f0] border border-stone-200'
            : 'bg-[#f5f2eb]'
        }`}
      >
        <div
          className={`w-44 h-44 rounded-full flex flex-col items-center justify-center relative border-2 border-dashed ${
            isWithinGeofence
              ? isEmerald
                ? 'bg-[#d8e6de] border-[#1b7a43]/40'
                : 'bg-[#dbe8dd] border-[#1b7a43]/40'
              : 'bg-rose-50/70 border-rose-300'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs mb-1 ${
              isEmerald ? 'bg-[#0f3832]' : 'bg-[#c44d27]'
            }`}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <span className="text-[11px] font-bold text-stone-700 text-center px-3">
            {officeLocation.name}
          </span>
          <span className="text-[10px] text-stone-500">
            Radius {maxOfficeRadius}m
          </span>
        </div>

        {/* Titik Posisi Karyawan */}
        <div
          className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md transition-all duration-300 ${
            isWithinGeofence ? 'bg-[#1b7a43]' : 'bg-rose-600'
          }`}
          style={{
            top: `calc(50% - ${clampedOffset}%)`,
            left: `calc(50% + ${clampedOffset}%)`,
          }}
          title={`Jarak Anda: ${simulatedDistance}m`}
        />
      </div>

      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <span className="text-xs font-semibold text-stone-700">
          Simulasi jarak (0m – {sliderMax}m, batas {maxOfficeRadius}m)
        </span>
        <button
          type="button"
          onClick={detectRealGps}
          disabled={gpsLoading}
          className={`text-[11px] font-bold hover:underline cursor-pointer disabled:opacity-50 ${
            isEmerald ? 'text-[#0f3832]' : 'text-[#c44d27]'
          }`}
        >
          {gpsLoading ? 'Mendeteksi GPS...' : 'Gunakan GPS Asli Saya'}
        </button>
      </div>

      <input
        type="range"
        min="0"
        max={sliderMax}
        value={Math.min(sliderMax, simulatedDistance)}
        onChange={(e) => setSimulatedDistance(Number(e.target.value))}
        className="w-full accent-[#1d64d8] cursor-pointer mb-1"
      />
      <div className="flex justify-between text-[10px] text-stone-400">
        <span>0m (Titik Kampus)</span>
        <span className="font-semibold text-[#1b7a43]">
          Batas {maxOfficeRadius}m
        </span>
        <span className="text-rose-600">{sliderMax}m (Luar Area)</span>
      </div>

      {footerSlot && <div className="mt-5">{footerSlot}</div>}
    </div>
  )
}
