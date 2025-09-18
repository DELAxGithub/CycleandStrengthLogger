"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { EnrichedWorkout } from "@/convex/workouts";

type StrengthWorkout = Extract<EnrichedWorkout, { type: "strength" }>;

type CyclingWorkout = Extract<EnrichedWorkout, { type: "cycling" }>;

type AnalysisSummary = {
  totalWorkouts: number;
  totalDurationMinutes: number;
  totalStrengthSets: number;
  averagePower: number | null;
  averageHeartRate: number | null;
  wattsPerHeartRate: number | null;
};

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}分`;
  }

  if (minutes === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${minutes}分`;
}

function formatCyclingSummary(workout: CyclingWorkout) {
  const parts = [formatDuration(workout.durationSeconds)];

  if (typeof workout.avgPower === "number") {
    parts.push(`${Math.round(workout.avgPower)} W`);
  }

  if (typeof workout.avgHeartRate === "number") {
    parts.push(`${Math.round(workout.avgHeartRate)} bpm`);
  }

  if (typeof workout.perceivedEffort === "number") {
    parts.push(`RPE ${workout.perceivedEffort}`);
  }

  return parts.join(" · ");
}

function formatStrengthSummary(workout: StrengthWorkout) {
  const exerciseCount = new Set(
    workout.strengthSets.map(
      (set: StrengthWorkout["strengthSets"][number]) => set.exerciseName
    )
  ).size;
  const totalSets = workout.strengthSets.length;

  let topSet: number | null = null;
  for (const set of workout.strengthSets) {
    if (
      typeof set.weightKg === "number" &&
      (topSet === null || topSet < set.weightKg)
    ) {
      topSet = set.weightKg;
    }
  }

  const parts = [
    formatDuration(workout.durationSeconds),
    `${exerciseCount}種目`,
    `${totalSets}セット`,
  ];

  if (topSet !== null) {
    parts.push(`最大 ${topSet.toFixed(1)} kg`);
  }

  if (typeof workout.perceivedEffort === "number") {
    parts.push(`RPE ${workout.perceivedEffort}`);
  }

  return parts.join(" · ");
}

function buildAnalysis(workouts: EnrichedWorkout[]): AnalysisSummary {
  let totalWorkouts = 0;
  let totalDurationMinutes = 0;
  let totalStrengthSets = 0;
  let totalPower = 0;
  let powerSamples = 0;
  let totalHeartRate = 0;
  let heartRateSamples = 0;

  for (const workout of workouts) {
    totalWorkouts += 1;
    totalDurationMinutes += Math.round(workout.durationSeconds / 60);

    if (workout.type === "strength") {
      totalStrengthSets += workout.strengthSets.length;
    }

    if (workout.type === "cycling") {
      if (typeof workout.avgPower === "number") {
        totalPower += workout.avgPower;
        powerSamples += 1;
      }

      if (typeof workout.avgHeartRate === "number") {
        totalHeartRate += workout.avgHeartRate;
        heartRateSamples += 1;
      }
    }
  }

  const averagePower =
    powerSamples > 0 ? Math.round(totalPower / powerSamples) : null;
  const averageHeartRate =
    heartRateSamples > 0 ? Math.round(totalHeartRate / heartRateSamples) : null;
  const wattsPerHeartRate =
    averagePower != null && averageHeartRate != null && averageHeartRate > 0
      ? Number((averagePower / averageHeartRate).toFixed(2))
      : null;

  return {
    totalWorkouts,
    totalDurationMinutes,
    totalStrengthSets,
    averagePower,
    averageHeartRate,
    wattsPerHeartRate,
  };
}

