'use client'


import React, { useEffect } from 'react';
import { Mail, MessageSquareCode, Handshake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
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
      icon: Mail,
      title: 'General',
      details: <a href="mailto:contact@uuais.com">contact@uuais.com</a>,
      description: 'For general inquiries.'
    },
    {
      icon: Handshake,
      title: 'Partnership',
      details: <a href="mailto:william.eklund@uuais.com">william.eklund@uuais.com</a>,
      description: 'For partnerships, sponsorships, or collaborations.'
    },
    {
      icon: MessageSquareCode,
      title: 'Development',
      details: <a href="mailto:alexander.andersson@uuais.com">alexander.andersson@uuais.com</a>,
      description: 'For inquiries related to our projects or website.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Contact Us
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Have questions about UU AI Society? Want to collaborate or partner with us?
            We&apos;d love to hear from you!
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Get in Touch
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  Whether you&apos;re a student interested in AI, a company looking to collaborate,
                  or just curious about what we do, we&apos;re here to help.
                </p>
              </div>

              {contactInfo.map((info, index) => (
                <Card key={index} className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <info.icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {info.title}
                      </h3>
                      <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">
                        {info.details}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {info.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 dark:text-white">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {state.faqs.sort((a, b) => a.order - b.order).filter(faq => faq.published).map((faq) => (
                <Card key={faq.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {convertEmailsToLinks(faq.answer)}
                    </p>
                  </CardContent>
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