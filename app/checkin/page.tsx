"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { useAdmin } from "@/hooks/useAdmin";
import { setAttendanceForUser } from "@/lib/firestore/attendance";
import AdminGate from "@/components/auth/AdminGate";
import { getUserProfile } from "@/lib/firestore/users";

const CheckinPage: React.FC = () => {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || "";
  const scannedUserId = searchParams.get("userId") || "";
  const { user, isAdmin, loading } = useAdmin();
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [message, setMessage] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (!eventId || !scannedUserId) {
      setMessage("Missing event or user information in URL.");
      return;
    }
    if (loading) return;
    if (!user) {
      setMessage("You need to be signed in to check in.");
      return;
    }
    if (!isAdmin) {
      setMessage("Only admin users can use this check-in link.");
      return;
    }
    if (status !== "idle") return;

    (async () => {
      try {
        setStatus("working");
        await setAttendanceForUser(eventId, scannedUserId, true);
        setStatus("done");
        setMessage("Attendance has been recorded.");
      } catch (e) {
        setStatus("done");
        setMessage(e instanceof Error ? e.message : "Failed to record attendance.");
      }
    })();
  }, [eventId, user, isAdmin, loading, status]);

  useEffect(() => {
    // Get user name
    if (!scannedUserId) return;
    (async () => {
      const user = await getUserProfile(scannedUserId);
      if (!user) {
        setMessage("User not found.");
        return;
      }
      setUserName(user.name || user.displayName || user.email || "Unknown User");
    })();
  }, [scannedUserId]);

  return (
    <AdminGate>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 pt-24">
        <div className="max-w-md mx-auto px-4">
          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6 pb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Event Check-in
              </h1>
              <h1 className="text-gray-700 dark:text-gray-300 mb-6 text-xl font-bold">
                {userName}
              </h1>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                {message || "Processing your check-in..."}
              </p>

            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGate>
  );
};

export default CheckinPage;
