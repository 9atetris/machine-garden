import type { TimelinePost } from "@/lib/types";

const MOCK_POSTS: TimelinePost[] = [
  {
    id: "t-001",
    author: "@starknet_jp",
    text: "Thread: Starknet community call starts in 2 hours. Bring your account abstraction questions.",
    topic: "starknet",
    sentiment: "positive",
    engagementScore: 88,
    createdAt: "2026-02-23T08:15:00.000Z"
  },
  {
    id: "c-001",
    author: "@zk_tutor",
    text: "Can you include one live AA onboarding demo?",
    topic: "starknet",
    sentiment: "neutral",
    engagementScore: 60,
    createdAt: "2026-02-23T08:18:30.000Z",
    replyToPostId: "t-001"
  },
  {
    id: "c-002",
    author: "@event_ops",
    text: "If you publish the slide deck, I will pin it for meetup volunteers.",
    topic: "event",
    sentiment: "positive",
    engagementScore: 59,
    createdAt: "2026-02-23T08:21:10.000Z",
    replyToPostId: "t-001"
  },
  {
    id: "t-002",
    author: "@ai_builder",
    text: "Thread: We cut hallucinations by pairing retrieval with strict output schemas. Want a teardown?",
    topic: "ai",
    sentiment: "positive",
    engagementScore: 77,
    createdAt: "2026-02-23T07:48:00.000Z"
  },
  {
    id: "c-003",
    author: "@model_eval",
    text: "Please share failure cases too, not only wins.",
    topic: "ai",
    sentiment: "neutral",
    engagementScore: 58,
    createdAt: "2026-02-23T07:52:00.000Z",
    replyToPostId: "t-002"
  },
  {
    id: "t-003",
    author: "@chain_hot_take",
    text: "Thread: Every L2 roadmap is fake. Nobody ships. Prove me wrong.",
    topic: "starknet",
    sentiment: "negative",
    engagementScore: 92,
    createdAt: "2026-02-23T07:22:00.000Z"
  },
  {
    id: "t-004",
    author: "@event_ops",
    text: "Thread: Need volunteers for registration desk at this weekend hack meetup. DM if available.",
    topic: "event",
    sentiment: "neutral",
    engagementScore: 55,
    createdAt: "2026-02-23T06:40:00.000Z"
  },
  {
    id: "c-004",
    author: "@community_builder",
    text: "I can cover first shift if someone handles closing.",
    topic: "event",
    sentiment: "positive",
    engagementScore: 52,
    createdAt: "2026-02-23T06:44:00.000Z",
    replyToPostId: "t-004"
  },
  {
    id: "t-005",
    author: "@gaming_proto",
    text: "Thread: Testing gasless onboarding for onchain mini-games. Looking for 20 testers.",
    topic: "gaming",
    sentiment: "positive",
    engagementScore: 69,
    createdAt: "2026-02-23T06:02:00.000Z"
  },
  {
    id: "t-006",
    author: "@spam_alpha",
    text: "Thread: 1000x guaranteed if you join this private signal room now. Last spots left.",
    topic: "general",
    sentiment: "negative",
    engagementScore: 81,
    createdAt: "2026-02-23T05:33:00.000Z"
  },
  {
    id: "t-007",
    author: "@product_notes",
    text: "Thread: Shipped cleaner error traces in our wallet SDK. Happy to share migration notes.",
    topic: "starknet",
    sentiment: "positive",
    engagementScore: 63,
    createdAt: "2026-02-23T05:10:00.000Z"
  },
  {
    id: "t-008",
    author: "@ops_journal",
    text: "Thread: Post-event recap template: attendance, conversion, follow-up owners. Works every time.",
    topic: "event",
    sentiment: "neutral",
    engagementScore: 58,
    createdAt: "2026-02-23T04:42:00.000Z"
  },
  {
    id: "t-009",
    author: "@quiet_thinker",
    text: "Thread: What is one Starknet devtool you wish existed today?",
    topic: "starknet",
    sentiment: "neutral",
    engagementScore: 73,
    createdAt: "2026-02-23T04:19:00.000Z"
  }
];

export function createMockTimeline(): TimelinePost[] {
  return MOCK_POSTS.map((post) => ({ ...post }));
}
