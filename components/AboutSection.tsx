'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n/client';

const AboutSection = () => {
  const { t } = useTranslation();
  
  return (
    <section id="about" className="py-16 bg-[#1a1a1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-8">{t('about.title')}</h2>
          <p className="text-base text-white/80 max-w-3xl mx-auto whitespace-pre-line">
            {t('about.description')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection; 