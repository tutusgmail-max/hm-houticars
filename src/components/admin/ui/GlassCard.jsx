import React from 'react'
import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '', animate = false, ...props }) {
  const Wrapper = animate ? motion.div : 'div'
  const animProps = animate
    ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: [0.16,1,0.3,1] } }
    : {}

  return (
    <Wrapper
      {...animProps}
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(13,20,34,0.65)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        ...props.style,
      }}
      {...props}
    >
      {children}
    </Wrapper>
  )
}
