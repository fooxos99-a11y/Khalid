import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { GoalsSection } from "@/components/goals-section"
import { AboutSection } from "@/components/about-section"
import { VisionSection } from "@/components/vision-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir="rtl">
      <Header />
      <main>
        <HeroSection />
        <div className="bg-white min-h-screen">
          <GoalsSection />
          <AboutSection />
          <VisionSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
