import { useState } from 'react'
import { supabase } from '../lib/supabase'

const errores = {
  'Invalid login credentials': 'Correo o contraseña incorrectos',
  'Email not confirmed': 'Confirma tu correo antes de entrar',
  'User already registered': 'Este correo ya tiene una cuenta',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
}

function traducirError(msg) {
  return errores[msg] ?? msg
}

export default function Login() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMensaje('')

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(traducirError(error.message))
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(traducirError(error.message))
      else setMensaje('Revisa tu correo para confirmar tu cuenta 📬')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-3">🪺</div>
        <h1 className="text-2xl font-bold text-[#2D2926] tracking-tight">Nido</h1>
        <p className="text-[#8C7E75] text-sm mt-1">Tu hogar, organizado.</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-[#EDE8E3] shadow-sm w-full max-w-sm p-6">

        {/* Tabs */}
        <div className="flex rounded-xl bg-[#FAF7F4] p-1 mb-6">
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setMensaje('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-white text-[#2D2926] shadow-sm'
                  : 'text-[#8C7E75]'
              }`}
            >
              {t === 'login' ? 'Entrar' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#2D2926]">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              className="px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] placeholder-[#8C7E75] text-sm focus:outline-none focus:border-[#D4845A] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#2D2926]">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="px-4 py-3 rounded-xl border border-[#EDE8E3] bg-[#FAF7F4] text-[#2D2926] placeholder-[#8C7E75] text-sm focus:outline-none focus:border-[#D4845A] transition-colors"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-[#FDF0EE] border border-[#C0614A]/20">
              <p className="text-sm text-[#C0614A]">{error}</p>
            </div>
          )}

          {mensaje && (
            <div className="px-4 py-3 rounded-xl bg-[#F0F5F0] border border-[#8BAF8D]/30">
              <p className="text-sm text-[#8BAF8D]">{mensaje}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-3 rounded-xl bg-[#D4845A] text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {loading ? 'Cargando...' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>

      <p className="text-xs text-[#8C7E75] mt-8">Nido 🪺 — solo para tu hogar</p>
    </div>
  )
}
