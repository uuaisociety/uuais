"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { BlogPost } from "@/types";
import { Edit3, Eye, EyeOff, Plus, Sparkles, Trash2, User, Calendar, Star } from "lucide-react";
import Tag from "@/components/ui/Tag";
import BlogModal, { type BlogFormState } from "@/components/pages/admin/modals/BlogModal";
import GenerateBlogModal from "@/components/pages/admin/modals/GenerateBlogModal";
import { useApp } from "@/contexts/AppContext";
import { addUsedNewsUrls, removeUsedNewsUrls } from "@/lib/firestore/blog-seen";
import { auth } from "@/lib/firebase-client";

type BlogSection = "all" | "team" | "ai";

const SECTIONS: { key: BlogSection; label: string }[] = [
  { key: "all", label: "All" },
  { key: "team", label: "From the Team" },
  { key: "ai", label: "AI News Desk" },
];

const emptyForm: BlogFormState = {
  title: "",
  excerpt: "",
  content: "",
  author: "",
  image: "",
  tags: [],
  published: false,
};

const BlogTab: React.FC = () => {
  const { state, dispatch } = useApp();
  const posts = state.blogPosts;
  const [section, setSection] = useState<BlogSection>("all");
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showGenerateBlogModal, setShowGenerateBlogModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BlogPost | null>(null);
  const [blogForm, setBlogForm] = useState<BlogFormState>(emptyForm);

  const placeholderImage = "/images/logo-highdef.png";

  const filteredPosts = section === "all"
    ? posts
    : section === "team"
      ? posts.filter((p) => p.authorType !== "ai")
      : posts.filter((p) => p.authorType === "ai");

  const resetForms = () => {
    setBlogForm(emptyForm);
    setEditingItem(null);
  };

  const reviewerName = () => auth.currentUser?.displayName || auth.currentUser?.email || "";

  // Seen-URL lifecycle: cited sources become "covered" at publish and are released on unpublish/delete.
  const syncSeenUrlsForPost = (post: BlogPost) => {
    const urls = (post.sources ?? []).map((s) => s.url).filter(Boolean);
    if (urls.length === 0) return;
    if (post.published) {
      addUsedNewsUrls(urls).catch((e) => console.warn("Failed to mark post sources as used:", e));
    } else {
      removeUsedNewsUrls(urls).catch((e) => console.warn("Failed to release post sources:", e));
    }
  };

  const handleAddBlogPost = () => {
    const newPost = {
      ...blogForm,
      image: blogForm.image || placeholderImage,
      date: new Date().toISOString().split("T")[0]
    } as BlogPost;
    if (newPost.published && newPost.authorType === "ai" && !newPost.reviewedBy) {
      newPost.reviewedBy = reviewerName();
    }
    dispatch({ firestoreAction: "ADD_BLOG_POST", payload: newPost });
    syncSeenUrlsForPost(newPost);
    setShowBlogModal(false);
    resetForms();
  };

  const handleEditBlogPost = (post: BlogPost) => {
    setEditingItem(post);
    setBlogForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      image: post.image,
      tags: post.tags,
      published: post.published
    });
    setShowBlogModal(true);
  };

  const handleUpdateBlogPost = () => {
    if (editingItem) {
      const updatedPost = { ...editingItem, ...blogForm } as BlogPost;
      if (updatedPost.published && updatedPost.authorType === "ai" && !updatedPost.reviewedBy) {
        updatedPost.reviewedBy = reviewerName();
      }
      dispatch({ firestoreAction: "UPDATE_BLOG_POST", payload: updatedPost });
      syncSeenUrlsForPost(updatedPost);
      setShowBlogModal(false);
      resetForms();
    }
  };

  const handleDeleteBlogPost = (postId: string) => {
    if (window.confirm("Are you sure you want to delete this blog post?")) {
      dispatch({ firestoreAction: "DELETE_BLOG_POST", payload: postId });
    }
  };

  const toggleBlogPostVisibility = (post: BlogPost) => {
    const payload: BlogPost = { ...post, published: !post.published };
    if (payload.published && post.authorType === "ai" && !post.reviewedBy) {
      payload.reviewedBy = reviewerName();
    }
    dispatch({ firestoreAction: "UPDATE_BLOG_POST", payload });
    syncSeenUrlsForPost(payload);
  };

  const toggleBlogPostFeatured = (post: BlogPost) => {
    dispatch({ firestoreAction: "UPDATE_BLOG_POST", payload: { ...post, featured: !post.featured } });
  };

  const handleDraftCreated = async (draftId: string) => {
    setShowGenerateBlogModal(false);
    try {
      const mod = await import("@/lib/firestore/blog");
      const post = await mod.getBlogPostById(draftId);
      if (post) {
        handleEditBlogPost(post);
      }
    } catch (e) {
      console.error("Failed to load generated draft:", e);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground">Blog</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" icon={Sparkles} onClick={() => setShowGenerateBlogModal(true)}>Generate AI Draft</Button>
          <Button variant="outline" icon={Plus} onClick={() => { resetForms(); setShowBlogModal(true); }}>New Article</Button>
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
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Star}
                    className={post.featured ? "text-primary [&>svg]:fill-primary" : ""}
                    onClick={() => toggleBlogPostFeatured(post)}
                    aria-label={post.featured ? 'Unset featured' : 'Set featured'}
                    aria-pressed={post.featured}
                    title={post.featured ? 'Remove from featured' : 'Feature this article'}
                  >
                    {post.featured ? 'Featured' : 'Feature'}
                  </Button>
                  <Button size="sm" variant="outline" icon={post.published ? EyeOff : Eye} onClick={() => toggleBlogPostVisibility(post)}>
                    {post.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => handleEditBlogPost(post)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    icon={Trash2}
                    onClick={() => handleDeleteBlogPost(post.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BlogModal
        open={showBlogModal}
        editing={!!editingItem}
        form={blogForm}
        setForm={setBlogForm}
        onClose={() => { setShowBlogModal(false); resetForms(); }}
        onSubmit={() => {
          if (editingItem) {
            handleUpdateBlogPost();
          } else {
            handleAddBlogPost();
          }
        }}
      />

      <GenerateBlogModal
        open={showGenerateBlogModal}
        onClose={() => setShowGenerateBlogModal(false)}
        onDraftCreated={handleDraftCreated}
      />
    </div>
  );
};

export default BlogTab;
