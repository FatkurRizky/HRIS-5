/**
 * View B: Form Registrasi Mandiri Karyawan (Page 2 desain_UI.pdf).
 */
export default function RegisterFormView({
  regForm,
  setRegForm,
  errorMessage,
  status,
  onSubmit,
  onSwitchLogin,
}) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#112a27] tracking-tight">
          Buat akun
        </h2>
        <p className="text-[13px] sm:text-[14px] text-[#697472] mt-1.5 font-normal">
          ID karyawan akan dibuat otomatis setelah akun terdaftar.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-[13px] font-bold text-[#142d2a] mb-1.5">
            Nama lengkap
          </label>
          <input
            type="text"
            required
            placeholder="Bima Pratama"
            value={regForm.name}
            onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg bg-[#ede9e2] border-2 border-[#d99748] text-[#16302c] text-sm font-medium outline-none"
          />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#142d2a] mb-1.5">
            Departemen
          </label>
          <select
            value={regForm.dept}
            onChange={(e) => setRegForm({ ...regForm, dept: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-[#ede9e2] border border-[#dedad1] text-sm text-[#16302c] outline-none"
          >
            <option value="Engineering">Engineering</option>
            <option value="HR">HR</option>
            <option value="Operasional">Operasional</option>
            <option value="Finance">Finance</option>
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#142d2a] mb-1.5">
            Email kerja
          </label>
          <input
            type="email"
            required
            placeholder="nama@kerabat.id"
            value={regForm.email}
            onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg bg-[#ede9e2] border border-[#dedad1] text-sm text-[#16302c] outline-none"
          />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#142d2a] mb-1.5">
            Kata sandi
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={regForm.password}
            onChange={(e) =>
              setRegForm({ ...regForm, password: e.target.value })
            }
            className="w-full px-4 py-2.5 rounded-lg bg-[#ede9e2] border border-[#dedad1] text-sm outline-none"
          />
          <p className="text-[11px] text-stone-500 mt-1">
            Minimal 8 karakter, gabungan huruf dan angka
          </p>
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#142d2a] mb-1.5">
            Ulangi kata sandi
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={regForm.confirmPassword}
            onChange={(e) =>
              setRegForm({ ...regForm, confirmPassword: e.target.value })
            }
            className="w-full px-4 py-2.5 rounded-lg bg-[#ede9e2] border border-[#dedad1] text-sm outline-none"
          />
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="agree"
            checked={regForm.agree}
            onChange={(e) =>
              setRegForm({ ...regForm, agree: e.target.checked })
            }
            className="mt-0.5 accent-[#173e3b] cursor-pointer"
          />
          <label
            htmlFor="agree"
            className="text-[12px] text-stone-600 leading-tight cursor-pointer"
          >
            Saya setuju data saya diproses untuk keperluan kepegawaian sesuai
            kebijakan privasi perusahaan.
          </label>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-3.5 rounded-lg bg-[#173e3b] hover:bg-[#123330] text-white font-bold text-sm shadow-sm transition cursor-pointer mt-2 disabled:opacity-60"
        >
          {status === 'loading' ? 'Mendaftarkan...' : 'Buat akun'}
        </button>

        <div className="text-center pt-2">
          <p className="text-[13px] text-[#697472]">
            Sudah punya akun?{' '}
            <button
              type="button"
              onClick={onSwitchLogin}
              className="font-bold text-[#173e3b] underline hover:text-[#102e2c] cursor-pointer ml-1"
            >
              Masuk
            </button>
          </p>
        </div>
      </form>
    </>
  )
}
