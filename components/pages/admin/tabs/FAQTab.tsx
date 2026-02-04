"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FAQ } from "@/types";
import { Edit3, Plus, Trash2 } from "lucide-react";

export interface FAQTabProps {
  faqs: FAQ[];
  onAddClick: () => void;
  onEdit: (faq: FAQ) => void;
  onDelete: (id: string) => void;
}

const FAQTab: React.FC<FAQTabProps> = ({ faqs, onAddClick, onEdit, onDelete }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">FAQ Management</h2>
        <Button icon={Plus} onClick={onAddClick}>Add FAQ</Button>
      </div>
      <div className="grid gap-4">
        {faqs.map((faq) => (
          <Card key={faq.id} className='bg-white dark:bg-gray-800 text-black dark:text-white'>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{faq.question}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                  <div className="text-sm text-gray-500 mt-2">{faq.category} • Order {faq.order} • {faq.published ? 'Published' : 'Hidden'}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(faq)}>Edit</Button>
                  <Button size="sm" variant="destructive" icon={Trash2} onClick={() => onDelete(faq.id)}>
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

export default FAQTab;
