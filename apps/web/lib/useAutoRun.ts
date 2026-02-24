"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getNextCycle } from "@/lib/agentClient";
import { applyCycleOutput } from "@/lib/reducer";
import type { SocialAgentState, SocialPolicy, TimelinePost } from "@/lib/types";
import { createInitialSocialAgentState } from "@/lib/utils";

const AUTO_RUN_INTERVAL_MS = 800;

type CycleTrigger = "auto" | "manual";

export function useAutoRun() {
  const [state, setState] = useState<SocialAgentState>(() => createInitialSocialAgentState());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const runCycle = useCallback(async (trigger: CycleTrigger) => {
    if (inFlightRef.current) {
      return;
    }

    const snapshot = stateRef.current;
    if (snapshot.status === "finished" || snapshot.status === "error") {
      return;
    }

    if (trigger === "manual" && snapshot.status === "running") {
      return;
    }

    inFlightRef.current = true;
    try {
      const plannerResult = await getNextCycle(snapshot);
      const cycle = plannerResult.warning
        ? {
            ...plannerResult.cycle,
            resultPreview: `${plannerResult.cycle.resultPreview} (fallback: ${plannerResult.warning})`
          }
        : plannerResult.cycle;

      setState((prev) => {
        if (trigger === "auto" && prev.status !== "running") {
          return prev;
        }

        return applyCycleOutput(prev, cycle, {
          plannerSource: plannerResult.source,
          latencyMs: plannerResult.latencyMs
        });
      });
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const startAutoRun = useCallback(() => {
    setState((prev) => {
      if (prev.status === "running") {
        return prev;
      }

      if (prev.status === "finished" || prev.status === "error") {
        return prev;
      }

      return {
        ...prev,
        status: "running",
        endReason: undefined
      };
    });
  }, []);

  const stopAutoRun = useCallback(() => {
    stopInterval();
    setState((prev) => {
      if (prev.status === "running") {
        return {
          ...prev,
          status: "stopped",
          endReason: "manual_stop"
        };
      }
      return prev;
    });
  }, [stopInterval]);

  const stepOnce = useCallback(() => {
    setState((prev) => {
      if (prev.status === "running") {
        return prev;
      }

      return {
        ...prev,
        endReason: undefined
      };
    });

    void runCycle("manual");
  }, [runCycle]);

  const resetRun = useCallback(() => {
    stopInterval();
    setState((prev) => createInitialSocialAgentState({ policy: prev.policy }));
  }, [stopInterval]);

  const updatePolicy = useCallback((partialPolicy: Partial<SocialPolicy>) => {
    setState((prev) => ({
      ...prev,
      policy: {
        ...prev.policy,
        ...partialPolicy
      }
    }));
  }, []);

  const approveDraft = useCallback((draftId: string) => {
    setState((prev) => ({
      ...prev,
      draftQueue: prev.draftQueue.filter((draft) => draft.id !== draftId)
    }));
  }, []);

  const rejectDraft = useCallback((draftId: string) => {
    setState((prev) => ({
      ...prev,
      draftQueue: prev.draftQueue.filter((draft) => draft.id !== draftId)
    }));
  }, []);

  const mergeTimelinePosts = useCallback((posts: TimelinePost[]) => {
    if (posts.length === 0) {
      return;
    }

    setState((prev) => {
      const existingIds = new Set(prev.timeline.map((post) => post.id));
      const newPosts = posts.filter((post) => !existingIds.has(post.id));
      if (newPosts.length === 0) {
        return prev;
      }

      const merged = [...newPosts, ...prev.timeline].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return {
        ...prev,
        timeline: merged
      };
    });
  }, []);

  useEffect(() => {
    if (state.status !== "running") {
      stopInterval();
      return undefined;
    }

    if (intervalRef.current) {
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      void runCycle("auto");
    }, AUTO_RUN_INTERVAL_MS);

    return () => {
      stopInterval();
    };
  }, [state.status, stopInterval, runCycle]);

  useEffect(() => {
    if (state.status === "finished" || state.status === "error") {
      stopInterval();
    }
  }, [state.status, stopInterval]);

  return {
    state,
    startAutoRun,
    stopAutoRun,
    stepOnce,
    resetRun,
    updatePolicy,
    approveDraft,
    rejectDraft,
    mergeTimelinePosts
  };
}
