"use client";

import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, InputBase, SelectBase, TextareaBase } from "@/components/ui/Form";
import FileDropzone from '@/components/ui/FileDropzone';
import { uploadFileToServer, deleteFileFromServer } from '@/utils/fileUploader';
import { useNotify } from '@/components/ui/Notifications';

export interface EventFormState {
  title: string;
  description: string;
  location: string;
  image: string;
  imagePath?: string;
  category: 'workshop' | 'guest_lecture' | 'hackathon' | 'other';
  registrationRequired: boolean;
  maxCapacity?: number;
  eventStartAt: string;
  registrationClosesAt: string;
  publishAt: string;
  externalRegistrationUrl: string;
  /** When true, only signed-in users can use the external registration link on the public event page. */
  externalRegistrationMembersOnly: boolean;
}

interface EventModalProps {
  open: boolean;
  editing: boolean;
  form: EventFormState;
  setForm: React.Dispatch<React.SetStateAction<EventFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ open, editing, form, setForm, onClose, onSubmit }) => {
  const { notify } = useNotify();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const uploadToServer = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadFileToServer(file, { folder: 'event-images', previousPath: form.imagePath });
      setForm(prev => ({ ...prev, image: res.url || '', imagePath: res.path }));
      notify({ type: 'success', message: 'Event image uploaded' });
    } catch (e) {
      console.error('event image upload failed', e);
      notify({ type: 'error', message: 'Event image upload failed: ' + e });
    } finally {
      setUploading(false);
    }
  }, [form.imagePath, setForm, notify, setUploading]);

  const deleteFromServer = useCallback(async (path?: string) => {
    if (!path) return;
    setDeleting(true);
    try {
      await deleteFileFromServer(path);
      setForm(prev => ({ ...prev, image: '', imagePath: undefined }));
      notify({ type: 'success', message: 'Event image deleted' });
    } catch (e) {
      console.error('event image delete failed', e);
      notify({ type: 'error', message: 'Event image delete failed: ' + e });
    } finally {
      setDeleting(false);
    }
  }, [setForm, notify, setDeleting]);
  if (!open) return null;
  const fieldClasses = "valid:border-green-500 invalid:border-red-500";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Event' : 'Add New Event'}
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        <FieldGroup label="Title" requiredHint="Required.">
          <InputBase
            type="text"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            className={fieldClasses}
            required
          />
        </FieldGroup>

        <FieldGroup label="Event Start (date & time)" requiredHint="Required.">
          <InputBase
            type="datetime-local"
            value={form.eventStartAt || ''}
            onChange={(e) => setForm(prev => ({ ...prev, eventStartAt: e.target.value }))}
            className={fieldClasses}
            placeholder="YYYY-MM-DDTHH:mm"
            required
          />
        </FieldGroup>

        <FieldGroup label="Description" requiredHint="Required.">
          <TextareaBase
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className={fieldClasses}
            required
          />
        </FieldGroup>

        <FieldGroup label="Registration closes (optional)">
          <InputBase
            type="datetime-local"
            value={form.registrationClosesAt || ''}
            onChange={(e) => setForm(prev => ({ ...prev, registrationClosesAt: e.target.value }))}
            className={fieldClasses}
            placeholder="YYYY-MM-DDTHH:mm"
          />
        </FieldGroup>

        <FieldGroup label="Publish at (optional)">
          <InputBase
            type="datetime-local"
            value={form.publishAt || ''}
            onChange={(e) => setForm(prev => ({ ...prev, publishAt: e.target.value }))}
            className={fieldClasses}
            placeholder="YYYY-MM-DDTHH:mm"
          />
        </FieldGroup>

        <FieldGroup label="Location" requiredHint="Required.">
          <InputBase
            type="text"
            value={form.location}
            onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
            className={fieldClasses}
            required
          />
        </FieldGroup>

        <FieldGroup label="Image URL">
          <InputBase
            type="url"
            value={form.image}
            onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
            className={fieldClasses}
            placeholder="Optional; a placeholder will be used if empty"
          />
          <div className="mt-3">
            <FileDropzone
              initialUrl={form.image}
              initialPath={form.imagePath}
              onFileSelected={uploadToServer}
              onDelete={async () => deleteFromServer(form.imagePath)}
              onError={(e) => notify({ type: 'error', message: 'Event image upload failed ' + e })}
              uploading={uploading}
              deleting={deleting}
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Category" requiredHint="Required.">
          <SelectBase
            value={form.category}
            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value as EventFormState['category'] }))}
          >
            <option value="workshop">Workshop</option>
            <option value="guest_lecture">Guest Lecture</option>
            <option value="hackathon">Hackathon</option>
            <option value="other">Other</option>
          </SelectBase>
        </FieldGroup>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form.registrationRequired}
              onChange={(e) => setForm(prev => ({ ...prev, registrationRequired: e.target.checked }))}
              className="mr-2"
            />
            Registration Required
          </label>

          {form.registrationRequired && (
            <div>
              <FieldGroup label="Max Capacity (optional)">
                <InputBase
                  type="number"
                  value={form.maxCapacity ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm(prev => ({ ...prev, maxCapacity: v === '' ? undefined : Math.max(1, parseInt(v) || 1) }));
                  }}
                  className="w-32 min-w-[240px]"
                  min="1"
                  placeholder="Leave empty for unlimited"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty when you want registration required but no capacity limit.</p>
              </FieldGroup>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3 bg-foreground/[0.03]">
          <p className="text-sm font-medium text-foreground">External registration</p>
          <FieldGroup label="Registration link (optional)">
            <InputBase
              id="external-registration-url"
              type="url"
              value={form.externalRegistrationUrl}
              onChange={(e) => setForm(prev => ({ ...prev, externalRegistrationUrl: e.target.value }))}
              className={fieldClasses}
              placeholder="https://…"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If set, the event detail page shows a button that opens this URL in a new tab.
            </p>
          </FieldGroup>
          <div className="flex items-start gap-3">
            <input
              id="external-registration-members-only"
              type="checkbox"
              className="mt-1 rounded border-border shrink-0"
              checked={form.externalRegistrationMembersOnly}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  externalRegistrationMembersOnly: e.target.checked,
                }))
              }
            />
            <div>
              <label
                htmlFor="external-registration-members-only"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Require sign-in to view the link
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When checked, visitors who are not logged in see a disabled control and must sign in before they can open the external registration page.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="outline" disabled={uploading || deleting}>{editing ? 'Update Event' : 'Create Event'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EventModal;
