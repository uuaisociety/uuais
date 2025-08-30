import HeroSection from '@/components/HeroSection';
import FoundersSection from '@/components/FoundersSection';
import EventsSection from '@/components/EventsSection';
import AboutSection from '@/components/AboutSection';

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <EventsSection />
      <FoundersSection />
      <AboutSection />
    </div>
  );
}
