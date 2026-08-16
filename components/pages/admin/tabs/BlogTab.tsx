"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { BlogPost } from "@/types";
import { Edit3, Eye, EyeOff, Plus, Sparkles, Trash2, User, Calendar, Star } from "lucide-react";
import Tag from "@/components/ui/Tag";

export interface BlogTabProps {
  posts: BlogPost[];
  onAddClick: () => void;
  onGenerateClick?: () => void;
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (post: BlogPost) => void;
  onToggleFeatured?: (post: BlogPost) => void;
}

type BlogSection = "all" | "team" | "ai";

const SECTIONS: { key: BlogSection; label: string }[] = [
  { key: "all", label: "All" },
  { key: "team", label: "From the Team" },
  { key: "ai", label: "AI News Desk" },
];

const BlogTab: React.FC<BlogTabProps> = ({ posts, onAddClick, onGenerateClick, onEdit, onDelete, onTogglePublish, onToggleFeatured }) => {
  const [section, setSection] = useState<BlogSection>("all");

  const filteredPosts = section === "all"
    ? posts
    : section === "team"
      ? posts.filter((p) => p.authorType !== "ai")
      : posts.filter((p) => p.authorType === "ai");

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-foreground">Blog Management</h2>
        <div className="flex flex-wrap gap-3">
          {onGenerateClick && (
            <Button variant="outline" icon={Sparkles} onClick={onGenerateClick}>Generate AI Draft</Button>
          )}
          <Button variant="outline" icon={Plus} onClick={onAddClick}>New Article</Button>
        </div>
      </div>

      <div className="flex bg-foreground/[0.05] rounded-md p-1 gap-1 mb-6 w-fit">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={section === s.key}
            onClick={() => setSection(s.key)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-300 ${
              section === s.key
                ? "bg-primary text-primary-foreground"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredPosts.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {section === "ai"
              ? "No AI News Desk drafts yet — generate one to get started."
              : "No articles here yet."}
          </p>
        )}
        {filteredPosts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
                    {post.authorType === "ai" && (
                      <Tag variant="blue" size="sm" className="inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI News Desk
                      </Tag>
                    )}
                    <Tag variant={post.published ? 'green' : 'yellow'} size="sm">
                      {post.published ? 'Published' : 'Draft'}
                    </Tag>
                  </div>
                  <p className="text-muted-foreground mb-2">{post.excerpt}</p>
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" aria-hidden />
                      {post.author}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                      {format(new Date(post.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <Tag key={index} variant="red" size="md">{tag}</Tag>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 ml-4">
                  {onToggleFeatured && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Star}
                      className={post.featured ? "text-primary [&>svg]:fill-primary" : ""}
                      onClick={() => onToggleFeatured(post)}
                      aria-label={post.featured ? 'Unset featured' : 'Set featured'}
                      aria-pressed={post.featured}
                      title={post.featured ? 'Remove from featured' : 'Feature this article'}
                    >
                      {post.featured ? 'Featured' : 'Feature'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" icon={post.published ? EyeOff : Eye} onClick={() => onTogglePublish(post)}>
                    {post.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(post)}>
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    icon={Trash2} 
                    onClick={() => onDelete(post.id)} 
                  >
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
