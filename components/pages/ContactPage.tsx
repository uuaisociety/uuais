'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
import { Mail } from 'lucide-react';
// import { Button } from '@/components/ui/Button';
// import { Input } from '@/components/ui/Input';
// import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent } from '@/components/ui/Card';
import { updatePageMeta } from '@/utils/seo';
// import type { ContactFormData } from '@/types';

// const contactSchema = z.object({
//   name: z.string().min(2, 'Name must be at least 2 characters'),
//   email: z.string().email('Please enter a valid email address'),
//   subject: z.string().min(5, 'Subject must be at least 5 characters'),
//   message: z.string().min(20, 'Message must be at least 20 characters')
// });

const ContactPage: React.FC = () => {
  // const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    updatePageMeta('Contact Us', 'Get in touch with UU AI Society for questions, partnerships, or general inquiries');
  }, []);

  // const {
  //   register,
  //   handleSubmit,
  //   formState: { errors },
  //   reset
  // } = useForm<ContactFormData>({
  //   resolver: zodResolver(contactSchema)
  // });

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      details: 'contact@uuais.com',
      description: 'Send us an email anytime'
    },
    // {
    //   icon: Phone,
    //   title: 'Phone',
    //   details: '+1 (555) 123-4567',
    //   description: 'Monday - Friday, 9AM - 5PM'
    // },
    // {
    //   icon: MapPin,
    //   title: 'Location',
    //   details: 'Computer Science Building, Room 201',
    //   description: 'University Campus, City, State 12345'
    // },
    // {
    //   icon: Clock,
    //   title: 'Office Hours',
    //   details: 'Mon-Fri: 2PM - 6PM',
    //   description: 'Drop by for in-person meetings'
    // }
  ];

  // const onSubmit = async (data: ContactFormData) => {
  //   try {
  //     // Simulate API call
  //     await new Promise(resolve => setTimeout(resolve, 2000));
      
  //     console.log('Contact form submitted:', data);
  //     setIsSubmitted(true);
  //     reset();
      
  //     // Reset success message after 5 seconds
  //     setTimeout(() => setIsSubmitted(false), 5000);
  //   } catch (error) {
  //     console.error('Submission error:', error);
  //   }
  // };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 pb-8 transition-colors duration-300">
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

          {/* Contact Form */}
          <div className="lg:col-span-2">
            {/* <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Send us a Message
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Fill out the form below and we&apos;ll get back to you as soon as possible.
                </p>
              </CardHeader>
              <CardContent>
                {isSubmitted && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="text-green-800 dark:text-green-300">
                      Thank you for your message! We&apos;ll get back to you within 24 hours.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Name *"
                      {...register('name')}
                      error={errors.name?.message}
                      fullWidth
                    />
                    <Input
                      label="Email *"
                      type="email"
                      {...register('email')}
                      error={errors.email?.message}
                      fullWidth
                    />
                  </div>

                  <Input
                    label="Subject *"
                    {...register('subject')}
                    error={errors.subject?.message}
                    fullWidth
                  />

                  <Textarea
                    label="Message *"
                    rows={6}
                    placeholder="Tell us about your inquiry, collaboration idea, or any questions you have..."
                    {...register('message')}
                    error={errors.message?.message}
                    fullWidth
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      // icon={Send}
                      // loading={isSubmitting}
                      className="min-w-32"
                    >
                      Send Message
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card> */}

            {/* FAQ Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 dark:text-white">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 pt-4">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      How can I join UU AI Society?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Currently we are not accepting new applications. 
                      We will announce the next application period on our social media channels. 
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 pt-4">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Are your events free for students?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      In general all our workshops, seminars, and networking events are free for 
                      students, although some special events may have limited capacity and or require a small fee.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 pt-4">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Can companies sponsor or collaborate with UU AI Society?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Absolutely! We&apos;re always looking for industry partnerships. 
                      Contact us at <a href="mailto:contact@uuais.com" className="text-blue-700">contact@uuais.com</a> to discuss sponsorship opportunities and collaboration ideas.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;