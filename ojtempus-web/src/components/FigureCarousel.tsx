import { useEffect, useMemo, useState } from 'react'
import { ChromaKeyImage } from './ChromaKeyImage'

export function FigureCarousel({
  images,
  intervalMs = 5000,
  className,
  backgroundHex = '#F9F6C4',
  tolerance = 45,
}: {
  images: { src: string; alt: string }[]
  intervalMs?: number
  className?: string
  backgroundHex?: string
  tolerance?: number
}) {
  const safeImages = useMemo(() => (images.length ? images : []), [images])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (safeImages.length <= 1) return

    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % safeImages.length)
    }, intervalMs)

    return () => {
      window.clearInterval(id)
    }
  }, [safeImages.length, intervalMs])

  if (!safeImages.length) return null

  return (
    <div className="w-full">
      <div className="relative w-full flex items-center justify-center">
        {safeImages.map((img, idx) => (
          <div
            key={img.src}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out ${
              idx === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={idx !== activeIndex}
          >
            <ChromaKeyImage
              src={img.src}
              alt={img.alt}
              className={className}
              backgroundHex={backgroundHex}
              tolerance={tolerance}
            />
          </div>
        ))}

        <div className="invisible">
          <ChromaKeyImage
            src={safeImages[0].src}
            alt={safeImages[0].alt}
            className={className}
            backgroundHex={backgroundHex}
            tolerance={tolerance}
          />
        </div>
      </div>

      {safeImages.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {safeImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to image ${idx + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                idx === activeIndex ? 'bg-[#44ACFF]' : 'bg-[#89D4FF]/40 hover:bg-[#89D4FF]/70'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
