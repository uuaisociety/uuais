"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { RegistrationQuestion } from "@/types";
import { Edit3, Plus, Trash2 } from "lucide-react";

export interface RegistrationTabProps {
  questions: RegistrationQuestion[];
  onAddClick: () => void;
  onEdit: (q: RegistrationQuestion) => void;
  onDelete: (id: string) => void;
}

const RegistrationTab: React.FC<RegistrationTabProps> = ({ questions, onAddClick, onEdit, onDelete }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registration Questions</h2>
        <Button icon={Plus} onClick={onAddClick}>Add Question</Button>
      </div>
      <div className="grid gap-4">
        {questions.map((q) => (
          <Card key={q.id} className='bg-white dark:bg-gray-800 text-black dark:text-white'>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{q.question}</h3>
                  <div className="text-sm text-gray-500 mt-2">{q.type} • Order {q.order} • {q.required ? 'Required' : 'Optional'}</div>
                  {q.options && q.options.length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Options: {q.options.join(', ')}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(q)}>Edit</Button>
                  <Button size="sm" variant="outline" icon={Trash2} className="text-red-600" onClick={() => onDelete(q.id)}>Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RegistrationTab;
