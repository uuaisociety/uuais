
'use client'

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { X, User, Mail, GraduationCap, MessageSquare } from 'lucide-react';
import { Event, EventCustomQuestion } from '@/types';
import { registerForEvent, subscribeToEventCustomQuestions } from '@/lib/firestore';

interface EventRegistrationDialogProps {
  event: Event;
}

interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  university: string;
  studentId: string;
  year: string;
  major: string;
  dietaryRestrictions: string;
  additionalInfo: string;
}

const EventRegistrationDialog: React.FC<EventRegistrationDialogProps> = ({ event }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<EventCustomQuestion[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    university: '',
    studentId: '',
    year: '',
    major: '',
    dietaryRestrictions: '',
    additionalInfo: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Subscribe to event-specific custom questions
  useEffect(() => {
    const unsub = subscribeToEventCustomQuestions(event.id, (qs) => {
      setCustomQuestions(qs);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [event.id]);

  const handleCustomAnswerChange = (
    q: EventCustomQuestion,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (q.type === 'checkbox') {
      // For checkbox group, maintain array
      const option = target.value;
      const checked = (target as HTMLInputElement).checked;
      setCustomAnswers(prev => {
        const current = (prev[q.id] as string[] | undefined) || [];
        const next = checked ? Array.from(new Set([...current, option])) : current.filter(o => o !== option);
        return { ...prev, [q.id]: next };
      });
    } else {
      setCustomAnswers(prev => ({ ...prev, [q.id]: target.value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required custom questions
      for (const q of customQuestions) {
        if (!q.required) continue;
        const ans = customAnswers[q.id];
        const missing =
          ans === undefined ||
          ans === '' ||
          (Array.isArray(ans) && ans.length === 0);
        if (missing) {
          alert(`Please answer: ${q.question}`);
          setIsSubmitting(false);
          return;
        }
      }

      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        university: formData.university,
        studentId: formData.studentId,
        year: formData.year,
        major: formData.major,
        dietaryRestrictions: formData.dietaryRestrictions,
        additionalInfo: formData.additionalInfo,
        // Map custom answers by question text for readability
        ...customQuestions.reduce((acc, q) => {
          const value = customAnswers[q.id];
          if (value !== undefined) {
            acc[q.question] = value as string | string[];
          }
          return acc;
        }, {} as Record<string, string | string[]>)
      } as const;

      await registerForEvent(
        event.id,
        {
          registrationData,
          userEmail: formData.email,
          userName: `${formData.firstName} ${formData.lastName}`.trim(),
        },
        { waitlist: isWaitlistOnly }
      );
      
      // Reset form and close dialog
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        university: '',
        studentId: '',
        year: '',
        major: '',
        dietaryRestrictions: '',
        additionalInfo: ''
      });
      setIsOpen(false);
      
      // Show success message (you might want to use a toast notification)
      alert(isWaitlistOnly
        ? 'You have been added to the waitlist. We will contact you if a spot opens.'
        : 'Registration successful!');
    } catch (error) {
      console.error('Registration failed:', error);
      alert(`Registration failed ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCapacityFull = typeof event.maxCapacity === 'number' && (event.currentRegistrations || 0) >= event.maxCapacity;
  const isAfterLastRegistration = typeof event.lastRegistrationAt === 'string' && event.lastRegistrationAt
    ? new Date().getTime() > new Date(event.lastRegistrationAt).getTime()
    : false;
  const isWaitlistOnly = isCapacityFull || isAfterLastRegistration;

  return (
    <>
      <Button 
        className={`${isWaitlistOnly ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        onClick={() => setIsOpen(true)}
      >
        {isWaitlistOnly ? 'Join Waitlist' : 'Register Now'}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <Card className="border-0 shadow-none dark:bg-gray-800">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isCapacityFull ? 'Join Waitlist' : 'Register for Event'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">{event.title}</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Mail className="h-5 w-5 mr-2" />
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="your.email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="+31 6 12345678"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <GraduationCap className="h-5 w-5 mr-2" />
                      Academic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          University *
                        </label>
                        <input
                          type="text"
                          name="university"
                          value={formData.university}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Utrecht University"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Student ID
                        </label>
                        <input
                          type="text"
                          name="studentId"
                          value={formData.studentId}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="1234567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Study Year *
                        </label>
                        <select
                          name="year"
                          value={formData.year}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select your year</option>
                          <option value="1">1st Year Bachelor</option>
                          <option value="2">2nd Year Bachelor</option>
                          <option value="3">3rd Year Bachelor</option>
                          <option value="master1">1st Year Master</option>
                          <option value="master2">2nd Year Master</option>
                          <option value="phd">PhD</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Major/Field of Study *
                        </label>
                        <input
                          type="text"
                          name="major"
                          value={formData.major}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Computer Science, AI, etc."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Additional Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Dietary Restrictions/Allergies
                        </label>
                        <input
                          type="text"
                          name="dietaryRestrictions"
                          value={formData.dietaryRestrictions}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Vegetarian, Vegan, Allergies, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Additional Comments
                        </label>
                        <textarea
                          name="additionalInfo"
                          value={formData.additionalInfo}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Any questions or special requirements?"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Event-specific Custom Questions */}
                  {customQuestions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Questions</h3>
                      <div className="space-y-4">
                        {customQuestions.map((q) => (
                          <div key={q.id}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {q.question} {q.required && <span className="text-red-500">*</span>}
                            </label>
                            {q.type === 'text' && (
                              <input
                                type="text"
                                value={(customAnswers[q.id] as string) || ''}
                                onChange={(e) => handleCustomAnswerChange(q, e)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              />
                            )}
                            {q.type === 'textarea' && (
                              <textarea
                                value={(customAnswers[q.id] as string) || ''}
                                onChange={(e) => handleCustomAnswerChange(q, e)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              />
                            )}
                            {q.type === 'select' && (
                              <select
                                value={(customAnswers[q.id] as string) || ''}
                                onChange={(e) => handleCustomAnswerChange(q, e)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Select an option</option>
                                {(q.options || []).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}
                            {q.type === 'radio' && (
                              <div className="space-y-2">
                                {(q.options || []).map(opt => (
                                  <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <input
                                      type="radio"
                                      name={`cq_${q.id}`}
                                      value={opt}
                                      checked={(customAnswers[q.id] as string) === opt}
                                      onChange={(e) => handleCustomAnswerChange(q, e)}
                                    />
                                    {opt}
                                  </label>
                                ))}
                              </div>
                            )}
                            {q.type === 'checkbox' && (
                              <div className="space-y-1">
                                {(q.options || []).map(opt => {
                                  const arr = (customAnswers[q.id] as string[] | undefined) || [];
                                  const checked = arr.includes(opt);
                                  return (
                                    <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                      <input
                                        type="checkbox"
                                        value={opt}
                                        checked={checked}
                                        onChange={(e) => handleCustomAnswerChange(q, e)}
                                      />
                                      {opt}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSubmitting ? 'Submitting...' : (isWaitlistOnly ? 'Join Waitlist' : 'Register')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};

export default EventRegistrationDialog;
