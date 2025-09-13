'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { INTERESTS, type InterestCategory } from '@/lib/onboarding/interests';

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => ({}));
  const [goals, setGoals] = useState<string>('');
  const [timeBudget, setTimeBudget] = useState<number>(30);
  const [saving, setSaving] = useState(false);

  const totalSelected = useMemo(
    () => Object.values(selected).reduce((acc, set) => acc + set.size, 0),
    [selected],
  );

  useEffect(() => {
    const cached = localStorage.getItem('onboarding:selected');
    const cachedGoals = localStorage.getItem('onboarding:goals');
    const cachedTime = localStorage.getItem('onboarding:time');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Record<string, string[]>;
        const mapped: Record<string, Set<string>> = {};
        Object.entries(parsed).forEach(([k, arr]) => (mapped[k] = new Set(arr)));
        setSelected(mapped);
      } catch { }
    }
    if (cachedGoals) setGoals(cachedGoals);
    if (cachedTime) setTimeBudget(Number(cachedTime));
  }, []);

  useEffect(() => {
    const json: Record<string, string[]> = {};
    Object.entries(selected).forEach(([k, set]) => (json[k] = Array.from(set)));
    localStorage.setItem('onboarding:selected', JSON.stringify(json));
  }, [selected]);

  function toggle(category: string, topic: string) {
    setSelected((prev) => {
      const current = new Set(prev[category] ?? []);
      if (current.has(topic)) current.delete(topic);
      else current.add(topic);
      return { ...prev, [category]: current };
    });
  }

  function next() {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  }

  async function finish() {
    console.log('Finish function called');
    setSaving(true);
    try {
      const interests = Object.entries(selected)
        .map(([category, set]) => ({ category, topics: Array.from(set) }))
        .filter((c) => c.topics.length > 0);
      const goalsArray = goals
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      const payload = {
        interests,
        goals: goalsArray,
        timeBudgetMins: timeBudget
      };

      console.log('Sending profile data:', payload);

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.log('Profile saved successfully, verifying profile before redirect');
        // Remove client caches immediately
        localStorage.removeItem('onboarding:selected');
        localStorage.removeItem('onboarding:goals');
        localStorage.removeItem('onboarding:time');

        // Poll the profile endpoint to ensure the server recognizes onboardingCompleted
        let verified = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            const verifyRes = await fetch('/api/profile', { cache: 'no-store', credentials: 'include' });
            if (verifyRes.ok) {
              const profile = await verifyRes.json();
              console.log('Profile verification attempt', attempt + 1, profile);
              if (profile && profile.onboardingCompleted) {
                verified = true;
                break;
              }
            } else {
              console.warn('Profile verification failed with status', verifyRes.status);
            }
          } catch (e) {
            console.warn('Profile verification error', e);
          }
          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
          await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
        }

        if (!verified) {
          console.warn('Profile not verified after polling; proceeding with navigation');
        }

        // Use a full page navigation to avoid any SPA navigation issues on Safari
        window.location.replace('/');
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Profile save failed:', res.status, errorData);

        if (errorData.code === 'TABLE_NOT_EXISTS') {
          alert('Database is still setting up. Please wait a moment and try again.');
        } else {
          alert('Failed to save profile. Please try again.');
        }
      }
    } catch (e) {
      console.error('Profile save error:', e);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between pt-5">
          <div className="text-2xl font-semibold">Polymatic setup</div>
          <div className="h-2 w-32 bg-muted rounded">
            <div
              className="h-2 bg-foreground rounded"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Already a lifelong learner?{' '}
            <Link
              href="/login"
              className="font-medium underline underline-offset-4 hover:text-foreground"
            >
              Log in here
            </Link>
          </p>
        </div>

        {step === 1 && (
          <section className="flex flex-col gap-4">
            <div className="text-lg text-muted-foreground">
              Pick at least 3 topics you enjoy. I’ll tailor sessions to these. Don’t worry—you can always change these later.
            </div>
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
            <div className="flex items-center justify-between py-2">
              <div className="text-sm text-muted-foreground">{totalSelected} selected (min 3)</div>
              <Button disabled={totalSelected < 3} onClick={next}>
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-4">
            <div className="text-lg text-muted-foreground">Time budget and goals</div>
            <div className="flex gap-2">
              {[20, 30, 40].map((mins) => (
                <Button
                  key={mins}
                  variant={timeBudget === mins ? 'default' : 'outline'}
                  onClick={() => {
                    setTimeBudget(mins);
                    localStorage.setItem('onboarding:time', String(mins));
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
                  localStorage.setItem('onboarding:goals', e.target.value);
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={next}>Continue</Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="flex flex-col gap-4">
            <div className="text-lg text-muted-foreground">Ready! Save your preferences.</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(selected).flatMap(([cat, set]) =>
                Array.from(set).map((t) => (
                  <Badge key={`${cat}:${t}`} variant="secondary" className="rounded-full">
                    {t}
                  </Badge>
                )),
              )}
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={saving} onClick={finish} type="button">
                {saving ? 'Saving…' : 'Start learning'}
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


