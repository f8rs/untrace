export async function processFile(file) {
  const firstBlob = await canvasProcess(file)
  const finalBlob = await verifyAndClean(firstBlob)
  return makeResult(finalBlob, file)
}

function canvasProcess(source) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const srcUrl = URL.createObjectURL(source)
    img.onload = () => {
      URL.revokeObjectURL(srcUrl)
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        const isPng = source instanceof File && source.type === 'image/png' && img.width * img.height < 1_000_000
        const type = isPng ? 'image/png' : 'image/jpeg'
        const quality = type === 'image/jpeg' ? 0.92 : undefined
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
          type, quality
        )
      } catch (e) { reject(e) }
    }
    img.onerror = () => { URL.revokeObjectURL(srcUrl); reject(new Error('Failed to load image')) }
    img.src = srcUrl
  })
}

async function verifyAndClean(blob) {
  try {
    const { parse } = await import('exifr')
    const remaining = await parse(blob, {
      tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: true, silentErrors: true,
    })
    if (remaining && Object.keys(remaining).length > 0) {
      return secondPassClean(blob)
    }
  } catch {
    // parse failure usually means already clean
  }
  return blob
}

function secondPassClean(blob) {
  return new Promise((resolve) => {
    const img = new Image()
    const srcUrl = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(srcUrl)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', 0.95)
    }
    img.onerror = () => { URL.revokeObjectURL(srcUrl); resolve(blob) }
    img.src = srcUrl
  })
}

function makeResult(blob, originalFile) {
  const url = URL.createObjectURL(blob)
  const ext = originalFile.name.split('.').pop()
  const base = originalFile.name.replace(new RegExp(`\\.${ext}$`, 'i'), '')
  const finalExt = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/png' ? 'png' : ext
  return {
    url,
    filename: `${base}-cleaned.${finalExt}`,
    size: blob.size,
    originalSize: originalFile.size,
    compressionRatio: (((originalFile.size - blob.size) / originalFile.size) * 100).toFixed(1),
  }
}
