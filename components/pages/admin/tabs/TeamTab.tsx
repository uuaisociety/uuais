"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { TeamMember } from "@/types";

export interface TeamTabProps {
  members: TeamMember[];
  onAddClick: () => void;
  onEdit: (member: TeamMember) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (member: TeamMember) => void;
}

const TeamTab: React.FC<TeamTabProps> = ({
  members,
  onAddClick,
  onEdit,
  onDelete,
  onTogglePublish,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
        <Button icon={Plus} onClick={onAddClick}>Add Team Member</Button>
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
                      onClick={() => onTogglePublish(member)}
                    >
                      {member.published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(member)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Trash2}
                      onClick={() => onDelete(member.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TeamTab;
