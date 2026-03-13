import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useChatMessages, useSendMessage } from "@/hooks/use-chat";
import { useAuth } from "@/contexts/AuthContext";

interface GroupChatProps {
  rideGroupId: string;
  routeName: string;
}

const GroupChat = ({ rideGroupId, routeName }: GroupChatProps) => {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useChatMessages(rideGroupId);
  const sendMessage = useSendMessage(rideGroupId);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage.mutate(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Hey! Lass uns das Taxi teilen für ${routeName}. Wann bist du am Flughafen?`
  )}`;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <span className="font-display font-semibold text-card-foreground">Gruppen-Chat</span>
            {messages.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {messages.length}
              </span>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Messages */}
            <div className="max-h-72 overflow-y-auto border-t border-border px-4 py-3 space-y-3">
              {isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nachrichten werden geladen…</p>
              ) : messages.length === 0 ? (
                <div className="py-6 text-center">
                  <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Noch keine Nachrichten. Schreib als Erster!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.user_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] ${isOwn ? "order-1" : ""}`}>
                        {!isOwn && (
                          <div className="mb-0.5 flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                              {getInitials(msg.profile?.full_name ?? null)}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {msg.profile?.full_name?.split(" ")[0] || "Mitfahrer"}
                            </span>
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          {msg.message}
                        </div>
                        <span className={`mt-0.5 block text-[10px] text-muted-foreground ${isOwn ? "text-right" : ""}`}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nachricht schreiben…"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMessage.isPending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

              {/* WhatsApp option - subtle */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Optional: WhatsApp-Gruppe erstellen
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupChat;
