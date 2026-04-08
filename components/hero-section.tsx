"use client"

import { useEffect, useState } from "react"

const BRAND_LOGO_SRC = "/4321-transparent.png"
const BRAND_LOGO_MASK_URL = 'url("/4321-transparent.png")'

export function HeroSection() {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 767px) and (orientation: portrait)")
    const updateOrientationState = () => setIsPortraitMobile(mediaQuery.matches)

    updateOrientationState()
    mediaQuery.addEventListener("change", updateOrientationState)

    return () => {
      mediaQuery.removeEventListener("change", updateOrientationState)
    }
  }, [])

  return (
    <section className="relative overflow-hidden bg-white px-4 pb-10 pt-0 sm:px-6 sm:pb-14 sm:pt-0 lg:pb-20 lg:pt-0">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#3453a7]/45 to-transparent" />

      <div className="container relative mx-auto">
        <div className={`mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col items-center justify-start gap-4 ${isPortraitMobile ? "pt-14" : "pt-12 sm:pt-14 lg:gap-6 lg:pt-16"}`}>
          <div className="flex flex-col items-center text-center">
            <div className={`relative ${isPortraitMobile ? "-mt-1 mb-0" : "-mt-2 -mb-2 sm:-mt-3 sm:-mb-3"}`}>
              <div className="absolute inset-x-[14%] bottom-[8%] h-14 rounded-full bg-[radial-gradient(circle,rgba(143,176,255,0.24)_0%,rgba(143,176,255,0)_72%)] blur-2xl" />
              <div
                role="img"
                aria-label="مجمع الملك خالد لتحفيظ القرآن الكريم"
                className={`relative drop-shadow-[0_18px_36px_rgba(52,83,167,0.22)] ${isPortraitMobile ? "h-[220px] w-[220px]" : "h-[170px] w-[170px] sm:h-[210px] sm:w-[210px] md:h-[250px] md:w-[250px] lg:h-[300px] lg:w-[300px]"}`}
                style={{
                  background: "linear-gradient(145deg,#20335f 0%,#3453a7 56%,#8fb0ff 100%)",
                  WebkitMaskImage: BRAND_LOGO_MASK_URL,
                  maskImage: BRAND_LOGO_MASK_URL,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
            </div>

            <h1 className={`${isPortraitMobile ? "-mt-1" : "-mt-2 sm:-mt-3 lg:-mt-4"} max-w-4xl pb-2 bg-[linear-gradient(135deg,#20335f_0%,#3453a7_58%,#7d9ff5_100%)] bg-clip-text text-balance text-4xl font-black leading-[1.24] tracking-tight text-transparent sm:text-5xl lg:text-6xl`}>
              <span className="block">مجمع الملك خالد</span>
            </h1>

            <div className="mt-3 h-1.5 w-28 rounded-full bg-[linear-gradient(90deg,#3453a7_0%,#8fb0ff_50%,#3453a7_100%)] shadow-[0_8px_22px_rgba(52,83,167,0.18)]" />

            <p className="mt-2 max-w-3xl text-base leading-8 text-[#4b5563] sm:mt-3 sm:text-lg">
              مجمع الملك خالد لتحفيظ القران الكريم يسعى لتقديم بيئة تربوية متميزة تجمع بين الأصالة والمعاصرة.
              نهدف إلى تخريج جيل قرآني متقن لكتاب الله، ملتزم بتعاليمه، قادر على خدمة دينه ومجتمعه. مع التركيز على
              الجودة والإتقان والمتابعة المستمرة لكل طالب.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
