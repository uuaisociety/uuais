"use client";

import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Event } from "@/types";

export interface EventsTabProps {
  events: Event[];
  onAddClick: () => void;
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (event: Event) => void;
  onManageQuestions: (event: Event) => void;
}

const EventsTab: React.FC<EventsTabProps> = ({
  events,
  onAddClick,
  onEdit,
  onDelete,
  onTogglePublish,
  onManageQuestions,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Events Management</h2>
        <Button icon={Plus} onClick={onAddClick}>
          Add New Event
        </Button>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id} className="bg-white dark:bg-gray-800 text-black dark:text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === "upcoming"
                          ? "bg-green-100 dark:bg-gray-800 text-green-800 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {event.status}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-gray-800 text-blue-800 dark:text-blue-400 rounded-full text-xs font-medium">
                      {event.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2 dark:text-gray-400">{event.description}</p>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="mr-4">📅 {format(new Date(event.date), "MMM d, yyyy")}</span>
                    <span className="mr-4">🕒 {event.time}</span>
                    <span>📍 {event.location}</span>
                  </div>
                  {event.registrationRequired && (
                    <div className="text-sm text-gray-500 mt-1">
                      👥 {event.currentRegistrations || 0} / {event.maxCapacity} registered
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={event.published ? EyeOff : Eye}
                    onClick={() => onTogglePublish(event)}
                  >
                    {event.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onManageQuestions(event)}>
                    Manage Questions
                  </Button>
                  <Button size="sm" variant="outline" icon={Edit3} onClick={() => onEdit(event)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Trash2}
                    onClick={() => onDelete(event.id)}
                    className="text-red-600 hover:text-red-700"
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

export default EventsTab;
