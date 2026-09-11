"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { NeuraiLogo } from "./neurai-logo";
import {
  chatWithPuter,
  type NeuraiMemory,
} from "@/ai/puter-client";

type ChatMessage = {
  role: "user" | "assistant" | "error";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

type RemoteMessage = {
  id?: string;
  role?: string;
  content?: string;
  createdAt?: string | number;
};

type RemoteConversation = {
  id?: string;
  title?: string;
  messages?: RemoteMessage[];
  createdAt?: string | number;
  updatedAt?: string | number;
};

type ChatResult = {
  status: string;
  text?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

const STORAGE_KEY = "neurai-conversations";

/*
 * Normalize LaTeX delimiters that AI providers commonly return.
 *
 * \[ ... \]  ->  $$ ... $$
 * \( ... \)  ->  $ ... $
 *
 * This lets remark-math + KaTeX render both normal Markdown
 * math syntax and common LaTeX delimiters.
 */
function normalizeMathDelimiters(content: string) {
  return content
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}

function normalizeTimestamp(
  value: string | number | undefined,
  fallback: number,
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeMessage(
  message: RemoteMessage,
): ChatMessage | null {
  if (
    message.role !== "user" &&
    message.role !== "assistant" &&
    message.role !== "error"
  ) {
    return null;
  }

  if (typeof message.content !== "string") {
    return null;
  }

  return {
    role: message.role,
    content: message.content,
  };
}

function normalizeConversation(
  conversation: RemoteConversation,
): Conversation | null {
  if (
    typeof conversation.id !== "string" ||
    !conversation.id
  ) {
    return null;
  }

  const now = Date.now();

  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
        .map(normalizeMessage)
        .filter(
          (message): message is ChatMessage =>
            message !== null,
        )
    : [];

  return {
    id: conversation.id,
    title:
      typeof conversation.title === "string" &&
      conversation.title.trim()
        ? conversation.title
        : "New conversation",
    messages,
    createdAt: normalizeTimestamp(
      conversation.createdAt,
      now,
    ),
    updatedAt: normalizeTimestamp(
      conversation.updatedAt,
      now,
    ),
  };
}

function createConversation(): Conversation {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function saveConversation(
  conversation: Conversation,
) {
  const response = await fetch(
    `/api/conversations/${conversation.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: conversation.title,
        messages: conversation.messages,
      }),
    },
  );

  if (!response.ok) {
    let details = "Unable to save conversation.";

    try {
      const result = await response.json();

      if (
        typeof result?.details === "string" &&
        result.details.trim()
      ) {
        details = result.details;
      } else if (
        typeof result?.error === "string" &&
        result.error.trim()
      ) {
        details = result.error;
      }
    } catch {
      // Ignore invalid error responses.
    }

    console.error(
      "Conversation save failed:",
      response.status,
      details,
    );

    throw new Error(details);
  }
}

async function createDatabaseConversation(
  conversation: Conversation,
) {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
    }),
  });

  if (!response.ok) {
    let details = "Unable to create conversation.";

    try {
      const result = await response.json();

      if (
        typeof result?.details === "string" &&
        result.details.trim()
      ) {
        details = result.details;
      } else if (
        typeof result?.error === "string" &&
        result.error.trim()
      ) {
        details = result.error;
      }
    } catch {
      // Ignore invalid error responses.
    }

    console.error(
      "Conversation creation failed:",
      response.status,
      details,
    );

    throw new Error(details);
  }
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // Ignore clipboard failures.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-white/[.06] hover:text-slate-200"
      title="Copy response"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function AssistantMessage({
  content,
}: {
  content: string;
}) {
  const normalizedContent =
    normalizeMathDelimiters(content);

  return (
    <div className="px-1 py-1 text-sm leading-7 text-slate-200">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkMath,
        ]}
        rehypePlugins={[
          rehypeKatex,
        ]}
        components={{
          p: ({ children }) => (
            <p className="mb-4 last:mb-0">
              {children}
            </p>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),

          h1: ({ children }) => (
            <h1 className="mb-4 mt-6 text-2xl font-bold text-white first:mt-0">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-xl font-bold text-white first:mt-0">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mb-3 mt-5 text-lg font-semibold text-white first:mt-0">
              {children}
            </h3>
          ),

          ul: ({ children }) => (
            <ul className="mb-4 list-disc space-y-1 pl-6">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-4 list-decimal space-y-1 pl-6">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="pl-1">
              {children}
            </li>
          ),

          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-white/20 pl-4 text-slate-400">
              {children}
            </blockquote>
          ),

          hr: () => (
            <hr className="my-6 border-white/10" />
          ),

          code: ({
            className,
            children,
            ...props
          }) => {
            const isBlock =
              typeof className === "string" &&
              className.includes("language-");

            if (isBlock) {
              return (
                <code
                  className="block overflow-x-auto text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code
                className="rounded-md bg-white/[.08] px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-200"
                {...props}
              >
                {children}
              </code>
            );
          },

          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 leading-6">
              {children}
            </pre>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
            >
              {children}
            </a>
          ),

          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),

          th: ({ children }) => (
            <th className="border border-white/10 bg-white/[.05] px-3 py-2 text-left font-semibold text-white">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border border-white/10 px-3 py-2">
              {children}
            </td>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

function Sidebar({
  open,
  close,
  conversations,
  activeId,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}: {
  open: boolean;
  close: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <button
        onClick={close}
        className={
          (open ? "block " : "hidden ") +
          "fixed inset-0 z-20 bg-black/60 md:hidden"
        }
        aria-label="Close navigation"
      />

      <aside
        className={
          (open ? "translate-x-0 " : "-translate-x-full ") +
          "fixed inset-y-0 left-0 z-30 flex w-[272px] flex-col border-r border-white/10 bg-[#090c19]/95 p-4 backdrop-blur-xl transition-transform md:static md:translate-x-0"
        }
      >
        <div className="mb-8 px-2">
          <NeuraiLogo />
        </div>

        <button
          onClick={onNewChat}
          className="mb-5 h-11 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 text-left text-sm font-semibold text-slate-950"
        >
          + New chat
        </button>

        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.16em] text-slate-600">
          Chat History
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={
                (conversation.id === activeId
                  ? "bg-white/[.08] "
                  : "") +
                "group flex items-center rounded-xl"
              }
            >
              <button
                onClick={() => onSelect(conversation.id)}
                className="min-w-0 flex-1 overflow-hidden px-3 py-3 text-left text-sm text-slate-300 hover:text-white"
              >
                <span className="block truncate">
                  {conversation.title}
                </span>
              </button>

              <button
                onClick={() => onRename(conversation.id)}
                className="block px-2 text-xs text-slate-500 hover:text-blue-400 md:hidden md:group-hover:block"
                aria-label={`Rename ${conversation.title}`}
                title="Rename"
              >
                ✎
              </button>

             <button
  onClick={() => onDelete(conversation.id)}
  className="block px-2 pr-3 text-xs text-slate-500 hover:text-red-400 md:hidden md:group-hover:block"
  aria-label={`Delete ${conversation.title}`}
  title="Delete"
>
  ×
</button>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 pt-4">
          <Link
            href="/memory"
            className="block px-3 text-left text-sm text-slate-400 transition hover:text-white"
          >
            Memory
          </Link>

          <button className="mt-3 block px-3 text-left text-sm text-slate-400">
            Files
          </button>

          <button className="mt-3 block px-3 text-left text-sm text-slate-400">
            Tools
          </button>

          <Link
            href="/account"
            className="mt-4 block px-3 text-left text-sm text-slate-400 transition hover:text-white"
          >
            Account
          </Link>
        </div>
      </aside>
    </>
  );
}

export function AppShell() {
  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);

  const [activeId, setActiveId] = useState<string | null>(
    null,
  );

  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const [memories, setMemories] = useState<
    NeuraiMemory[]
  >([]);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  useEffect(() => {
    async function loadConversations() {
      try {
        const sessionResponse = await fetch(
          "/api/auth/session",
          {
            cache: "no-store",
          },
        );

        const session = sessionResponse.ok
          ? await sessionResponse.json()
          : null;

        const loggedIn =
          Boolean(session?.user?.id);

        setIsAuthenticated(loggedIn);

        if (loggedIn) {
          try {
            const memoryResponse = await fetch(
              "/api/memories",
              {
                cache: "no-store",
              },
            );

            if (memoryResponse.ok) {
              const memoryData =
                await memoryResponse.json();

              const loadedMemories = Array.isArray(
                memoryData.memories,
              )
                ? memoryData.memories
                    .filter(
                      (memory: {
                        content?: unknown;
                        category?: unknown;
                      }) =>
                        typeof memory.content === "string" &&
                        memory.content.trim(),
                    )
                    .slice(0, 50)
                    .map(
                      (memory: {
                        content: string;
                        category?: string;
                      }) => ({
                        content: memory.content,
                        category:
                          typeof memory.category ===
                            "string" &&
                          memory.category.trim()
                            ? memory.category
                            : "general",
                      }),
                    )
                : [];

              setMemories(loadedMemories);
            } else {
              setMemories([]);
            }
          } catch {
            setMemories([]);
          }
        } else {
          setMemories([]);
        }

        if (!loggedIn) {
          try {
            const saved =
              localStorage.getItem(STORAGE_KEY);

            if (saved) {
              const local = JSON.parse(
                saved,
              ) as Conversation[];

              if (Array.isArray(local)) {
                setConversations(local);
              }
            }
          } catch {
            // Ignore guest cache failures.
          }

          setActiveId(null);
          return;
        }

        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore local storage failures.
        }

        const response = await fetch(
          "/api/conversations",
          {
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          let errorMessage =
            `Unable to load conversations. (${response.status})`;

          try {
            const errorData =
              await response.json();

            if (
              typeof errorData?.details === "string" &&
              errorData.details
            ) {
              errorMessage +=
                ` ${errorData.details}`;
            } else if (
              typeof errorData?.error === "string" &&
              errorData.error
            ) {
              errorMessage +=
                ` ${errorData.error}`;
            }
          } catch {
            // Ignore invalid/non-JSON error responses.
          }

          throw new Error(errorMessage);
        }

        const data =
          await response.json();

        const rawRemote = Array.isArray(
          data.conversations,
        )
          ? (data.conversations as RemoteConversation[])
          : [];

        const remote = rawRemote
          .map(normalizeConversation)
          .filter(
            (
              conversation,
            ): conversation is Conversation =>
              conversation !== null,
          );

        setConversations(remote);
      } catch (error) {
        console.error(
          "Conversation loading failed:",
          error,
        );

        setConversations([]);
      } finally {
        setActiveId(null);
        setLoaded(true);
      }
    }

    loadConversations();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    async function syncStorageMode() {
      try {
        const response = await fetch(
          "/api/auth/session",
          {
            cache: "no-store",
          },
        );

        const session = response.ok
          ? await response.json()
          : null;

        const loggedIn =
          Boolean(session?.user?.id);

        if (loggedIn) {
          localStorage.removeItem(
            STORAGE_KEY,
          );
          return;
        }

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(conversations),
        );
      } catch {
        // Ignore local cache failures.
      }
    }

    syncStorageMode();
  }, [conversations, loaded]);

  async function syncConversation(
    conversation: Conversation,
    isNew: boolean,
  ) {
    if (!isAuthenticated) {
      return;
    }

    if (isNew) {
      await createDatabaseConversation(
        conversation,
      );
    } else {
      await saveConversation(conversation);
    }
  }

  const activeConversation =
    activeId === null
      ? null
      : conversations.find(
          (conversation) =>
            conversation.id === activeId,
        ) ?? null;

  function newChat() {
    setActiveId(null);
    setText("");
    setOpen(false);
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setText("");
    setOpen(false);
  }

  async function renameConversation(id: string) {
    const conversation = conversations.find(
      (item) => item.id === id,
    );

    if (!conversation) return;

    const title = window.prompt(
      "Rename conversation",
      conversation.title,
    );

    if (title === null) return;

    const newTitle = title.trim();

    if (!newTitle) return;

    const updated: Conversation = {
      ...conversation,
      title: newTitle.slice(0, 80),
      updatedAt: Date.now(),
    };

    setConversations((current) =>
      current.map((item) =>
        item.id === id ? updated : item,
      ),
    );

    try {
      await syncConversation(
        updated,
        false,
      );
    } catch (error) {
      console.error(
        "Conversation rename database sync failed:",
        error,
      );
    }
  }

  async function deleteConversation(id: string) {
    const conversation = conversations.find(
      (item) => item.id === id,
    );

    if (!conversation) return;

    const confirmed = window.confirm(
      `Delete "${conversation.title}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setConversations((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    );

    if (id === activeId) {
      setActiveId(null);
      setText("");
    }

    if (isAuthenticated) {
      try {
        const response = await fetch(
          `/api/conversations/${id}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          console.error(
            "Conversation delete failed:",
            response.status,
          );
        }
      } catch (error) {
        console.error(
          "Conversation delete database sync failed:",
          error,
        );
      }
    }
  }

  async function regenerateConversation(
    conversationId: string,
    assistantIndex: number,
  ) {
    if (pending) return;

    const conversation =
      conversations.find(
        (item) => item.id === conversationId,
      );

    if (!conversation) return;

    const assistantMessage =
      conversation.messages[
        assistantIndex
      ];

    if (
      !assistantMessage ||
      assistantMessage.role !== "assistant"
    ) {
      return;
    }

    const userMessage =
      conversation.messages[
        assistantIndex - 1
      ];

    if (
      !userMessage ||
      userMessage.role !== "user"
    ) {
      return;
    }

    const contextMessages =
      conversation.messages
        .slice(0, assistantIndex)
        .map((item) => ({
          role:
            item.role === "error"
              ? ("user" as const)
              : item.role,
          content: item.content,
        }));

    setPending(true);

    try {
      let assistantText = "";

      try {
        assistantText =
          await chatWithPuter(
            contextMessages,
            memories,
          );
      } catch {
        const response = await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              message:
                userMessage.content,
              conversationId,
            }),
          },
        );

        const result =
          (await response.json()) as ChatResult;

        if (
          !response.ok ||
          !result.text
        ) {
          throw new Error(
            result.error?.message ||
              "The AI provider is unavailable.",
          );
        }

        assistantText = result.text;
      }

      const updated: Conversation = {
        ...conversation,
        messages:
          conversation.messages.map(
            (message, index) =>
              index === assistantIndex
                ? {
                    ...message,
                    content:
                      assistantText,
                  }
                : message,
          ),
        updatedAt: Date.now(),
      };

      setConversations((current) =>
        current.map((item) =>
          item.id === conversationId
            ? updated
            : item,
        ),
      );

      try {
        await syncConversation(
          updated,
          false,
        );
      } catch (error) {
        console.error(
          "Regenerated conversation database sync failed:",
          error,
        );
      }
    } catch {
      // Keep the existing response if regeneration fails.
    } finally {
      setPending(false);
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const message = text.trim();

    if (!message || pending) return;

    setPending(true);
    setText("");

    let conversation: Conversation;
    let isNew = false;

    if (activeConversation) {
      conversation = {
        ...activeConversation,
        messages: [
          ...activeConversation.messages,
          {
            role: "user",
            content: message,
          },
        ],
        updatedAt: Date.now(),
      };
    } else {
      const newConversation =
        createConversation();

      conversation = {
        ...newConversation,
        title: message.slice(0, 42),
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      };

      isNew = true;

      setActiveId(conversation.id);

      setConversations((current) => [
        ...current,
        conversation,
      ]);
    }

    const conversationMessages =
      conversation.messages.map(
        (item) => ({
          role:
            item.role === "error"
              ? ("user" as const)
              : item.role,
          content: item.content,
        }),
      );

    try {
      let assistantText = "";

      try {
        assistantText =
          await chatWithPuter(
            conversationMessages,
            memories,
          );
      } catch {
        const response = await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              message,
              conversationId:
                conversation.id,
            }),
          },
        );

        const result =
          (await response.json()) as ChatResult;

        if (
          !response.ok ||
          !result.text
        ) {
          throw new Error(
            result.error?.message ||
              "The AI provider is unavailable.",
          );
        }

        assistantText = result.text;
      }

      const updatedConversation: Conversation =
        {
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              role: "assistant",
              content: assistantText,
            },
          ],
          updatedAt: Date.now(),
        };

      setConversations((current) => {
        const exists = current.some(
          (item) =>
            item.id ===
            updatedConversation.id,
        );

        if (!exists) {
          return [
            ...current,
            updatedConversation,
          ];
        }

        return current.map((item) =>
          item.id ===
          updatedConversation.id
            ? updatedConversation
            : item,
        );
      });

      try {
        await syncConversation(
          updatedConversation,
          isNew,
        );
      } catch (error) {
        console.error(
          "Conversation database sync failed:",
          error,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong.";

      const updatedConversation: Conversation =
        {
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              role: "error",
              content: errorMessage,
            },
          ],
          updatedAt: Date.now(),
        };

      setConversations((current) =>
        current.map((item) =>
          item.id ===
          updatedConversation.id
            ? updatedConversation
            : item,
        ),
      );

      try {
        await syncConversation(
          updatedConversation,
          isNew,
        );
      } catch {
        // Ignore secondary database failure.
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050713] text-white">
      <div className="flex min-h-screen">
        <Sidebar
          open={open}
          close={() => setOpen(false)}
          conversations={conversations}
          activeId={activeId}
          onNewChat={newChat}
          onSelect={selectConversation}
          onRename={renameConversation}
          onDelete={deleteConversation}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center border-b border-white/10 px-4 md:px-6">
            <button
              onClick={() => setOpen(true)}
              className="mr-3 rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>

            <div className="text-sm font-medium text-slate-300">
              Neurai
            </div>
          </header>

          <div className="flex flex-1 flex-col">
            {activeConversation &&
            activeConversation.messages.length >
              0 ? (
              <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 overflow-y-auto px-4 py-8">
                {activeConversation.messages.map(
                  (message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={
                        message.role === "user"
                          ? "ml-auto max-w-[85%] rounded-2xl bg-blue-500/15 px-4 py-3 text-sm text-slate-100"
                          : "max-w-[85%]"
                      }
                    >
                      <div
                        className={
                          message.role === "error"
                            ? "rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                            : ""
                        }
                      >
                        {message.role ===
                        "assistant" ? (
                          <AssistantMessage
                            content={
                              message.content
                            }
                          />
                        ) : (
                          message.content
                        )}
                      </div>

                      {message.role ===
                        "assistant" && (
                        <div className="mt-2 flex items-center gap-1">
                          <CopyButton
                            content={
                              message.content
                            }
                          />

                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              regenerateConversation(
                                activeConversation.id,
                                index,
                              )
                            }
                            className="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-white/[.06] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Regenerate response"
                          >
                            ↻ Regenerate
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6">
                <div className="w-full max-w-2xl text-center">
                  <div className="mb-3 text-3xl font-semibold tracking-tight">
                    How can I help?
                  </div>

                  <div className="text-sm text-slate-500">
                    Ask Neurai anything.
                  </div>
                </div>
              </div>
            )}

            <form
              onSubmit={submit}
              className="mx-auto w-full max-w-4xl px-4 pb-5"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[.04] p-2 shadow-2xl shadow-black/20">
                <textarea
                  value={text}
                  onChange={(event) =>
                    setText(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      if (!pending) {
                        event.currentTarget.form?.requestSubmit();
                      }
                    }
                  }}
                  placeholder="Message Neurai..."
                  rows={1}
                  className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                />

                <button
                  type="submit"
                  disabled={
                    pending ||
                    !text.trim()
                  }
                  className="h-11 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending ? "..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}