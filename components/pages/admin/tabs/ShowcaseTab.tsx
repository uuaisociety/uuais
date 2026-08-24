"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { ShowcaseProject } from "@/types";
import { Edit3, Eye, EyeOff, Plus, Star, Trash2 } from "lucide-react";
import ShowcaseModal, { type ShowcaseFormState } from "@/components/pages/admin/modals/ShowcaseModal";
import { useApp } from "@/contexts/AppContext";

const emptyForm: ShowcaseFormState = {
  title: "",
  description: "",
  category: "app",
  links: {},
  tags: [],
  coverImage: "",
  coverImagePath: "",
};

const ShowcaseTab: React.FC = () => {
  const { state, dispatch } = useApp();
  const [showShowcaseModal, setShowShowcaseModal] = useState(false);
  const [editingShowcase, setEditingShowcase] = useState<ShowcaseProject | null>(null);
  const [showcaseForm, setShowcaseForm] = useState<ShowcaseFormState>(emptyForm);

  const sorted = [...state.showcaseProjects].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  const openCreate = () => {
    setEditingShowcase(null);
    setShowcaseForm(emptyForm);
    setShowShowcaseModal(true);
  };

  const openEdit = (project: ShowcaseProject) => {
    setEditingShowcase(project);
    setShowcaseForm({
      title: project.title,
      description: project.description,
      category: project.category,
      links: project.links,
      tags: project.tags,
      coverImage: project.coverImage ?? "",
      coverImagePath: project.coverImagePath ?? "",
    });
    setShowShowcaseModal(true);
  };

  const closeModal = () => {
    setShowShowcaseModal(false);
    setEditingShowcase(null);
  };

  const handleAdd = () => {
    const now = new Date().toISOString();
    dispatch({
      firestoreAction: "ADD_SHOWCASE_PROJECT",
      payload: {
        title: showcaseForm.title,
        description: showcaseForm.description,
        category: showcaseForm.category,
        creatorUserId: "admin",
        creatorName: "Admin",
        links: showcaseForm.links,
        coverImage: showcaseForm.coverImage || undefined,
        coverImagePath: showcaseForm.coverImagePath || undefined,
        tags: showcaseForm.tags,
        votes: 0,
        published: true,
        featured: false,
        createdAt: now,
        updatedAt: now,
      },
    });
    closeModal();
  };

  const handleUpdate = () => {
    if (!editingShowcase) return;
    dispatch({
      firestoreAction: "UPDATE_SHOWCASE_PROJECT",
      payload: {
        ...editingShowcase,
        title: showcaseForm.title,
        description: showcaseForm.description,
        category: showcaseForm.category,
        links: showcaseForm.links,
        coverImage: showcaseForm.coverImage || undefined,
        coverImagePath: showcaseForm.coverImagePath || undefined,
        tags: showcaseForm.tags,
        updatedAt: new Date().toISOString(),
      },
    });
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this showcase project?")) {
      dispatch({ firestoreAction: "DELETE_SHOWCASE_PROJECT", payload: id });
    }
  };

  const togglePublish = (project: ShowcaseProject) => {
    dispatch({
      firestoreAction: "UPDATE_SHOWCASE_PROJECT",
      payload: { ...project, published: !project.published, updatedAt: new Date().toISOString() },
    });
  };

  const toggleFeature = (project: ShowcaseProject) => {
    dispatch({
      firestoreAction: "UPDATE_SHOWCASE_PROJECT",
      payload: { ...project, featured: !project.featured, updatedAt: new Date().toISOString() },
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground">Showcase</h2>
        <Button variant="outline" icon={Plus} onClick={openCreate}>New Project</Button>
      </div>

      <div className="grid gap-4">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No showcase submissions yet.</p>
        )}
        {sorted.map((project) => (
          <Card key={project.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
                    <Tag variant={project.published ? "green" : "yellow"} size="sm">
                      {project.published ? "Published" : "Draft"}
                    </Tag>
                    {project.featured && (
                      <Tag variant="red" size="sm">Featured</Tag>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-2 line-clamp-2">{project.description}</p>
                  <div className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground/70 mb-2">
                    {project.creatorName || "member"} · {project.category} · {project.votes || 0} votes · {format(new Date(project.createdAt), "MMM d, yyyy")}
                  </div>
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag, index) => (
                        <Tag key={index} variant="gray" size="sm">{tag}</Tag>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4 shrink-0">
                  <Button size="sm" variant="outline" icon={project.published ? EyeOff : Eye} onClick={() => togglePublish(project)}>
                    {project.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline" icon={Star} onClick={() => toggleFeature(project)}>
                    {project.featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => openEdit(project)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" icon={Trash2} onClick={() => handleDelete(project.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ShowcaseModal
        open={showShowcaseModal}
        editing={!!editingShowcase}
        form={showcaseForm}
        setForm={setShowcaseForm}
        onClose={closeModal}
        onSubmit={() => {
          if (editingShowcase) {
            handleUpdate();
          } else {
            handleAdd();
          }
        }}
      />
    </div>
  );
};

export default ShowcaseTab;
