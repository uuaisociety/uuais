"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, InputBase, TextareaBase } from "@/components/ui/Form";
import { FAQ } from "@/types";

export type FAQFormState = Pick<FAQ, 'question'|'answer'|'category'|'order'|'published'>;

interface FAQModalProps {
  open: boolean;
  onClose: () => void;
  form: FAQFormState;
  setForm: React.Dispatch<React.SetStateAction<FAQFormState>>;
  editing: boolean;
  onAdd: () => void;
  onUpdate: () => void;
}

const FAQModal: React.FC<FAQModalProps> = ({ open, onClose, form, setForm, editing, onAdd, onUpdate }) => {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit FAQ' : 'Add FAQ'}
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
        <FieldGroup label="Question" requiredHint="Required.">
          <InputBase value={form.question} onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))} required />
        </FieldGroup>
        <FieldGroup label="Answer" requiredHint="Required.">
          <TextareaBase rows={4} value={form.answer} onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))} required />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Category">
            <InputBase value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Order">
            <InputBase type="number" value={form.order} onChange={(e) => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))} />
          </FieldGroup>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm(prev => ({ ...prev, published: e.target.checked }))} /> Published</label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="outline">{editing ? 'Update' : 'Add'} FAQ</Button>
        </div>
      </form>
    </Modal>
  );
};

export default FAQModal;
