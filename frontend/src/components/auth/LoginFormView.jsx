import { useState } from 'react'

/**
 * View A: Form Masuk & Pemilih Akun Demo (Page 1 desain_UI.pdf).
 */
export default function LoginFormView({
  email,
  setEmail,
  password,
  setPassword,
  errorMessage,
  clearError,
  status,
  activeRole,
  demoAccounts,
  onSelectDemo,
  onSubmit,
  onSwitchRegister,
  onForgotPassword,
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#112a27] tracking-tight">
          Masuk
        </h2>
        <p className="text-[14px] sm:text-[15px] text-[#697472] mt-2 font-normal">
          Gunakan email kerja yang terdaftar di HR.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-start space-x-2.5">
          <span className="font-bold text-base leading-none mt-0.5">⚠️</span>
          <span className="flex-1 leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-[14px] font-bold text-[#142d2a] mb-2"
          >
            Email kerja
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearError()
            }}
            onFocus={() => {
              if (email === 'nama@kerabat.id') setEmail('')
            }}
            required
            placeholder="nama@kerabat.id"
            className="w-full px-4 py-3 rounded-lg bg-[#ede9e2] border-2 border-[#d99748] text-[#16302c] placeholder-[#9c9689] text-[15px] font-medium outline-none shadow-xs"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[14px] font-bold text-[#142d2a] mb-2"
          >
            Kata sandi
          </label>
          <div className="relative rounded-lg bg-[#ede9e2] border border-[#dedad1] focus-within:border-[#d99748] focus-within:border-2 transition-all shadow-xs">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearError()
              }}
              required
              placeholder="••••••••"
              className="w-full pl-4 pr-24 py-3 bg-transparent text-[#16302c] placeholder-[#9c9689] text-[15px] font-medium outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#173e3b] hover:text-[#102e2c] transition-colors py-1 px-2 cursor-pointer"
            >
              {showPassword ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>

          <div className="flex justify-end mt-2.5">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[13px] sm:text-[14px] font-bold text-[#173e3b] underline hover:text-[#102e2c] cursor-pointer"
            >
              Lupa kata sandi?
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3.5 px-4 rounded-lg bg-[#173e3b] hover:bg-[#123330] active:scale-[0.99] text-white font-bold text-[16px] shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {status === 'loading' ? 'Memproses Masuk...' : 'Masuk'}
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-[14px] text-[#697472]">
            Belum punya akun?{' '}
            <button
              type="button"
              onClick={onSwitchRegister}
              className="font-bold text-[#173e3b] underline hover:text-[#102e2c] cursor-pointer ml-1"
            >
              Daftar
            </button>
          </p>
        </div>
      </form>

      {/* Demo Account Selector */}
      <div className="mt-8 pt-4 pb-4 px-4 sm:px-5 rounded-xl border border-dashed border-[#ccc7bc] bg-[#e3dfd7]/70">
        <p className="text-[12px] sm:text-[13px] font-medium text-[#646e6b] mb-3">
          Akun demo, kata sandi semuanya{' '}
          <span className="font-bold text-[#354340]">kerabat123</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {demoAccounts.map((account) => {
            const isSelected = activeRole === account.role
            return (
              <button
                key={account.role}
                type="button"
                onClick={() => onSelectDemo(account)}
                className={`py-2 px-2 bg-white hover:bg-stone-50 text-[12px] sm:text-[13px] font-semibold text-[#293c39] rounded-lg shadow-xs border border-[#d6d2c8] text-center transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-[#173e3b] bg-[#f4f7f6]' : ''
                }`}
              >
                {account.label}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
