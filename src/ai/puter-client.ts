type PuterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type NeuraiMemory = {
  content: string;
  category: string;
};

export async function chatWithPuter(
  messages: PuterMessage[],
  _memories: NeuraiMemory[] = [],
): Promise<string> {
  const userMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!userMessage?.content?.trim()) {
    throw new Error("INVALID_REQUEST");
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: userMessage.content.trim(),
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "AI provider is unavailable.",
    );
  }

  if (!data?.text) {
    throw new Error("EMPTY_AI_RESPONSE");
  }

  return data.text;
}