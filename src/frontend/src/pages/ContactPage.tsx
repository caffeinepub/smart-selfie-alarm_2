import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, MessageSquare, Send } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const CONTACT_EMAIL = "smartselfiealarm@gmail.com";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    try {
      const subject = encodeURIComponent(
        `Message from ${name} — Smart Selfie Alarm`,
      );
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      );
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      toast.success("Opening email client...");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Failed to open email client");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-full" style={{ backgroundColor: "#0a0a0f" }}>
      {/* Header */}
      <div className="p-6 pt-8">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-5 h-5" style={{ color: "#7c3aed" }} />
          <h1 className="text-2xl font-bold text-white">Contact Us</h1>
        </div>
        <p className="text-sm" style={{ color: "#64748b" }}>
          We&apos;d love to hear from you
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-4 pb-8 space-y-4"
      >
        {/* Email display */}
        <div
          className="flex items-center gap-3 p-4 rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.2)" }}
          >
            <Mail className="w-5 h-5" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <p
              className="text-xs font-medium mb-0.5"
              style={{ color: "#94a3b8" }}
            >
              Direct email
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm font-semibold"
              style={{ color: "#c4b5fd" }}
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        {/* Contact form */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Send us a message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#e2e8f0" }}
              >
                Your Name
              </label>
              <Input
                id="contact-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-violet-500"
                data-ocid="contact.input"
              />
            </div>
            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#e2e8f0" }}
              >
                Email Address
              </label>
              <Input
                id="contact-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-violet-500"
                data-ocid="contact.input"
              />
            </div>
            <div>
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#e2e8f0" }}
              >
                Message
              </label>
              <Textarea
                id="contact-message"
                placeholder="Tell us what's on your mind..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 resize-none focus:border-violet-500"
                data-ocid="contact.textarea"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-2xl font-semibold btn-neon gap-2"
              disabled={sending}
              data-ocid="contact.submit_button"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Opening..." : "Send Message"}
            </Button>
          </form>
        </div>

        {/* Note */}
        <p className="text-xs text-center" style={{ color: "#475569" }}>
          This will open your email client with the message pre-filled
        </p>

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-xs" style={{ color: "#334155" }}>
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#7c3aed" }}
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
