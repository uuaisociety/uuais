"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, InputBase } from "@/components/ui/Form";
import { BoardPosition } from "@/types";
import { Textarea } from "@/components/ui/Textarea";

export type BPositionFormState = Pick<BoardPosition, "title" | "short" | "description">;

interface BPositionModalProps {
  open: boolean;
  onClose: () => void;
  form: BPositionFormState;
  setForm: React.Dispatch<React.SetStateAction<BPositionFormState>>;
  editing: boolean;
  onAdd: () => void;
  onUpdate: () => void;
}

const BoardPositionModal: React.FC<BPositionModalProps> = ({ open, onClose, form, setForm, editing, onAdd, onUpdate }) => {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Board Position' : 'Add Board Position'}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (editing) {
            onUpdate();
          } else {
            onAdd();
          }
        }}
        className="space-y-4"
      >
        <FieldGroup label="Title" requiredHint="Required.">
          <InputBase value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} required />
        </FieldGroup>
        <FieldGroup label="Short" requiredHint="Required.">
          <InputBase value={form.short} onChange={(e) => setForm(prev => ({ ...prev, short: e.target.value }))} required />
        </FieldGroup>
        <FieldGroup label="Description">
          <Textarea rows={6} value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} />
        </FieldGroup>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="outline">{editing ? 'Update' : 'Add'} Board Position</Button>
        </div>
      </form>
    </Modal>
  );
};

export default BoardPositionModal;