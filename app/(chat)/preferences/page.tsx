'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { INTERESTS, type InterestCategory } from '@/lib/onboarding/interests';

export default function PreferencesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => ({}));
  const [goals, setGoals] = useState<string>('');
  const [timeBudget, setTimeBudget] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSelected = useMemo(
    () => Object.values(selected).reduce((acc, set) => acc + set.size, 0),
    [selected],
  );

  useEffect(() => {
    // Load current profile
    (async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' });
        if (!res.ok) return;
        const profile = await res.json();
        if (profile) {
          const interests = Array.isArray(profile.interests)
            ? (profile.interests as Array<{ category: string; topics: string[] }>)
            : [];
          const mapped: Record<string, Set<string>> = {};
          interests.forEach((c) => (mapped[c.category] = new Set(c.topics)));
          setSelected(mapped);
          setGoals(Array.isArray(profile.goals) ? (profile.goals as string[]).join(', ') : '');
          setTimeBudget(typeof profile.timeBudgetMins === 'number' ? profile.timeBudgetMins : 30);
        }
      } catch { }
    })();
  }, []);

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void save();
    }, 400);
  }

  function toggle(category: string, topic: string) {
    setSelected((prev) => {
      const current = new Set(prev[category] ?? []);
      if (current.has(topic)) current.delete(topic);
      else current.add(topic);
      return { ...prev, [category]: current };
    });
    scheduleSave();
  }

  async function save() {
    setSaving(true);
    try {
      const interests = Object.entries(selected)
        .map(([category, set]) => ({ category, topics: Array.from(set) }))
        .filter((c) => c.topics.length > 0);
      const goalsArray = goals
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, goals: goalsArray, timeBudgetMins: timeBudget }),
      });
      if (res.ok) {
        router.push('/chat');
      }
    } catch { }
    setSaving(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between pt-5">
          <div className="text-2xl font-semibold">Learning preferences</div>
        </div>

        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INTERESTS.map((cat: InterestCategory) => (
              <div key={cat.category} className="rounded-lg border p-3">
                <div className="text-sm font-medium mb-2">{cat.category}</div>
                <div className="flex flex-wrap gap-2">
                  {cat.topics.map((topic) => {
                    const isSelected = selected[cat.category]?.has(topic);
                    return (
                      <Button
                        key={topic}
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className="h-7 rounded-full"
                        onClick={() => toggle(cat.category, topic)}
                      >
                        {isSelected ? '✓ ' : ''}
                        {topic}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{totalSelected} selected</div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex gap-2">
            {[20, 30, 40].map((mins) => (
              <Button
                key={mins}
                variant={timeBudget === mins ? 'default' : 'outline'}
                onClick={() => {
                  setTimeBudget(mins);
                  scheduleSave();
                }}
              >
                {mins} min
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goals">2–3 long-term goals (comma-separated)</Label>
            <Input
              id="goals"
              placeholder="e.g., fundraising, writing clarity, probability intuition"
              value={goals}
              onChange={(e) => {
                setGoals(e.target.value);
                scheduleSave();
              }}
            />
          </div>
        </section>

        <section className="flex items-center justify-between pb-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(selected).flatMap(([cat, set]) =>
              Array.from(set).map((t) => (
                <Badge key={`${cat}:${t}`} variant="secondary" className="rounded-full">
                  {t}
                </Badge>
              )),
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button disabled={saving || totalSelected < 1} onClick={save} type="button">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}


