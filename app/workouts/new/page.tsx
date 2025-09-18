"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

const MILLISECONDS_PER_MINUTE = 60_000;
const SECONDS_PER_MINUTE = 60;
const DEFAULT_DURATION_MINUTES = 60;
const DEFAULT_CYCLING_RPE = 5;
const DEFAULT_STRENGTH_RPE = 6;
const MIN_DURATION_MINUTES = 1;
const MIN_RPE = 1;
const MAX_RPE = 10;
const MIN_HEART_RATE = 30;
const MAX_HEART_RATE = 240;
const WEIGHT_STEP_KILOGRAM = 0.5;
const NON_NEGATIVE_VALUE = 0;
const DEFAULT_EXERCISE_NAME = "スクワット";
const DEFAULT_WEIGHT_SUGGESTION = "100";
const DEFAULT_REPS_SUGGESTION = "5";
const MIN_REPETITIONS = 1;
const RANDOM_BASE = 36;
const RANDOM_SLICE_INDEX = 2;
const DATETIME_LOCAL_LENGTH = 16;
const STRENGTH_TEMPLATE_STORAGE_KEY =
  "cycle-strength-logger:last-strength-template";

type StrengthSetForm = {
  id: string;
  weightKg: string;
  reps: string;
};

type StrengthExerciseForm = {
  id: string;
  name: string;
  sets: StrengthSetForm[];
};

type StoredStrengthTemplate = {
  perceivedEffort?: string;
  exercises: Array<{
    id?: string;
    name?: string;
    sets: Array<{
      id?: string;
      weightKg?: string;
      reps?: string;
    }>;
  }>;
};

function isStoredStrengthTemplate(
  value: unknown
): value is StoredStrengthTemplate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("exercises" in value)) {
    return false;
  }

  const exercises = (value as { exercises: unknown }).exercises;
  if (!Array.isArray(exercises)) {
    return false;
  }

  return exercises.every((exercise) => {
    if (typeof exercise !== "object" || exercise === null) {
      return false;
    }

    if (!("sets" in exercise)) {
      return false;
    }

    const sets = (exercise as { sets: unknown }).sets;
    if (!Array.isArray(sets)) {
      return false;
    }

    return sets.every((set) => typeof set === "object" && set !== null);
  });
}

function generateId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return Math.random().toString(RANDOM_BASE).slice(RANDOM_SLICE_INDEX);
}

function defaultDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localTime = new Date(now.getTime() - offset * MILLISECONDS_PER_MINUTE);
  return localTime.toISOString().slice(0, DATETIME_LOCAL_LENGTH);
}

function toTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFloatOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function NewWorkoutPage() {
  const profile = useQuery(api.users.getCurrentProfile);
  const isAuthLoading = profile === undefined;
  const isAuthenticated = profile != null;
  const createCyclingWorkout = useMutation(api.workouts.createCyclingWorkout);
  const createStrengthWorkout = useMutation(api.workouts.createStrengthWorkout);

  const [cyclingForm, setCyclingForm] = useState({
    performedAt: defaultDateTimeLocal(),
    durationMinutes: DEFAULT_DURATION_MINUTES.toString(),
    avgPower: "",
    avgHeartRate: "",
    elevationGain: "",
    perceivedEffort: DEFAULT_CYCLING_RPE.toString(),
    memo: "",
  });

  const [strengthForm, setStrengthForm] = useState({
    performedAt: defaultDateTimeLocal(),
    durationMinutes: DEFAULT_DURATION_MINUTES.toString(),
    perceivedEffort: DEFAULT_STRENGTH_RPE.toString(),
    memo: "",
    exercises: [
      {
        id: generateId(),
        name: DEFAULT_EXERCISE_NAME,
        sets: [
          {
            id: generateId(),
            weightKg: DEFAULT_WEIGHT_SUGGESTION,
            reps: DEFAULT_REPS_SUGGESTION,
          },
        ],
      },
    ] as StrengthExerciseForm[],
  });

  const [cyclingStatus, setCyclingStatus] = useState<string | null>(null);
  const [strengthStatus, setStrengthStatus] = useState<string | null>(null);

  const isSubmitting =
    cyclingStatus === "submitting" || strengthStatus === "submitting";

  const disabledMessage = (() => {
    if (isAuthLoading) {
      return "サインイン状態を確認しています…";
    }

    if (!isAuthenticated) {
      return "サインインするとワークアウトを記録できるようになります";
    }

    return null;
  })();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STRENGTH_TEMPLATE_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!isStoredStrengthTemplate(parsed)) {
        return;
      }

      const template = parsed;

      const exercises = template.exercises.map((exercise) => ({
        id: exercise.id ?? generateId(),
        name: exercise.name ?? "",
        sets: exercise.sets.map((set) => ({
          id: set.id ?? generateId(),
          weightKg: set.weightKg ?? "",
          reps: set.reps ?? "",
        })),
      }));

      if (exercises.length === 0) {
        return;
      }

      setStrengthForm((current) => ({
        ...current,
        perceivedEffort: template.perceivedEffort ?? current.perceivedEffort,
        exercises,
      }));
    } catch (_error) {
      // 無効なテンプレートは無視してデフォルト値を使用する。
    }
  }, []);

  const handleCyclingSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!isAuthenticated || isAuthLoading) {
      setCyclingStatus(disabledMessage);
      return;
    }

    const timestamp = toTimestamp(cyclingForm.performedAt);
    const durationMinutes = parseFloatOrNull(cyclingForm.durationMinutes);

    if (timestamp === null || durationMinutes === null) {
      setCyclingStatus("日付と時間、継続時間は必須です");
      return;
    }

    setCyclingStatus("submitting");

    try {
      await createCyclingWorkout({
        performedAt: timestamp,
        durationSeconds: Math.round(durationMinutes * SECONDS_PER_MINUTE),
        avgPower: parseFloatOrNull(cyclingForm.avgPower) ?? undefined,
        avgHeartRate: parseFloatOrNull(cyclingForm.avgHeartRate) ?? undefined,
        elevationGain: parseFloatOrNull(cyclingForm.elevationGain) ?? undefined,
        perceivedEffort:
          parseFloatOrNull(cyclingForm.perceivedEffort) ?? undefined,
        memo: cyclingForm.memo.trim() || undefined,
      });

      setCyclingStatus("サイクリングの記録を保存しました");
      setCyclingForm((current) => ({
        ...current,
        memo: "",
      }));
    } catch (_error) {
      setCyclingStatus("保存に失敗しました。数秒後に再度お試しください。");
    }
  };

  const handleStrengthSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!isAuthenticated || isAuthLoading) {
      setStrengthStatus(disabledMessage);
      return;
    }

    const timestamp = toTimestamp(strengthForm.performedAt);
    const durationMinutes = parseFloatOrNull(strengthForm.durationMinutes);

    if (timestamp === null || durationMinutes === null) {
      setStrengthStatus("日付と時間、継続時間は必須です");
      return;
    }

    const exercises = strengthForm.exercises
      .map((exercise) => {
        const trimmedName = exercise.name.trim();
        const sets = exercise.sets
          .map((set) => {
            const reps = parseIntOrNull(set.reps);
            if (reps == null) {
              return null;
            }

            return {
              weightKg: parseFloatOrNull(set.weightKg) ?? undefined,
              reps,
            };
          })
          .filter(
            (set): set is { weightKg: number | undefined; reps: number } =>
              set !== null
          );

        return {
          name: trimmedName,
          sets,
        };
      })
      .filter(
        (exercise) => exercise.name.length > 0 && exercise.sets.length > 0
      );

    if (exercises.length === 0) {
      setStrengthStatus("少なくとも1種目と1セットを入力してください");
      return;
    }

    setStrengthStatus("submitting");

    try {
      await createStrengthWorkout({
        performedAt: timestamp,
        durationSeconds: Math.round(durationMinutes * SECONDS_PER_MINUTE),
        perceivedEffort:
          parseFloatOrNull(strengthForm.perceivedEffort) ?? undefined,
        memo: strengthForm.memo.trim() || undefined,
        exercises,
      });

      setStrengthStatus("筋力トレーニングの記録を保存しました");

      if (typeof window !== "undefined") {
        const templateToStore = {
          perceivedEffort: strengthForm.perceivedEffort,
          exercises: strengthForm.exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            sets: exercise.sets.map((set) => ({
              id: set.id,
              weightKg: set.weightKg,
              reps: set.reps,
            })),
          })),
        } satisfies Pick<typeof strengthForm, "perceivedEffort" | "exercises">;

        window.localStorage.setItem(
          STRENGTH_TEMPLATE_STORAGE_KEY,
          JSON.stringify(templateToStore)
        );
      }
    } catch (_error) {
      setStrengthStatus("保存に失敗しました。数秒後に再度お試しください。");
    }
  };

  const updateExercise = (
    index: number,
    updater: (exercise: StrengthExerciseForm) => StrengthExerciseForm
  ) => {
    setStrengthForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index
          ? updater({
              ...exercise,
              sets: exercise.sets.map((set) => ({ ...set })),
            })
          : exercise
      ),
    }));
  };

  const addExercise = () => {
    setStrengthForm((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: generateId(),
          name: "",
          sets: [
            {
              id: generateId(),
              weightKg: "",
              reps: "",
            },
          ],
        },
      ],
    }));
  };

  const addSet = (exerciseIndex: number) => {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: [
        ...exercise.sets,
        {
          id: generateId(),
          weightKg: exercise.sets.at(-1)?.weightKg ?? "",
          reps: exercise.sets.at(-1)?.reps ?? "",
        },
      ],
    }));
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: exercise.sets.filter((_, index) => index !== setIndex),
    }));
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Cycle & Strength Logger
          </p>
          <h1 className="mt-1 font-semibold text-2xl text-slate-900">
            ワークアウトを記録
          </h1>
          <p className="mt-2 text-slate-600 text-sm">
            Convex Mutation
            と接続済みのフォームです。記録はリアルタイムでダッシュボードに反映されます。
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 text-sm hover:border-slate-400 hover:text-slate-900"
          href="/"
        >
          ダッシュボードへ戻る
        </Link>
      </header>

      {isAuthLoading || isAuthenticated ? null : (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-sm">
          {disabledMessage}
        </p>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <form
          className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleCyclingSubmit}
        >
          <h2 className="font-semibold text-base text-slate-900">
            サイクリング
          </h2>
          <p className="text-slate-600 text-sm">
            平均パワーや平均心拍などの指標を入力できます。サインイン済みであれば送信ボタンが有効化されます。
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">実施日時</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
              onChange={(event) =>
                setCyclingForm((current) => ({
                  ...current,
                  performedAt: event.target.value,
                }))
              }
              required
              type="datetime-local"
              value={cyclingForm.performedAt}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">継続時間 (分)</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
              min={MIN_DURATION_MINUTES}
              onChange={(event) =>
                setCyclingForm((current) => ({
                  ...current,
                  durationMinutes: event.target.value,
                }))
              }
              required
              type="number"
              value={cyclingForm.durationMinutes}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-800">平均心拍 (bpm)</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
                max={MAX_HEART_RATE}
                min={MIN_HEART_RATE}
                onChange={(event) =>
                  setCyclingForm((current) => ({
                    ...current,
                    avgHeartRate: event.target.value,
                  }))
                }
                type="number"
                value={cyclingForm.avgHeartRate}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-800">平均パワー (W)</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
                min={NON_NEGATIVE_VALUE}
                onChange={(event) =>
                  setCyclingForm((current) => ({
                    ...current,
                    avgPower: event.target.value,
                  }))
                }
                type="number"
                value={cyclingForm.avgPower}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-800">獲得標高 (m)</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
                min={NON_NEGATIVE_VALUE}
                onChange={(event) =>
                  setCyclingForm((current) => ({
                    ...current,
                    elevationGain: event.target.value,
                  }))
                }
                type="number"
                value={cyclingForm.elevationGain}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">
              主観的運動強度 (RPE)
            </span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
              max={MAX_RPE}
              min={MIN_RPE}
              onChange={(event) =>
                setCyclingForm((current) => ({
                  ...current,
                  perceivedEffort: event.target.value,
                }))
              }
              type="number"
              value={cyclingForm.perceivedEffort}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">メモ</span>
            <textarea
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-500 focus:outline-none"
              onChange={(event) =>
                setCyclingForm((current) => ({
                  ...current,
                  memo: event.target.value,
                }))
              }
              placeholder="風向き、コンディションなどをメモ"
              rows={3}
              value={cyclingForm.memo}
            />
          </label>
          <button
            className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 font-medium text-sm text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isAuthenticated || isAuthLoading || isSubmitting}
            type="submit"
          >
            サイクリングを保存
          </button>
          {cyclingStatus && cyclingStatus !== "submitting" ? (
            <p className="text-slate-500 text-sm">{cyclingStatus}</p>
          ) : null}
        </form>

        <form
          className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleStrengthSubmit}
        >
          <h2 className="font-semibold text-base text-slate-900">
            筋力トレーニング
          </h2>
          <p className="text-slate-600 text-sm">
            種目ごとに複数セットを記録できます。重量が無い場合は空欄のままでも問題ありません。
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">実施日時</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
              onChange={(event) =>
                setStrengthForm((current) => ({
                  ...current,
                  performedAt: event.target.value,
                }))
              }
              required
              type="datetime-local"
              value={strengthForm.performedAt}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">継続時間 (分)</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
              min={MIN_DURATION_MINUTES}
              onChange={(event) =>
                setStrengthForm((current) => ({
                  ...current,
                  durationMinutes: event.target.value,
                }))
              }
              required
              type="number"
              value={strengthForm.durationMinutes}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">
              主観的運動強度 (RPE)
            </span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
              max={MAX_RPE}
              min={MIN_RPE}
              onChange={(event) =>
                setStrengthForm((current) => ({
                  ...current,
                  perceivedEffort: event.target.value,
                }))
              }
              type="number"
              value={strengthForm.perceivedEffort}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">メモ</span>
            <textarea
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-slate-500 focus:outline-none"
              onChange={(event) =>
                setStrengthForm((current) => ({
                  ...current,
                  memo: event.target.value,
                }))
              }
              placeholder="フォームの気づきや疲労具合など"
              rows={3}
              value={strengthForm.memo}
            />
          </label>
          <div className="flex flex-col gap-4">
            {strengthForm.exercises.map((exercise, exerciseIndex) => (
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                key={exercise.id}
              >
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-800">種目名</span>
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
                    onChange={(event) =>
                      updateExercise(exerciseIndex, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="デッドリフト"
                    value={exercise.name}
                  />
                </label>
                <div className="mt-3 flex flex-col gap-3">
                  {exercise.sets.map((set, setIndex) => (
                    <div className="grid gap-3 sm:grid-cols-3" key={set.id}>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-slate-800">
                          重量 (kg)
                        </span>
                        <input
                          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
                          min={NON_NEGATIVE_VALUE}
                          onChange={(event) =>
                            updateExercise(exerciseIndex, (current) => ({
                              ...current,
                              sets: current.sets.map((setItem, index) =>
                                index === setIndex
                                  ? { ...setItem, weightKg: event.target.value }
                                  : setItem
                              ),
                            }))
                          }
                          step={WEIGHT_STEP_KILOGRAM}
                          type="number"
                          value={set.weightKg}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-slate-800">回数</span>
                        <input
                          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
                          min={MIN_REPETITIONS}
                          onChange={(event) =>
                            updateExercise(exerciseIndex, (current) => ({
                              ...current,
                              sets: current.sets.map((setItem, index) =>
                                index === setIndex
                                  ? { ...setItem, reps: event.target.value }
                                  : setItem
                              ),
                            }))
                          }
                          required
                          type="number"
                          value={set.reps}
                        />
                      </label>
                      <div className="flex items-end justify-end">
                        {exercise.sets.length > 1 ? (
                          <button
                            className="font-medium text-slate-500 text-xs hover:text-slate-800"
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                            type="button"
                          >
                            セット削除
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <button
                    className="self-start font-medium text-slate-500 text-xs hover:text-slate-800"
                    onClick={() => addSet(exerciseIndex)}
                    type="button"
                  >
                    セットを追加
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-2 font-medium text-slate-700 text-sm hover:border-slate-400 hover:text-slate-900"
            onClick={addExercise}
            type="button"
          >
            種目を追加
          </button>
          <button
            className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 font-medium text-sm text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isAuthenticated || isAuthLoading || isSubmitting}
            type="submit"
          >
            筋力トレーニングを保存
          </button>
          {strengthStatus && strengthStatus !== "submitting" ? (
            <p className="text-slate-500 text-sm">{strengthStatus}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