export default function HomePage() {
  const { signIn, signOut } = useAuthActions();
  const profile = useQuery(api.users.getCurrentProfile);
  const workouts = useQuery(api.workouts.listRecent, { limit: 12 });
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const isAuthLoading = profile === undefined;
  const isAuthenticated = profile != null;
  const derivedWorkouts = (workouts ?? []) as EnrichedWorkout[];

  const analysis = useMemo(
    () => buildAnalysis(derivedWorkouts),
    [derivedWorkouts]
  );

  const headerTitle = profile?.displayName
    ? `${profile.displayName} さんのダッシュボード`
    : "Cycle & Strength Logger";

  const handleSignIn = async (provider: "google" | "apple" | "anonymous") => {
    try {
      setAuthMessage(null);
      await signIn(provider);
    } catch (_error) {
      if (provider === "anonymous") {
        setAuthMessage("匿名ログインに失敗しました。再度お試しください。");
        return;
      }

      setAuthMessage(
        provider === "google"
          ? "Googleでのサインインに失敗しました。環境変数の設定を確認してください。"
          : "Appleでのサインインに失敗しました。環境変数の設定を確認してください。"
      );
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthMessage(null);
      await signOut();
    } catch (_error) {
      setAuthMessage(
        "サインアウト中に問題が発生しました。数秒後に再度お試しください。"
      );
    }
  };

  const firstStrengthWorkout = derivedWorkouts.find(
    (workout): workout is StrengthWorkout => workout?.type === "strength"
  );

  const firstCyclingWorkout = derivedWorkouts.find(
    (workout): workout is CyclingWorkout => workout?.type === "cycling"
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">
              Cycle & Strength Logger
            </p>
            <h1 className="font-semibold text-3xl text-slate-900">
              {headerTitle}
            </h1>
            <p className="text-slate-600 text-sm">
              サイクリングと筋力トレーニングを一元管理し、リアルタイムで分析します。
              Convex + Next.js + Ultracite のワークフローで構築中です。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            {(() => {
              if (isAuthLoading) {
                return (
                  <span className="text-slate-500 text-xs">
                    サインイン状態を確認しています…
                  </span>
                );
              }

              if (isAuthenticated) {
                return (
                  <>
                    <button
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 text-sm hover:border-slate-400 hover:text-slate-900"
                      onClick={handleSignOut}
                      type="button"
                    >
                      サインアウト
                    </button>
                    {profile?.email ? (
                      <span className="text-slate-500 text-xs">
                        {profile.email}
                      </span>
                    ) : null}
                  </>
                );
              }

              return (
                <div className="flex flex-col items-end gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 text-sm transition hover:border-slate-400 hover:text-slate-900"
                    onClick={() => handleSignIn("anonymous")}
                    type="button"
                  >
                    匿名でサインイン
                  </button>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-slate-400 text-xs">
                    <button
                      className="rounded-full border border-slate-300 px-3 py-1 hover:border-slate-400 hover:text-slate-900"
                      onClick={() => handleSignIn("google")}
                      type="button"
                    >
                      Googleで試す
                    </button>
                    <button
                      className="rounded-full border border-slate-300 px-3 py-1 hover:border-slate-400 hover:text-slate-900"
                      onClick={() => handleSignIn("apple")}
                      type="button"
                    >
                      Appleで試す
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        {authMessage ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-xs">
            {authMessage}
          </p>
        ) : null}
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-base text-slate-900">
            オンボーディング
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            初回ログイン後はプロフィールで表示名とトレーニングのフォーカスを設定しましょう。
            Convex Auth でセッション管理を行い、ユーザー情報は Convex
            テーブルに保存されます。
          </p>
          <Link
            className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 font-medium text-sm text-white transition hover:bg-slate-700"
            href="/profile"
          >
            プロフィール設定へ
          </Link>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
          <h2 className="font-semibold text-base text-slate-900">
            クイックログ
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            Cycling と Strength の専用フォームを用意しました。Convex Mutation
            を通じて リアルタイムでワークアウトを保存します。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 text-sm transition hover:border-slate-400 hover:text-slate-900"
              href="/workouts/new?type=cycling"
            >
              サイクリングを記録
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 text-sm transition hover:border-slate-400 hover:text-slate-900"
              href="/workouts/new?type=strength"
            >
              筋トレを記録
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base text-slate-900">
              直近のワークアウト
            </h2>
            <span className="font-medium text-slate-500 text-xs uppercase tracking-wide">
              Convex Query
            </span>
          </div>
          <p className="mt-2 text-slate-600 text-sm">
            `workouts.listRecent` を `useQuery` で購読し、最新 12
            件を表示しています。 サインイン前は空のリストが返ります。
          </p>
          <div className="mt-4 space-y-3">
            {workouts === undefined && (
              <div className="animate-pulse rounded-lg border border-slate-100 bg-slate-50 px-4 py-6 text-slate-400 text-sm">
                データを取得しています…
              </div>
            )}
            {workouts !== undefined && derivedWorkouts.length === 0 && (
              <div className="rounded-lg border border-slate-200 border-dashed bg-slate-50 px-4 py-6 text-center text-slate-500 text-sm">
                まだワークアウトが登録されていません。まずは1件記録してみましょう。
              </div>
            )}
            {workouts !== undefined &&
              derivedWorkouts.length > 0 &&
              derivedWorkouts.map((workout) => (
                <div
                  className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  key={workout._id}
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-slate-900 text-sm">
                      {formatDateTime(workout.performedAt)}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {workout.type === "cycling"
                        ? formatCyclingSummary(workout as CyclingWorkout)
                        : formatStrengthSummary(workout as StrengthWorkout)}
                    </p>
                    {workout.memo ? (
                      <p className="text-slate-400 text-xs">{workout.memo}</p>
                    ) : null}
                  </div>
                  <span className="self-start rounded-full bg-slate-900 px-3 py-1 font-semibold text-white text-xs uppercase tracking-wide md:self-center">
                    {workout.type === "cycling" ? "Cycling" : "Strength"}
                  </span>
                </div>
              ))}
          </div>
        </article>

        <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-base text-slate-900">
            分析サマリー
          </h2>
          <p className="text-slate-600 text-sm">
            Convex
            の集計ロジックをこれから実装予定です。暫定的にダッシュボードで
            合計値を算出しています。
          </p>
          <dl className="grid gap-3 text-slate-600 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="font-medium text-slate-700">
                記録済みワークアウト
              </dt>
              <dd className="font-semibold text-base text-slate-900">
                {analysis.totalWorkouts}件
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="font-medium text-slate-700">
                合計トレーニング時間
              </dt>
              <dd className="font-semibold text-base text-slate-900">
                {analysis.totalDurationMinutes}分
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="font-medium text-slate-700">平均パワー</dt>
              <dd className="font-semibold text-base text-slate-900">
                {analysis.averagePower != null
                  ? `${analysis.averagePower} W`
                  : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="font-medium text-slate-700">平均心拍</dt>
              <dd className="font-semibold text-base text-slate-900">
                {analysis.averageHeartRate != null
                  ? `${analysis.averageHeartRate} bpm`
                  : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="font-medium text-slate-700">平均W／HR</dt>
              <dd className="font-semibold text-base text-slate-900">
                {analysis.wattsPerHeartRate != null
                  ? `${analysis.wattsPerHeartRate} W/bpm`
                  : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="font-medium text-slate-700">筋トレセット数</dt>
              <dd className="font-semibold text-base text-slate-900">
                {analysis.totalStrengthSets} セット
              </dd>
            </div>
          </dl>
          <div className="rounded-lg border border-slate-200 border-dashed px-4 py-3 text-slate-500 text-xs">
            <p>予定:</p>
            <ul className="mt-1 list-disc pl-4">
              <li>週次サマリー・月次サマリー</li>
              <li>パワーゾーン別のサイクリング分析</li>
              <li>種目別のトップセット推移</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-slate-500 text-xs">
            <p className="font-semibold text-slate-700">最新のサンプル</p>
            <ul className="mt-2 space-y-2">
              {firstCyclingWorkout ? (
                <li>
                  🚴 {formatDateTime(firstCyclingWorkout.performedAt)} —{" "}
                  {formatCyclingSummary(firstCyclingWorkout)}
                </li>
              ) : null}
              {firstStrengthWorkout ? (
                <li>
                  🏋️ {formatDateTime(firstStrengthWorkout.performedAt)} —{" "}
                  {formatStrengthSummary(firstStrengthWorkout)}
                </li>
              ) : null}
              {firstCyclingWorkout || firstStrengthWorkout ? null : (
                <li>サンプルがありません。</li>
              )}
            </ul>
          </div>
        </article>
      </section>
    </main>
  );
}
