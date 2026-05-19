import React, { memo, useState } from 'react'

function LazyImage({ src, alt, className = '', style, width, height }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-[#1E3353] text-[#8A95A5] text-xs ${className}`}
        style={{ width, height, ...style }}
      >
        🚗
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#1E3353] via-[#243a5c] to-[#1E3353]"
          aria-hidden
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`w-full h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

export default memo(LazyImage)
