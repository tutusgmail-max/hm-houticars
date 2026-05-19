/**
 * Client-side image compression before upload (smaller payloads, faster loads).
 */
export async function compressImage(file, { maxWidth = 1600, quality = 0.82 } = {}) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif') return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
      'image/jpeg',
      quality,
    )
  })

  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}
