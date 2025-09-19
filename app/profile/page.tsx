"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export default function ProfilePage() {
  if (!CONVEX_URL) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="font-semibold text-2xl text-slate-900">
          Convex の設定が必要です
        </h1>
        <p className="text-slate-600 text-sm">
          この画面を利用するには `NEXT_PUBLIC_CONVEX_URL`
          などの環境変数を設定し、 Convex
          クライアントを有効化してください。設定後に再度ビルドすると、このページが有効になります。
        </p>
      </main>
    );
  }

  return <ProfilePageContent />;
}

function ProfilePageContent() {
  const profile = useQuery(api.users.getCurrentProfile);
  const isAuthLoading = profile === undefined;
  const isAuthenticated = profile != null;
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [form, setForm] = useState({
    displayName: "",
    trainingFocus: "",
  });
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName ?? "",
        trainingFocus: profile.trainingFocus ?? "",
      });
    }
  }, [profile]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isAuthLoading) {
      setStatus("サインイン状態を確認しています…");
      return;
    }

    if (!isAuthenticated) {
      setStatus("サインイン後にプロフィールを更新できます");
      return;
    }

    if (!form.displayName.trim()) {
      setStatus("表示名は必須です");
      return;
    }

    setStatus("更新中…");

    try {
      await completeOnboarding({
        displayName: form.displayName.trim(),
        trainingFocus: form.trainingFocus.trim() || undefined,
      });
      setStatus("プロフィールを更新しました");
    } catch (_error) {
      setStatus("更新に失敗しました。数秒後に再度お試しください。");
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Cycle & Strength Logger
          </p>
          <h1 className="mt-1 font-semibold text-2xl text-slate-900">
            プロフィール設定
          </h1>
          <p className="mt-2 text-slate-600 text-sm">
            Convex Auth
            で管理されるユーザードキュメントに表示名やトレーニングのフォーカスを保存します。
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 text-sm hover:border-slate-400 hover:text-slate-900"
          href="/"
        >
          ダッシュボードへ戻る
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">表示名</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
              maxLength={50}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              placeholder="例: DELA"
              required
              value={form.displayName}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">
              トレーニングのフォーカス
            </span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
              maxLength={70}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  trainingFocus: event.target.value,
                }))
              }
              placeholder="例: 週2回の下半身メニュー / Z2ロングライド"
              value={form.trainingFocus}
            />
          </label>

          {profile?.email ? (
            <p className="text-slate-500 text-xs">
              サインイン中のメールアドレス: {profile.email}
            </p>
          ) : null}

          <button
            className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 font-medium text-sm text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isAuthenticated || isAuthLoading}
            type="submit"
          >
            プロフィールを保存
          </button>
          {status ? <p className="text-slate-500 text-sm">{status}</p> : null}
        </form>
      </section>
    </main>
  );
}
