'use client'

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { confirmRegistrationByToken } from '@/lib/firestore/registrations';

const ConfirmPage: React.FC = () => {
  const params = useParams();
  const token = (params?.token as string) || '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [ok, setOk] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) return;
      setStatus('loading');
      try {
        const res = await confirmRegistrationByToken(token);
        if (!mounted) return;
        setOk(res.ok);
        setMessage(res.message);
      } catch (e) {
        if (!mounted) return;
        setOk(false);
        setMessage(e instanceof Error ? e.message : 'An error occurred');
      } finally {
        if (mounted) setStatus('done');
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
      <div className="max-w-xl mx-auto px-4">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Confirmation</h1>
          </CardHeader>
          <CardContent>
            {status !== 'done' ? (
              <p className="text-gray-700 dark:text-gray-300">Processing your confirmation...</p>
            ) : (
              <div className="space-y-4">
                <p className={ok ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                  {message}
                </p>
                <div className="flex gap-3">
                  <Link href="/events">
                    <Button>Browse Events</Button>
                  </Link>
                  <Link href="/account">
                    <Button variant="outline">Go to Account</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmPage;
