"use client";

import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { BlogPost } from "@/types";
import { Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import Tag from "@/components/ui/Tag";

export interface BlogTabProps {
  posts: BlogPost[];
  onAddClick: () => void;
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (post: BlogPost) => void;
}

const BlogTab: React.FC<BlogTabProps> = ({ posts, onAddClick, onEdit, onDelete, onTogglePublish }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Newsletter Management</h2>
        <Button icon={Plus} onClick={onAddClick}>New Article</Button>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{post.title}</h3>
                    <Tag variant={post.published ? 'green' : 'yellow'} size="sm">
                      {post.published ? 'Published' : 'Draft'}
                    </Tag>
                  </div>
                  <p className="text-gray-600 mb-2 dark:text-gray-400">{post.excerpt}</p>
                  <div className="text-sm text-gray-500 mb-2 dark:text-gray-400">
                    <span className="mr-4">👤 {post.author}</span>
                    <span>📅 {format(new Date(post.date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <Tag key={index} variant="red" size="md">{tag}</Tag>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button size="sm" variant="outline" icon={post.published ? EyeOff : Eye} onClick={() => onTogglePublish(post)}>
                    {post.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(post)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" icon={Trash2} onClick={() => onDelete(post.id)} className="text-red-600 hover:text-red-700">
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BlogTab;
