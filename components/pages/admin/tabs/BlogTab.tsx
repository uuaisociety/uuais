"use client";

import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { BlogPost } from "@/types";
import { Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Management</h2>
        <Button icon={Plus} onClick={onAddClick}>New Article</Button>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="bg-white dark:bg-gray-800 text-black dark:text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{post.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.published ? 'bg-green-100 dark:bg-gray-800 text-green-800 dark:text-green-400' : 'bg-yellow-100 dark:bg-gray-800 text-yellow-800 dark:text-yellow-400'}`}>
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2 dark:text-gray-400">{post.excerpt}</p>
                  <div className="text-sm text-gray-500 mb-2 dark:text-gray-400">
                    <span className="mr-4">👤 {post.author}</span>
                    <span>📅 {format(new Date(post.date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 text-xs rounded">
                        {tag}
                      </span>
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
