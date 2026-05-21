import React, { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'

export default function PasswordInput({ value, onChange, onKeyDown, placeholder = '••••••••', className = '' }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="current-password"
        className={`auth-input pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40
          hover:text-white/80 bg-transparent border-none cursor-pointer transition-colors"
        tabIndex={-1}
        aria-label={show ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
      >
        {show ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  )
}
