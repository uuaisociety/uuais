'use client'

import React from 'react';
import { Shield, Eye, Database, UserCheck, Mail, Calendar } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen py-12 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Last updated: September 19, 2025
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <UserCheck className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
              Introduction
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              UU AI Society (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy and ensuring compliance with the General Data Protection Regulation (GDPR) and other applicable privacy laws. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or participate in our activities.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Database className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
              Information We Collect
            </h2>
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                  <li>Name and contact information (email address)</li>
                  <li>University affiliation and student status</li>
                  <li>Professional interests and AI-related experience</li>
                  <li>Event attendance and participation data</li>
                  <li>Submitted applications for events and membership</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Technical Information</h3>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                  <li>IP address and browser information</li>
                  <li>Website usage patterns and preferences</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Eye className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
              How We Use Your Information
            </h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">We use your information for the following purposes:</p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                <li>To communicate about events, workshops, and society activities</li>
                <li>To manage membership and event registrations</li>
                <li>To send newsletters and updates about AI developments</li>
                <li>To improve our website and services</li>
                <li>To comply with legal obligations</li>
                <li>To market our services and events to businesses</li>
              </ul>
            </div>
          </section>

          {/* Legal Basis (GDPR) */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Legal Basis for Processing (GDPR)
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Consent</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  For newsletter subscriptions and marketing communications
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Legitimate Interest</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  For society operations and member engagement
                </p>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Rights Under GDPR
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">You have the following rights regarding your personal data:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                  <li><strong>Access:</strong> Request copies of your personal data</li>
                  <li><strong>Rectification:</strong> Correct inaccurate information</li>
                  <li><strong>Erasure:</strong> Request deletion of your data</li>
                  <li><strong>Portability:</strong> Transfer your data to another service</li>
                </ul>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                  <li><strong>Restriction:</strong> Limit how we use your data</li>
                  <li><strong>Objection:</strong> Object to certain processing</li>
                  <li><strong>Withdraw consent:</strong> At any time for consent-based processing</li>
                  <li><strong>Complaint:</strong> Lodge a complaint with supervisory authorities</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
              Data Retention
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We retain your personal information only as long as necessary for the purposes outlined in this policy:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                {/* <li>Membership data: Duration of membership plus 2 years</li> */}
                <li>Newsletter subscriptions: Until you unsubscribe</li>
                <li>Event participation: 3 years for historical records</li>
                <li>Website analytics: 26 months (Google Analytics default)</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Data Security
            </h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <p className="text-gray-700 dark:text-gray-300">
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security assessments.
              </p>
            </div>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Third-Party Services
            </h2>
            <div className="space-y-3">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Analytics</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  We use Google Analytics to understand website usage. You can opt out using Google&apos;s opt-out tools.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Email Services</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  We use secure email services for communications, all compliant with GDPR requirements.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Mail className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
              Contact Us
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
              </p>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p><strong>Email:</strong> <a href="mailto:dev@uuais.com" className="text-blue-600 dark:text-blue-400">dev@uuais.com</a></p>
                <p><strong>General Contact:</strong> <a href="mailto:contact@uuais.com" className="text-blue-600 dark:text-blue-400">contact@uuais.com</a></p>
                <p><strong>Organization Number:</strong> 802551-8930</p>
                <p><strong>Response Time:</strong> We will respond to your request within 30 days as required by GDPR</p>
              </div>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Policy Updates
            </h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <p className="text-gray-700 dark:text-gray-300">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the &quot;Last updated&quot; date. Your continued use of our services after such modifications constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
