"use client";

import { useState, useEffect, useRef } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "72ded451-b07f-4a04-adcb-44e7b58a98ad",
        content: input,
      }),
    });

    const data = await res.json();

    const aiMessage: Message = {
      role: "assistant",
      content: data.reply || "Keine Antwort.",
    };

    setMessages((prev) => [...prev, aiMessage]);
  }

  return (
    <div className="min-h-screen bg-[#0E2A26] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl h-[85vh] bg-[#F3F4F2] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-gray-300 font-semibold text-gray-800 text-lg tracking-wide">
          ALORIS
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#2E5E53] text-white ml-auto"
                  : "bg-[#E6E8E5] text-gray-800"
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-300 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Schreibe deine Nachricht..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C6A85C] text-sm"
          />
          <button
            onClick={sendMessage}
            className="px-6 py-2 rounded-full bg-[#C6A85C] text-white text-sm font-medium hover:opacity-90 transition"
          >
            Senden
          </button>
        </div>

      </div>
    </div>
  );
}