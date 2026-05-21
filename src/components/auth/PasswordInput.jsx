import React, { useState } from 'react'
import { FiEye, FiEyeOff, FiLock } from 'react-icons/fi'

export default function PasswordInput({
  value,
  onChange,
  onKeyDown,
  placeholder = '••••••••',
  className = '',
  autoComplete = 'current-password',
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/50 text-sm pointer-events-none z-10" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`
          w-full pl-10 pr-11 py-3.5 rounded-xl text-sm text-white placeholder-white/25
          bg-white/[0.05] border transition-all duration-200 outline-none
          focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)]
          border-white/[0.10] focus:border-gold/50
          ${className}
        `}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 bg-transparent border-none cursor-pointer transition-colors"
        tabIndex={-1}
        aria-label={show ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
      >
        {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
      </button>
    </div>
  )
}
