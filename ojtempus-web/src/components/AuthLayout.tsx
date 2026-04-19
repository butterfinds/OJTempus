import type { ReactNode } from 'react'
import figureImg from '../assets/login-figure.jpg'
import figureImg2 from '../assets/login-Figure2.jpg'
import figureImg3 from '../assets/login-firgure3.jpg'
import { FigureCarousel } from './FigureCarousel'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex font-sans bg-white">
      <div className="w-full lg:w-[40%] xl:w-[38%] flex items-center justify-center p-8 sm:p-12 md:p-16 lg:p-20 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="hidden lg:flex lg:w-[60%] xl:w-[62%] relative bg-[#F9F6C4] flex-col items-center justify-center p-12">
        <div className="text-center flex flex-col items-center w-full max-w-lg">
          <div className="flex items-center justify-center w-full mb-6">
            <FigureCarousel
              images={[
                { src: figureImg, alt: 'Professionals interacting' },
                { src: figureImg2, alt: 'Professionals interacting' },
                { src: figureImg3, alt: 'Professionals interacting' },
              ]}
              intervalMs={5000}
              className="w-[98%] max-w-2xl h-auto object-contain"
              backgroundHex="#F9F6C4"
              tolerance={45}
            />
          </div>

          <div className="pt-0">
            <h1 className="text-7xl font-black text-[#44ACFF] tracking-tighter drop-shadow-sm mb-4">OJTempus</h1>
            <p className="text-[#89D4FF] font-bold tracking-widest uppercase text-sm">YOUNG PROFESSIONALS IN THE MAKING</p>
          </div>
        </div>
      </div>
    </div>
  )
}
