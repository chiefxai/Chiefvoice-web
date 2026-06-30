import { useState, useEffect, useRef } from "react";
import { Terminal, Cpu } from "lucide-react";

export default function LiveConsole() {
  const [logs, setLogs] = useState([]);
  const [tokens, setTokens] = useState({ input: 0, output: 0 });
  const terminalEndRef = useRef(null);

  useEffect(() => {
    // Connect to Server-Sent Events stream
    const eventSource = new EventSource("/api/logs-stream");

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        if (log.message) {
          setLogs((prev) => [...prev, log].slice(-100)); // limit to last 100 logs
        }
        if (log.type === "usage") {
          setTokens({
            input: log.inputTokens || 0,
            output: log.outputTokens || 0
          });
        }
      } catch (err) {
        console.error("Failed to parse event log:", err);
      }
    };

    eventSource.onerror = () => {
      console.warn("EventSource connection disconnected. Reconnecting...");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom of logs
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="card p-5 flex flex-col h-[400px]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-[var(--color-trust)]" />
          <h3 className="font-semibold text-[15px]">Live AI Console</h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono bg-gray-50 border border-[var(--color-border)] px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Cpu size={13} />
            <span>Prompt Tokens: <strong className="text-[var(--color-indigo)]">{tokens.input}</strong></span>
          </div>
          <div className="w-[1px] h-3 bg-gray-300" />
          <div className="flex items-center gap-1.5 text-gray-600">
            <span>Response Tokens: <strong className="text-[var(--color-trust)]">{tokens.output}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-950 rounded-xl p-4 font-mono text-xs text-gray-300 space-y-2 select-text">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic text-center pt-8">Console idle. Awaiting calls or process actions...</div>
        ) : (
          logs.map((log, index) => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            let color = "text-gray-400";
            if (log.type === "transcript") {
              color = log.role === "user" ? "text-amber-300 font-medium" : "text-sky-300 font-medium";
            } else if (log.type === "usage") {
              color = "text-emerald-400 font-bold";
            } else if (log.type === "payment") {
              color = "text-green-400";
            } else if (log.type === "order") {
              color = "text-pink-400";
            } else if (log.type === "system") {
              color = "text-purple-400 font-semibold";
            }

            return (
              <div key={index} className="flex gap-2 items-start leading-relaxed">
                <span className="text-gray-600 shrink-0 select-none">[{time}]</span>
                <span className={color}>{log.message}</span>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
