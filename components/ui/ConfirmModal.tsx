"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = "Confirm",
  description = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-lg focus:outline-none"
      >
        <div className="px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <div className="px-5 py-4 text-gray-700 dark:text-gray-300">
          {description}
        </div>
        <div className="px-5 pb-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{cancelText}</Button>
          <Button className="bg-red-600 text-white" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
