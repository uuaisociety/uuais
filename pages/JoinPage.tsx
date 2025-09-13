'use client'

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Users, Award, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { updatePageMeta } from '../utils/seo';
import type { JoinFormData } from '../types';

const joinSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  studentId: z.string().min(1, 'Student ID is required'),
  university: z.string().min(1, 'University is required'),
  major: z.string().min(1, 'Major is required'),
  year: z.string().min(1, 'Academic year is required'),
  experience: z.string().min(1, 'Please select your AI experience level'),
  interests: z.array(z.string()).min(1, 'Please select at least one interest'),
  motivation: z.string().min(50, 'Please provide at least 50 characters explaining your motivation'),
  portfolio: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linkedin: z.string().url('Please enter a valid LinkedIn URL').optional().or(z.literal(''))
});

export const JoinPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    updatePageMeta('Join Us', 'Become a member of UU AI Society and join our community of AI enthusiasts');
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema)
  });

  const yearOptions = [
    { value: '', label: 'Select your year' },
    { value: 'freshman', label: 'Freshman' },
    { value: 'sophomore', label: 'Sophomore' },
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' },
    { value: 'graduate', label: 'Graduate Student' },
    { value: 'phd', label: 'PhD Student' }
  ];

  const experienceOptions = [
    { value: '', label: 'Select your experience level' },
    { value: 'beginner', label: 'Beginner - New to AI/ML' },
    { value: 'intermediate', label: 'Intermediate - Some coursework or projects' },
    { value: 'advanced', label: 'Advanced - Significant experience or research' },
    { value: 'expert', label: 'Expert - Professional or extensive research experience' }
  ];

  const interestOptions = [
    'Machine Learning',
    'Deep Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Robotics',
    'AI Ethics',
    'Data Science',
    'Neural Networks',
    'Reinforcement Learning',
    'AI Research',
    'Industry Applications',
    'Startups & Entrepreneurship'
  ];

  const benefits = [
    {
      icon: Users,
      title: 'Networking Opportunities',
      description: 'Connect with like-minded students and industry professionals'
    },
    {
      icon: Brain,
      title: 'Exclusive Workshops',
      description: 'Access to hands-on workshops and technical sessions'
    },
    {
      icon: Award,
      title: 'Leadership Opportunities',
      description: 'Take on leadership roles and organize community events'
    }
  ];

  const handleInterestChange = (interest: string) => {
    const updated = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    
    setSelectedInterests(updated);
    setValue('interests', updated);
  };

  const onSubmit = async (data: JoinFormData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Form submitted:', data);
      setIsSubmitted(true);
      reset();
      setSelectedInterests([]);
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Application Submitted!
              </h2>
              <p className="text-gray-600 mb-6">
                Thank you for your interest in joining UU AI Society. We&apos;ll review your application and get back to you within 3-5 business days.
              </p>
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="default"
              >
                Submit Another Application
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Join UU AI Society
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ready to dive into the world of artificial intelligence? Join our community of passionate students and start your AI journey today.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {benefits.map((benefit, index) => (
            <Card key={index} className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {benefit.title}
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900">
              Membership Application
            </h2>
            <p className="text-gray-600">
              Fill out the form below to apply for membership. All fields marked with * are required.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    {...register('firstName')}
                    error={errors.firstName?.message}
                    fullWidth
                  />
                  <Input
                    label="Last Name *"
                    {...register('lastName')}
                    error={errors.lastName?.message}
                    fullWidth
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Email Address *"
                    type="email"
                    {...register('email')}
                    error={errors.email?.message}
                    fullWidth
                  />
                  <Input
                    label="Student ID *"
                    {...register('studentId')}
                    error={errors.studentId?.message}
                    fullWidth
                  />
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="University *"
                    {...register('university')}
                    error={errors.university?.message}
                    fullWidth
                  />
                  <Input
                    label="Major *"
                    {...register('major')}
                    error={errors.major?.message}
                    fullWidth
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <Select
                    label="Academic Year *"
                    options={yearOptions}
                    {...register('year')}
                    error={errors.year?.message}
                    fullWidth
                  />
                  <Select
                    label="AI Experience Level *"
                    options={experienceOptions}
                    {...register('experience')}
                    error={errors.experience?.message}
                    fullWidth
                  />
                </div>
              </div>

              {/* Interests */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Areas of Interest *
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select all areas that interest you (minimum 1 required):
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {interestOptions.map((interest) => (
                    <label
                      key={interest}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInterests.includes(interest)}
                        onChange={() => handleInterestChange(interest)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">{interest}</span>
                    </label>
                  ))}
                </div>
                {errors.interests && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.interests.message}
                  </p>
                )}
              </div>

              {/* Motivation */}
              <div>
                <Textarea
                  label="Why do you want to join UU AI Society? *"
                  rows={4}
                  placeholder="Tell us about your interest in AI and what you hope to gain from joining our community..."
                  {...register('motivation')}
                  error={errors.motivation?.message}
                  fullWidth
                />
              </div>

              {/* Optional Links */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Optional Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Portfolio/GitHub URL"
                    type="url"
                    placeholder="https://github.com/yourusername"
                    {...register('portfolio')}
                    error={errors.portfolio?.message}
                    fullWidth
                  />
                  <Input
                    label="LinkedIn Profile"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    {...register('linkedin')}
                    error={errors.linkedin?.message}
                    fullWidth
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  // loading={isSubmitting}
                  className="min-w-32"
                >
                  Submit Application
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};