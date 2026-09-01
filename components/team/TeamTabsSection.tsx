'use client'

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Mail, Globe } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkedinIcon, GithubIcon } from '@hugeicons/core-free-icons';
import { Card } from '@/components/ui/Card';
import Image from 'next/image';
import { TeamMember, TEAM_CATEGORIES, TEAM_CATEGORY_LABELS, TeamCategory } from '@/types';
import { Button } from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import StyledSelect from '@/components/ui/StyledSelect';

interface TeamTabsSectionProps {
  members: TeamMember[];
}

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
    const CURRENT_YEAR = new Date().getFullYear();
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

  const socialClass =
    'size-9 grid place-items-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.055] transition-colors duration-300';

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
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    btn?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
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

  // A year change can empty the active category, so derive the tab like effectiveYear.
  const effectiveTab = tabCounts[activeTab] > 0
    ? activeTab
    : TEAM_CATEGORIES.find(cat => tabCounts[cat] > 0) ?? activeTab;

  const activeMembers = useMemo(() => getFilteredMembers(effectiveTab), [getFilteredMembers, effectiveTab]);

  return (
    <div>
      {/* Year selector */}
      {years.length > 0 && (
        <div className="flex mb-5">
          <StyledSelect
            label="Filter team by academic year"
            value={effectiveYear === 'all' ? 'all' : String(effectiveYear)}
            onChange={(v) => setSelectedYear(v === 'all' ? 'all' : parseInt(v))}
            options={[
              ...years.map(y => ({ value: String(y), label: `${y}/${String(y + 1).slice(2)}` })),
              { value: 'all', label: 'All years' },
            ]}
          />
        </div>
      )}

      {/* Team tabs */}
      <div className="mb-10">
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto p-1 max-w-full [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          role="group"
          aria-label="Team filters"
        >
          {TEAM_CATEGORIES.map(cat => {
            const count = tabCounts[cat];
            if (count === 0) return null;
            return (
              <Button
                key={cat}
                data-tab={cat}
                variant={effectiveTab === cat ? 'secondary' : 'outline'}
                onClick={() => handleTabChange(cat)}
                aria-pressed={effectiveTab === cat}
                className="shrink-0"
              >
                {TEAM_CATEGORY_LABELS[cat]}
                <span className="mono-meta tabular-nums text-muted-foreground">
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <p role="status" className="sr-only">
        {activeMembers.length} {activeMembers.length === 1 ? 'member' : 'members'} in {TEAM_CATEGORY_LABELS[effectiveTab]}
      </p>

      {/* Team member grid */}
      {activeMembers.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeMembers.map((member) => (
            <Card key={member.id} variant="glass" className="p-6 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <Image
                  src={member.image || placeholderImage}
                  alt=""
                  width={128}
                  height={128}
                  className="w-16 h-16 rounded-full object-cover shrink-0 ring-1 ring-border"
                />
                <div className="min-w-0">
                  <h3 className="text-[1.0625rem] font-semibold tracking-[-0.028em] text-foreground">
                    {member.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {member.position}
                  </p>
                  {(isLead(member) || member.badge) && (
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {isLead(member) && <Tag variant="yellow" size="sm">Lead</Tag>}
                      {member.badge && <Tag variant="red" size="sm">{member.badge}</Tag>}
                    </div>
                  )}
                </div>
              </div>

              {member.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {member.bio}
                </p>
              )}

              <div className="flex gap-1 mt-auto">
                {member.companyEmail && (
                  <a
                    href={`mailto:${member.companyEmail}`}
                    className={socialClass}
                    aria-label={`Email ${member.name}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                {!member.personalEmail && !member.companyEmail && member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className={socialClass}
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
                    className={socialClass}
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
                    className={socialClass}
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
                    className={socialClass}
                    aria-label={`Website of ${member.name}`}
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border-t border-border py-16 text-center">
          <p className="mono-meta text-muted-foreground">
            No team members in this category for the selected year.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamTabsSection;