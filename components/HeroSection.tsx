'use client';

import Image from 'next/image';

const HeroSection = () => {

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/campus.png"
          alt="Uppsala University Campus"
          fill
          className="object-cover brightness-45 grayscale blur-[0px]"
          priority
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 relative">
          <span className="relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            UU AI Society
          </span>
          <span className="absolute inset-0 bg-black/30 blur-xl -z-10"></span>
        </h1>
        <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
          We are a participatory society for everyone into AI at Uppsala University
        </p>
      </div>
    </section>
  );
};

export default HeroSection; 