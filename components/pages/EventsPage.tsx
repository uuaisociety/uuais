"use client";

// Disable static generation for this page
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { useApp } from "@/contexts/AppContext";
import { updatePageMeta } from "@/utils/seo";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import campus from "@/public/images/campus.png";

const EventsPage: React.FC = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [activeEvents, setActiveEvents] = useState(state.events);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    updatePageMeta(
      "Events",
      "Join our upcoming AI workshops, guest lectures, and networking events"
    );
  }, []);

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "workshop", label: "Workshop" },
    { value: "guest_lecture", label: "Guest Lecture" },
    { value: "hackathon", label: "Hackathon" },
    { value: "other", label: "Other" },
  ];

  const now = new Date();
  const futureEvents = state.events
    .filter((event) => event.published !== false)
    .filter((event) => !event.publishAt || new Date(event.publishAt) <= now)
    .filter((event) => new Date(event.eventStartAt) > now)
    .filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || event.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

  const pastEvents = state.events
    .filter((e) => e.published !== false)
    .filter((e) => !e.publishAt || new Date(e.publishAt) <= now)
    .filter((e) => new Date(e.eventStartAt) < now)
    .filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

  const getCategoryColor = (category: string) => {
    const colors = {
      workshop: "bg-blue-100 text-blue-800",
      guest_lecture: "bg-green-100 text-green-800",
      other: "bg-purple-100 text-purple-800",
      hackathon: "bg-yellow-100 text-yellow-800",
    };
    return (
      colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800"
    );
  };

  useEffect(() => {
    setActiveEvents(activeTab === "upcoming" ? futureEvents : pastEvents);
  }, [activeTab, futureEvents, pastEvents]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Events
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Join our community events and expand your knowledge in artificial
            intelligence
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 ">
          <div className="flex bg-white dark:bg-gray-900 transition-colors p-1 rounded-lg gap-2">
            <Button
              onClick={() => setActiveTab("upcoming")}
              className={`px-6 py-2 font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                activeTab === "upcoming"
                  ? "bg-red-600 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Upcoming Events
            </Button>
            <Button
              onClick={() => setActiveTab("past")}
              className={`px-6 py-2 rounded-md font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                activeTab === "past"
                  ? "bg-red-600 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Past Events
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                // icon={Search}
                fullWidth
              />
            </div>
            <div className="md:w-64">
              <Select
                options={categoryOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                fullWidth
              />
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {activeEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No events found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {activeTab === "upcoming"
                ? "No upcoming events match your search criteria."
                : "No past events match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeEvents.map((event) => (
              <Card
                key={event.id}
                className="h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                  <Link href={`/events/${event.id}`}>
                    <Image
                      src={event.image || campus}
                      alt={event.title}
                      width={500}
                      height={500}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="absolute top-4 left-4">
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(
                        event.category
                      )}`}
                    >
                      {categoryOptions.find(
                        (option) => option.value === event.category
                      )?.label || event.category}
                    </span>
                  </div>
                  {event.registrationRequired && activeTab === "upcoming" && (
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-full">
                        Registration Required
                      </span>
                    </div>
                  )}
                </div>

                <CardContent className="p-6">
                  <h3 className="text-xl pt-2 font-semibold text-gray-900 dark:text-white mb-3">
                    <Link
                      href={`/events/${event.id}`}
                      className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      {event.title}
                    </Link>
                  </h3>

                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 whitespace-pre-wrap">
                    {event.description.slice(0, 100) +
                      (event.description.length > 100 ? "..." : "")}
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                      <span>
                        {format(new Date(event.eventStartAt), "MMM d, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                      <span>
                        {format(new Date(event.eventStartAt), "HH:mm")}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                      <span>{event.location}</span>
                    </div>

                    {typeof event.maxCapacity === "number" && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                        <span>Capacity: {event.maxCapacity}</span>
                      </div>
                    )}
                  </div>

                  <Link href={`/events/${event.id}`}>
                    {activeTab === "upcoming" ? (
                      <Button variant="default" size="sm">
                        View Details & Register
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    )}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
