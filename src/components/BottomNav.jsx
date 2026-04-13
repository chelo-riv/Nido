import { NavLink } from 'react-router-dom'
import { Home, List, Plus, Heart, Wallet } from 'lucide-react'

const tabs = [
  { to: '/dashboard', icon: Home,   label: 'Inicio'   },
  { to: '/gastos',    icon: List,   label: 'Gastos'   },
  { to: '/agregar',   icon: Plus,   label: 'Agregar', central: true },
  { to: '/wishlist',  icon: Heart,  label: 'Deseos'   },
  { to: '/balances',  icon: Wallet, label: 'Balances' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8E3] flex items-center justify-around px-2 h-16 safe-area-bottom z-50">
      {tabs.map(({ to, icon: Icon, label, central }) =>
        central ? (
          <NavLink
            key={to}
            to={to}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#D4845A] shadow-md -mt-5 text-white"
          >
            <Icon size={22} strokeWidth={2.5} />
          </NavLink>
        ) : (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                isActive ? 'text-[#D4845A]' : 'text-[#8C7E75]'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        )
      )}
    </nav>
  )
}
