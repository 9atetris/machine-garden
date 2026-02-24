import type { Tone } from "@/lib/types";

function cleanSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function applyToneTonePrefix(tone: Tone): string {
  switch (tone) {
    case "friendly":
      return "Great point";
    case "technical":
      return "Technical take";
    default:
      return "Quick thought";
  }
}

export function buildReplyDraft(input: {
  tone: Tone;
  postAuthor: string;
  postText: string;
  topic: string;
}): string {
  const snippet = cleanSnippet(input.postText).slice(0, 90);
  const tonePrefix = applyToneTonePrefix(input.tone);

  if (input.tone === "technical") {
    return `${tonePrefix}: ${input.topic} context looks actionable.\n- Key signal: ${snippet}\n- Suggested next step: share one measurable example.`;
  }

  if (input.tone === "friendly") {
    return `${tonePrefix}, ${input.postAuthor}. ${snippet} I would love to hear one concrete follow-up you recommend.`;
  }

  return `${tonePrefix}: ${snippet} Could you share one practical next step?`;
}

export function buildPostDraft(input: {
  tone: Tone;
  topic: string;
  relatedTopics: string[];
}): string {
  const related = input.relatedTopics.length > 0 ? input.relatedTopics.slice(0, 2).join(", ") : "community updates";

  if (input.tone === "technical") {
    return `Topic: ${input.topic}.\n- Current signal: strong interest in ${related}.\n- Plan: share a concise thread with one metric, one tradeoff, one next action.`;
  }

  if (input.tone === "friendly") {
    return `Checking in on ${input.topic} today. We are tracking ${related} and would love your practical tips.`;
  }

  return `Brief update on ${input.topic}: we are tracking ${related} and collecting practical feedback.`;
}
