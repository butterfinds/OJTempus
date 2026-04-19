import { useEffect, useMemo, useRef, useState } from 'react'

type RGB = { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '').trim()
  const v = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized

  const num = Number.parseInt(v, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function ChromaKeyImage({
  src,
  alt,
  className,
  backgroundHex = '#F9F6C4',
  tolerance = 45,
}: {
  src: string
  alt: string
  className?: string
  backgroundHex?: string
  tolerance?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const bg = useMemo(() => hexToRgb(backgroundHex), [backgroundHex])

  useEffect(() => {
    let cancelled = false

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src

    img.onload = () => {
      if (cancelled) return

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i]
        const g = d[i + 1]
        const b = d[i + 2]

        const dr = r - bg.r
        const dg = g - bg.g
        const db = b - bg.b
        const dist = Math.sqrt(dr * dr + dg * dg + db * db)

        if (dist <= tolerance) {
          d[i + 3] = 0
        }
      }

      ctx.putImageData(imageData, 0, 0)
      const url = canvas.toDataURL('image/png')
      setDataUrl(url)
    }

    img.onerror = () => {
      if (cancelled) return
      setDataUrl(null)
    }

    return () => {
      cancelled = true
    }
  }, [src, bg.r, bg.g, bg.b, tolerance])

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <img src={dataUrl ?? src} alt={alt} className={className} />
    </>
  )
}
