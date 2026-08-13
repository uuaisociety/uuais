'use client'


import React, { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { updatePageMeta } from '@/utils/seo';
import { useApp } from '@/contexts/AppContext';

// Utility function to convert email addresses in text to mailto links
const convertEmailsToLinks = (text: string): React.ReactNode => {
  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  const parts = text.split(emailRegex);
  const matches = text.match(emailRegex);

  return parts.map((part, index) => {

    if (index < parts.length - 1 && matches && matches.includes(part)) {
      return (
        <React.Fragment key={index}>
          <a href={`mailto:${part}`}>
            {part}
          </a>
        </React.Fragment>
      );
    }
    return part;
  });
};

const ContactPage: React.FC = () => {
  const { state } = useApp();

  useEffect(() => {
    updatePageMeta('Contact Us', 'Get in touch with UU AI Society for questions, partnerships, or general inquiries');
  }, []);

  const contactInfo = [
    {
      title: 'General',
      email: 'contact@uuais.com',
      description: 'For general inquiries.'
    },
    {
      title: 'Website',
      email: 'it@uuais.com',
      description: 'For questions about the website.'
    },
    {
      title: 'Partnership',
      email: 'partnerships@uuais.com',
      description: 'For partnerships, sponsorships, or collaborations.'
    },
    {
      title: 'Development',
      email: 'dev@uuais.com',
      description: 'For inquiries related to our projects.'
    },
    {
      title: 'Research',
      email: 'research@uuais.com',
      description: 'For research collaborations.'
    }
  ];

  const faqs = state.faqs.sort((a, b) => a.order - b.order).filter(faq => faq.published);

  return (
    <div className="min-h-screen bg-background pt-24 pb-24 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="mb-14">
          <p className="mono-label text-muted-foreground mb-4">UU AI Society · Get in touch</p>
          <h1 className="display-lg text-foreground mb-5">
            Contact Us
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Have questions about UU AI Society? Want to collaborate or partner with us?
            We&apos;d love to hear from you!
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              Get in Touch
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Whether you&apos;re a student interested in AI, a company looking to collaborate,
              or just curious about what we do, we&apos;re here to help.
            </p>
            <div className="space-y-5">
              {contactInfo.map((info, index) => (
                <Card key={index} variant="glass" hover className="p-6">
                  <p className="mono-label text-muted-foreground mb-2">{info.title}</p>
                  <p className="text-foreground font-medium mb-2">
                    <a href={`mailto:${info.email}`} className="transition-colors duration-300 hover:text-primary">
                      {info.email}
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {info.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <Card key={faq.id} variant="glass" className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {convertEmailsToLinks(faq.answer)}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
