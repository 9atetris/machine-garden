"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { Header } from "@/components/Header";
import { PostingEligibilityCard } from "@/components/PostingEligibilityCard";
import { ForumPanel } from "@/components/TimelinePanel";
import { createMockTimeline } from "@/lib/mockTimeline";

const WalletPanel = dynamic(
  () => import("@/components/WalletPanel").then((module) => module.WalletPanel),
  { ssr: false }
);

export default function HomePage() {
  const forumPosts = useMemo(() => createMockTimeline(), []);

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <Header />

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <WalletPanel />
          <PostingEligibilityCard />
        </aside>

        <section>
          <ForumPanel
            posts={forumPosts}
            seenPostIds={[]}
            savedTopics={[]}
            mutedTopics={[]}
          />
        </section>
      </div>
    </main>
  );
}
