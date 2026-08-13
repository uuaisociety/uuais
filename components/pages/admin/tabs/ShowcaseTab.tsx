"use client";

import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { ShowcaseProject } from "@/types";
import { Edit3, Eye, EyeOff, Plus, Star, Trash2 } from "lucide-react";

export interface ShowcaseTabProps {
  projects: ShowcaseProject[];
  onAddClick: () => void;
  onEdit: (project: ShowcaseProject) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (project: ShowcaseProject) => void;
  onToggleFeature: (project: ShowcaseProject) => void;
}

const ShowcaseTab: React.FC<ShowcaseTabProps> = ({
  projects,
  onAddClick,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeature,
}) => {
  const sorted = [...(projects || [])].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Showcase Management</h2>
        <Button icon={Plus} onClick={onAddClick}>New Project</Button>
      </div>

      <div className="grid gap-4">
        {sorted.map((project) => (
          <Card key={project.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.title}</h3>
                    <Tag variant={project.published ? "green" : "yellow"} size="sm">
                      {project.published ? "Published" : "Draft"}
                    </Tag>
                    {project.featured && (
                      <Tag variant="red" size="sm">Featured</Tag>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2 dark:text-gray-400 line-clamp-2">{project.description}</p>
                  <div className="text-sm text-gray-500 mb-2 dark:text-gray-400">
                    <span className="mr-4">👤 {project.creatorName || 'member'}</span>
                    <span className="mr-4">🏷 {project.category}</span>
                    <span>⭐ {project.votes || 0}</span>
                    <span className="ml-4">📅 {format(new Date(project.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  {(project.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(project.tags || []).map((tag, index) => (
                        <Tag key={index} variant="gray" size="sm">{tag}</Tag>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <Button size="sm" variant="outline" icon={project.published ? EyeOff : Eye} onClick={() => onTogglePublish(project)}>
                    {project.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline" icon={Star} onClick={() => onToggleFeature(project)}>
                    {project.featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(project)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" icon={Trash2} onClick={() => onDelete(project.id)}>
                    <span className="text-black dark:text-white">Delete</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sorted.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 py-8 text-center">
            No showcase submissions yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default ShowcaseTab;
