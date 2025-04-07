import { useEffect, useState } from "react";
import moment from "moment";
import { StateNames } from "@/lib/utils";

interface Log {
  timestamp: number;
  type: string;
  message: string;
}

// extended matcher with swapId and statemachine class name
const regexp = new RegExp(/(\d+)\s(log|info|error|trace)\:\s\w{10,}\s\w+\s(.*)/);

// simpler matcher for any logs
const regexp2 = new RegExp(/(\d+)\s(log|info|error|trace)\:\s(.*)/);

export function Logs({logs}: {logs: string[]}) {
  const [expanded, setExpanded] = useState(true);

  const [processedLogs, setProcessedLogs] = useState<Log[]>([]);

  useEffect(() => {
    const newLogs = logs.map(log => {
      const match = regexp.exec(log);

      if (match?.length === 4) {
        // eslint-disable-next-line
        let [timestamp, type, message] = match.slice(1);
        if (message.includes("dispatching")) {
          const state = message.split(" ")[1];
          message = StateNames[state];
          if (!StateNames[state]) {
            console.error(`Unknown state: ${state}`);
          }
        }
        return {timestamp: Number(timestamp), type, message};
      }

      const match2 = regexp2.exec(log);
      if (match2?.length === 4) {
        // eslint-disable-next-line
        let [timestamp, type, message] = match2.slice(1);
        return {timestamp: Number(timestamp), type, message};
      }

      return {timestamp: Date.now(), type: "log", message: log};
    });
    setProcessedLogs(newLogs);
  }, [logs]);

  return <div className="text-center">
    <div className="font-semibold text-lg decoration-dashed underline cursor-pointer" onClick={() => setExpanded(!expanded)}>{expanded ? `Hide Logs ↑` : `View Logs ↓`}</div>
    {expanded && <ul className="text-left text-sm">
      {processedLogs?.map((log, i) => <li className="break-words mt-1" title={moment(log.timestamp).calendar()} key={i}>{moment(log.timestamp).fromNow()}{log.type === "log" ? " - " : ` - ${log.type} - `}{log.message}</li>)}
    </ul>}
  </div>
}