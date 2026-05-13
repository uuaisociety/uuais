"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Edit3, Eye, EyeOff, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { TeamMember, TEAM_CATEGORY_LABELS } from "@/types";
import TeamModal, { TeamFormState } from '@/components/pages/admin/modals/TeamModal';
import { useApp } from '@/contexts/AppContext';

export interface TeamTabProps {
  members: TeamMember[];
}

const TeamTab: React.FC<TeamTabProps> = ({ members }) => {
  const { dispatch } = useApp();
  const placeholderImage = '/images/logo-highdef.png';

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TeamMember | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  const allYears = [...new Set(members.flatMap(m => m.years ?? []))].sort((a, b) => b - a);

  const [teamForm, setTeamForm] = useState<TeamFormState>({
    id: undefined,
    name: '',
    position: '',
    bio: '',
    image: '',
    imagePath: undefined,
    linkedin: '',
    github: '',
    personalEmail: '',
    companyEmail: '',
    website: '',
    teams: [],
    badge: '',
    notes: '',
    years: [],
  });

  const resetForms = () => {
    setTeamForm({
      id: undefined,
      name: '',
      position: '',
      bio: '',
      image: '',
      imagePath: undefined,
      linkedin: '',
      github: '',
      personalEmail: '',
      companyEmail: '',
      website: '',
      teams: [],
      badge: '',
      notes: '',
      years: [],
    });
    setEditingItem(null);
  };

  const handleAddClick = () => {
    resetForms();
    setShowTeamModal(true);
  };

  const handleEdit = (member: TeamMember) => {
    setEditingItem(member);
    const ip = (member as unknown as { imagePath?: string }).imagePath;
    setTeamForm({
      id: member.id,
      name: member.name,
      position: member.position,
      bio: member.bio || '',
      image: member.image || placeholderImage,
      imagePath: ip,
      linkedin: member.linkedin || '',
      github: member.github || '',
      personalEmail: member.personalEmail || member.email || '',
      companyEmail: member.companyEmail || '',
      website: member.website || '',
      teams: member.teams || [],
      badge: member.badge || '',
      notes: member.notes || '',
      years: member.years || [],
    });
    setShowTeamModal(true);
  };

const handleAddTeamMember = () => {
    const newMember = {
      ...teamForm,
      image: teamForm.image || placeholderImage,
      imagePath: teamForm.imagePath,
      teams: teamForm.teams.length > 0 ? teamForm.teams : undefined,
      years: teamForm.years,
      bio: teamForm.bio || undefined,
      badge: teamForm.badge || undefined,
      notes: teamForm.notes || undefined,
    } as TeamMember;
    dispatch({ firestoreAction: 'ADD_TEAM_MEMBER', payload: newMember });
    setShowTeamModal(false);
    resetForms();
  };

  const handleUpdateTeamMember = () => {
    if (editingItem) {
const updatedMember = {
        ...editingItem,
        ...teamForm,
        teams: teamForm.teams.length > 0 ? teamForm.teams : undefined,
        years: teamForm.years,
        bio: teamForm.bio || undefined,
        badge: teamForm.badge || undefined,
        notes: teamForm.notes || undefined,
      } as TeamMember;
      dispatch({ firestoreAction: 'UPDATE_TEAM_MEMBER', payload: updatedMember });
      setShowTeamModal(false);
      resetForms();
    }
  };

  const handleDeleteTeamMember = (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      dispatch({ firestoreAction: 'DELETE_TEAM_MEMBER', payload: memberId });
    }
  };

  const handleTogglePublish = (member: TeamMember) => {
    const patched = { ...member, published: !member.published } as TeamMember;
    dispatch({ firestoreAction: 'UPDATE_TEAM_MEMBER', payload: patched });
  };

  const handleMove = (memberId: string, direction: 'up' | 'down') => {
    dispatch({ firestoreAction: 'MOVE_TEAM_MEMBER', payload: { memberId, direction } });
  };

  const sortedMembers = [...members].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const filteredMembers = activeYear
    ? sortedMembers.filter(m => m.years?.includes(activeYear))
    : sortedMembers;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
        <Button icon={Plus} onClick={handleAddClick}>Add Team Member</Button>
      </div>

      {allYears.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveYear(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeYear === null
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All ({sortedMembers.length})
          </button>
          {allYears.map(year => (
            <button
              key={year}
              onClick={() => setActiveYear(year)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeYear === year
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {year} ({sortedMembers.filter(m => m.years?.includes(year)).length})
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {filteredMembers.map((member, index) => (
          <Card key={member.id} className="bg-gray-50 dark:bg-gray-800 text-black dark:text-white">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Image
                  src={member.image || placeholderImage}
                  alt={member.name}
                  width={100}
                  height={100}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                    {member.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {member.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-red-600 font-medium mb-1">{member.position}</p>
                  {member.teams && member.teams.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Teams: {member.teams.map(t => TEAM_CATEGORY_LABELS[t as keyof typeof TEAM_CATEGORY_LABELS] || t).join(', ')}
                      {member.years && member.years.length > 0 && ` · ${member.years.join(', ')}`}
                    </p>
                  )}
                  {member.bio && (
                    <p className="text-gray-600 text-sm line-clamp-2 dark:text-gray-400">{member.bio}</p>
                  )}
                  {member.notes && (
                    <p className="text-xs text-gray-400 italic mt-1 truncate">Note: {member.notes}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={ArrowUp}
                        onClick={() => handleMove(member.id, 'up')}
                        disabled={index === 0}
                        aria-label="Move up"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        icon={ArrowDown}
                        onClick={() => handleMove(member.id, 'down')}
                        disabled={index === sortedMembers.length - 1}
                        aria-label="Move down"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={member.published ? EyeOff : Eye}
                      onClick={() => handleTogglePublish(member)}
                    >
                      {member.published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button size="sm" variant="outline" icon={Edit3} onClick={() => handleEdit(member)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      icon={Trash2}
                      onClick={() => handleDeleteTeamMember(member.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TeamModal
        open={showTeamModal}
        editing={!!editingItem}
        form={teamForm}
        setForm={setTeamForm}
        onClose={() => { setShowTeamModal(false); resetForms(); }}
        onSubmit={() => {
          if (editingItem) handleUpdateTeamMember(); else handleAddTeamMember();
        }}
      />
    </div>
  );
};

export default TeamTab;