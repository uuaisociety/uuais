'use client'

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Mail, Globe } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkedinIcon, GithubIcon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Image from 'next/image';
import { TeamMember, TEAM_CATEGORIES, TEAM_CATEGORY_LABELS, TeamCategory } from '@/types';
import { Button } from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';

interface TeamTabsSectionProps {
  members: TeamMember[];
}

const CURRENT_YEAR = new Date().getFullYear();

const TeamTabsSection: React.FC<TeamTabsSectionProps> = ({ members }) => {
  const published = useMemo(() => members.filter(m => m.published !== false), [members]);

  const years = useMemo(() => {
    const yrSet = new Set<number>();
    published.forEach(m => {
      if (m.years && m.years.length > 0) m.years.forEach(y => yrSet.add(y));
    });
    return Array.from(yrSet).sort((a, b) => b - a);
  }, [published]);

  const [selectedYear, setSelectedYear] = useState<number | 'all' | null>(null);

  const effectiveYear = useMemo(() => {
    if (selectedYear !== null) return selectedYear;
    if (years.length === 0) return 'all';
    if (years.includes(CURRENT_YEAR)) return CURRENT_YEAR;
    if (years.includes(CURRENT_YEAR - 1)) return CURRENT_YEAR - 1;
    return years[0] ?? 'all';
  }, [selectedYear, years]);

  const [activeTab, setActiveTab] = useState<TeamCategory>('board');
  const tabsRef = useRef<HTMLDivElement>(null);

  const isLead = useCallback((member: TeamMember) => {
    const pos = member.position.toLowerCase();
    return pos.startsWith('head of') || pos.startsWith('chairman') || pos.startsWith('director') || pos.startsWith('lead');
  }, []);

  const placeholderImage = '/images/logo-highdef.png';

  const getFilteredMembers = useCallback((team: TeamCategory) => {
    return published.filter(m => {
      const teamMatch = m.teams && m.teams.length > 0
        ? m.teams.includes(team)
        : team === 'board';
      if (!teamMatch) return false;
      if (effectiveYear === 'all') return true;
      return !m.years || m.years.length === 0 || m.years.includes(effectiveYear);
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [published, effectiveYear]);

  const scrollTabIntoView = useCallback((tab: string) => {
    if (!tabsRef.current) return;
    const btn = tabsRef.current.querySelector(`[data-tab="${tab}"]`) as HTMLElement;
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, []);

  const handleTabChange = useCallback((tab: TeamCategory) => {
    setActiveTab(tab);
    scrollTabIntoView(tab);
  }, [scrollTabIntoView]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TEAM_CATEGORIES.forEach(cat => {
      counts[cat] = getFilteredMembers(cat).length;
    });
    return counts;
  }, [getFilteredMembers]);

  const activeMembers = useMemo(() => getFilteredMembers(activeTab), [getFilteredMembers, activeTab]);

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
        Meet Our Team
      </h2>

      {/* Year selector */}
      {years.length > 0 && (
        <div className="flex justify-center mb-6">
          <StyledSelect
            value={effectiveYear === 'all' ? 'all' : String(effectiveYear)}
            onChange={(v) => setSelectedYear(v === 'all' ? 'all' : parseInt(v))}
            options={[
              ...years.map(y => ({ value: String(y), label: `${y}/${String(y + 1).slice(2)}` })),
              { value: 'all', label: 'All years' },
            ]}
          />
        </div>
      )}

      {/* Pill-style tabs */}
      <div className="flex justify-center mb-8">
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto p-2 max-w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TEAM_CATEGORIES.map(cat => {
            const count = tabCounts[cat];
            if (count === 0) return null;
            return (
              <Button
                key={cat}
                data-tab={cat}
                onClick={() => handleTabChange(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer shrink-0 ${
                  activeTab === cat
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
                }`}
              >
                {TEAM_CATEGORY_LABELS[cat]}
                <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                  activeTab === cat
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Team member grid */}
      {activeMembers.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 py-4">
          {activeMembers.map((member) => (
            <Card key={member.id} className="text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-visible">
              <CardHeader>
                <div className="mx-auto mb-4 relative">
                  {isLead(member) && (
                    <div className="absolute -top-1 -right-1 z-10">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                        Lead
                      </span>
                    </div>
                  )}
                  <Image
                    src={member.image || placeholderImage}
                    alt={member.name}
                    width={100}
                    height={100}
                    className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-red-100 dark:border-red-800"
                  />
                </div>
                {member.badge && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 mb-2">
                    {member.badge}
                  </span>
                )}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-red-600 dark:text-red-400 font-medium mb-3">
                  {member.position}
                </p>
              </CardHeader>
              <CardContent>
                {member.bio && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
                    {member.bio}
                  </p>
                )}
                <div className="flex justify-center space-x-3">
                  {member.companyEmail && (
                    <a
                      href={`mailto:${member.companyEmail}`}
                      className="p-2 text-gray-400 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      aria-label={`Email ${member.name}`}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  {!member.personalEmail && !member.companyEmail && member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      aria-label={`Email ${member.name}`}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      aria-label={`LinkedIn profile of ${member.name}`}
                    >
                      <HugeiconsIcon icon={LinkedinIcon} className="h-4 w-4" />
                    </a>
                  )}
                  {member.github && (
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      aria-label={`GitHub profile of ${member.name}`}
                    >
                      <HugeiconsIcon icon={GithubIcon} className="h-4 w-4" />
                    </a>
                  )}
                  {member.website && (
                    <a
                      href={member.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      aria-label={`Website of ${member.name}`}
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">
          No team members in this category for the selected year.
        </p>
      )}
    </div>
  );
};

export default TeamTabsSection;