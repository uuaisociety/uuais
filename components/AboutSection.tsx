import React from 'react';

const AboutSection = () => {
  return (
    <section id="about" className="py-16 bg-[#1a1a1a]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-8">About Us</h2>
          <p className="text-base text-white/80 max-w-3xl mx-auto">
          Founded by four students - Axel, Alex, Nils and Victor - <br></br><br></br>UUAIS was born from a shared vision 
          to empower ambitious students to shape the future of AI technology 
          from the very start of their academic journey. We believe that students, 
          regardless of their background or field of study, have immense creative potential 
          to drive innovation forward. Through collaborations with industry partners, researchers,
           and fellow student organizations, we strive to maximize our impact and explore the
            fascinating frontiers of AI. Our mission is to deliver carefully curated
             networking events, educational lectures, hands-on workshops, engaging hackathons,
              and student-led research projects - all designed to nurture the next generation 
              of AI innovators.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection; 