"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { TeamMember } from "@/types";
import TeamModal, { TeamFormState } from '@/components/pages/admin/modals/TeamModal';
import { useApp } from '@/contexts/AppContext';

export interface TeamTabProps {
  members: TeamMember[];
}

const TeamTab: React.FC<TeamTabProps> = ({ members }) => {
  const { dispatch } = useApp();
  const placeholderImage = '/placeholder.png';

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TeamMember | null>(null);

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
    website: ''
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
      website: ''
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
      bio: member.bio,
      image: member.image,
      imagePath: ip,
      linkedin: member.linkedin || '',
      github: member.github || '',
      personalEmail: member.personalEmail || member.email || '',
      companyEmail: member.companyEmail || '',
      website: member.website || ''
    });
    setShowTeamModal(true);
  };

  const handleAddTeamMember = () => {
    const newMember = {
      ...teamForm,
      image: teamForm.image || placeholderImage,
      imagePath: teamForm.imagePath,
    } as TeamMember;
    dispatch({ firestoreAction: 'ADD_TEAM_MEMBER', payload: newMember });
    setShowTeamModal(false);
    resetForms();
  };

  const handleUpdateTeamMember = () => {
    if (editingItem) {
      const updatedMember = { ...editingItem, ...teamForm } as TeamMember;
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
        <Button icon={Plus} onClick={handleAddClick}>Add Team Member</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {members.map((member) => (
          <Card key={member.id} className="bg-gray-50 dark:bg-gray-800 text-black dark:text-white">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Image
                  src={member.image}
                  alt={member.name}
                  width={100}
                  height={100}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-red-600 font-medium mb-2">{member.position}</p>
                  <p className="text-gray-600 text-sm line-clamp-3 dark:text-gray-400">{member.bio}</p>
                  <div className="flex space-x-2 mt-4">
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
