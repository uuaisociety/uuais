'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNotify } from '@/components/ui/Notifications';
import { useCollectionData } from '@/lib/firestore/useCollectionData';
import { useGuessContest } from '@/lib/firestore/useGuessContest';
import {
  MAX_GUESS_DIGITS,
  saveGuessContest,
  subscribeGuesses,
  type Guess,
  type GuessContest,
} from '@/lib/firestore/guess-contest';

function SettingsForm({ initial }: { initial: GuessContest }) {
  const { notify } = useNotify();
  const [item, setItem] = useState(initial.item);
  const [open, setOpen] = useState(initial.open);
  const [saving, setSaving] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveGuessContest({ item: item.trim(), open });
      notify({ type: 'success', message: 'Guessing game saved.' });
    } catch {
      notify({ type: 'error', message: 'Could not save the guessing game.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={onSave} className="space-y-4">
          <Input
            id="guess-item"
            label="Guess the amount of…"
            placeholder="candy in the jar"
            maxLength={100}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            fullWidth
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={open}
              onChange={(e) => setOpen(e.target.checked)}
            />
            Open: accept guesses and show the link in the header
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function GuessTab() {
  const { contest, loaded } = useGuessContest();
  const { data: guesses } = useCollectionData<Guess>(subscribeGuesses, []);
  const [answer, setAnswer] = useState('');

  const ranked = useMemo(() => {
    const time = (g: Guess) => g.updatedAt?.getTime() ?? 0;
    if (answer === '') return [...guesses].sort((a, b) => time(b) - time(a));
    const target = Number(answer);
    // Closest first; on a tie the earlier guess wins.
    return [...guesses].sort(
      (a, b) =>
        Math.abs(a.guess - target) - Math.abs(b.guess - target) ||
        time(a) - time(b),
    );
  }, [guesses, answer]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Guessing game</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Members guess at{' '}
          <a
            href="/guess"
            className="underline underline-offset-2 hover:text-foreground"
          >
            /guess
          </a>{' '}
          while the game is open. {guesses.length} guess
          {guesses.length !== 1 ? 'es' : ''} so far.
        </p>
      </div>

      {loaded && (
        <SettingsForm initial={contest ?? { item: '', open: false }} />
      )}

      <div className="space-y-3">
        <Input
          id="guess-answer"
          label="Correct amount (ranks the closest guesses first)"
          inputMode="numeric"
          maxLength={MAX_GUESS_DIGITS}
          value={answer}
          onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ''))}
          className="max-w-xs"
        />
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No guesses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Guess</th>
                  {answer !== '' && (
                    <th className="py-2 pr-4 font-medium">Off by</th>
                  )}
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((g, i) => (
                  <tr key={g.id} className="border-t border-border">
                    <td className="py-2 pr-4 font-mono text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="py-2 pr-4">
                      <a
                        href={`mailto:${g.email}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {g.email}
                      </a>
                    </td>
                    <td className="py-2 pr-4 font-mono">{g.guess}</td>
                    {answer !== '' && (
                      <td className="py-2 pr-4 font-mono">
                        {Math.abs(g.guess - Number(answer))}
                      </td>
                    )}
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                      {g.updatedAt?.toLocaleString('en-GB') ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
