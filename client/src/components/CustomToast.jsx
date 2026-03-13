import { toast } from "react-toastify";

// ─── Shared avatar component ───────────────────────────────────────────────
const Avatar = ({ src, alt }) => (
  <img
    src={src || "https://via.placeholder.com/36?text=U"}
    alt={alt}
    className="w-9 h-9 rounded-full object-cover ring-2 ring-white/20 shrink-0"
  />
);

// ─── Incoming Message Toast ────────────────────────────────────────────────
export const showIncomingMessageToast = (senderName, message, senderAvatar) => {
  return toast(
    <div className="flex items-center gap-3 w-full">
      <Avatar src={senderAvatar} alt={senderName} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-0.5">
          {senderName}
        </p>
        <p className="text-sm text-white truncate">{message}</p>
      </div>
      <span className="text-lg shrink-0">📨</span>
    </div>,
    {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
        border: "1px solid rgba(139,92,246,0.3)",
        borderRadius: "14px",
        padding: "12px 14px",
        boxShadow: "0 8px 32px rgba(99,74,246,0.25)",
        color: "#fff",
      },
    },
  );
};

// ─── User Online Toast ─────────────────────────────────────────────────────
export const showUserOnlineToast = (userName) => {
  return toast(
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <p className="text-sm font-medium text-emerald-100">
        <span className="font-bold">{userName}</span> is online
      </p>
    </div>,
    {
      position: "bottom-center",
      autoClose: 2500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: "linear-gradient(135deg, #052e16 0%, #14532d 100%)",
        border: "1px solid rgba(52,211,153,0.3)",
        borderRadius: "999px",
        padding: "10px 18px",
        boxShadow: "0 4px 24px rgba(16,185,129,0.2)",
        color: "#fff",
        minWidth: "unset",
      },
    },
  );
};

// ─── User Offline Toast ────────────────────────────────────────────────────
export const showUserOfflineToast = (userName) => {
  return toast(
    <div className="flex items-center gap-2.5">
      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-400" />
      <p className="text-sm font-medium text-slate-300">
        <span className="font-bold text-slate-200">{userName}</span> went
        offline
      </p>
    </div>,
    {
      position: "bottom-center",
      autoClose: 2500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        border: "1px solid rgba(148,163,184,0.2)",
        borderRadius: "999px",
        padding: "10px 18px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        color: "#fff",
        minWidth: "unset",
      },
    },
  );
};

// ─── Connected Toast ───────────────────────────────────────────────────────
export const showConnectedToast = (userName) => {
  return toast(
    <div className="flex items-center gap-2.5">
      <span className="text-base">💬</span>
      <p className="text-sm font-medium text-sky-100">
        Connected to <span className="font-bold">{userName}</span>
      </p>
    </div>,
    {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: "linear-gradient(135deg, #0c1a2e 0%, #0e3058 100%)",
        border: "1px solid rgba(56,189,248,0.3)",
        borderRadius: "999px",
        padding: "10px 18px",
        boxShadow: "0 4px 24px rgba(14,165,233,0.2)",
        color: "#fff",
        minWidth: "unset",
      },
    },
  );
};

// ─── Message Sent Toast ────────────────────────────────────────────────────
export const showMessageSentToast = () => {
  return toast(
    <div className="flex items-center gap-2">
      <span className="text-base">✅</span>
      <p className="text-sm font-medium text-emerald-100">Message sent</p>
    </div>,
    {
      position: "top-right",
      autoClose: 1500,
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      style: {
        background: "linear-gradient(135deg, #052e16 0%, #14532d 100%)",
        border: "1px solid rgba(52,211,153,0.25)",
        borderRadius: "12px",
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(16,185,129,0.2)",
        color: "#fff",
        minWidth: "unset",
      },
    },
  );
};

// ─── Message Error Toast ───────────────────────────────────────────────────
export const showMessageErrorToast = (error = "Failed to send message") => {
  return toast(
    <div className="flex items-center gap-2.5">
      <span className="text-base shrink-0">❌</span>
      <p className="text-sm font-medium text-red-100">{error}</p>
    </div>,
    {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        background: "linear-gradient(135deg, #2d0a0a 0%, #450a0a 100%)",
        border: "1px solid rgba(248,113,113,0.3)",
        borderRadius: "12px",
        padding: "10px 14px",
        boxShadow: "0 4px 24px rgba(239,68,68,0.25)",
        color: "#fff",
      },
    },
  );
};

// ─── Typing Indicator Toast ────────────────────────────────────────────────
export const showReceiverTypingToast = (userName) => {
  return toast(
    <div className="flex items-center gap-2.5">
      {/* Animated typing dots */}
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400"
            style={{
              animation: "bounce 1.2s infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-violet-100">
        <span className="font-bold">{userName}</span> is typing…
      </p>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>,
    {
      position: "bottom-center",
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)",
        border: "1px solid rgba(167,139,250,0.3)",
        borderRadius: "999px",
        padding: "10px 18px",
        boxShadow: "0 4px 24px rgba(139,92,246,0.2)",
        color: "#fff",
        minWidth: "unset",
      },
    },
  );
};
