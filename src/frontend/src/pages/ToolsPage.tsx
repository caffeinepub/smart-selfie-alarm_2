import { cn } from "@/lib/utils";
import {
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
} from "lucide-react";
import { useEffect, useState } from "react";

type ToolTab = "calculator" | "calendar" | "worldclock";

// ─── Calculator ────────────────────────────────────────────────────────────────

function CalculatorTool() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay(`${display}.`);
  };

  const clear = () => {
    setDisplay("0");
    setStored(null);
    setOp(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    setDisplay(String(Number.parseFloat(display) * -1));
  };

  const percent = () => {
    setDisplay(String(Number.parseFloat(display) / 100));
  };

  const handleOp = (nextOp: string) => {
    const current = Number.parseFloat(display);
    if (stored !== null && op && !waitingForOperand) {
      const result = calculate(stored, current, op);
      setDisplay(String(result));
      setStored(result);
    } else {
      setStored(current);
    }
    setOp(nextOp);
    setWaitingForOperand(true);
  };

  const calculate = (a: number, b: number, operation: string): number => {
    switch (operation) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b !== 0 ? a / b : 0;
      default:
        return b;
    }
  };

  const equals = () => {
    if (stored === null || op === null) return;
    const current = Number.parseFloat(display);
    const result = calculate(stored, current, op);
    setDisplay(String(Number.parseFloat(result.toFixed(10))));
    setStored(null);
    setOp(null);
    setWaitingForOperand(true);
  };

  const btnStyle = (color: string) => ({
    background: color,
    color: "#fff",
    fontSize: "20px",
    fontWeight: 600,
    borderRadius: "50%",
    width: "72px",
    height: "72px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none" as const,
    WebkitTapHighlightColor: "transparent",
    transition: "filter 0.1s",
  });

  const rows = [
    [
      { label: "AC", action: () => clear(), color: "#a1a1aa" },
      { label: "+/-", action: () => toggleSign(), color: "#a1a1aa" },
      { label: "%", action: () => percent(), color: "#a1a1aa" },
      { label: "÷", action: () => handleOp("÷"), color: "#7c3aed", isOp: true },
    ],
    [
      { label: "7", action: () => inputDigit("7"), color: "#27272a" },
      { label: "8", action: () => inputDigit("8"), color: "#27272a" },
      { label: "9", action: () => inputDigit("9"), color: "#27272a" },
      { label: "×", action: () => handleOp("×"), color: "#7c3aed", isOp: true },
    ],
    [
      { label: "4", action: () => inputDigit("4"), color: "#27272a" },
      { label: "5", action: () => inputDigit("5"), color: "#27272a" },
      { label: "6", action: () => inputDigit("6"), color: "#27272a" },
      { label: "-", action: () => handleOp("-"), color: "#7c3aed", isOp: true },
    ],
    [
      { label: "1", action: () => inputDigit("1"), color: "#27272a" },
      { label: "2", action: () => inputDigit("2"), color: "#27272a" },
      { label: "3", action: () => inputDigit("3"), color: "#27272a" },
      { label: "+", action: () => handleOp("+"), color: "#7c3aed", isOp: true },
    ],
  ];

  const displayText =
    display.length > 12 ? Number.parseFloat(display).toExponential(4) : display;

  return (
    <div className="flex flex-col items-center pt-4 pb-8 px-4">
      {/* Display */}
      <div
        className="w-full max-w-xs rounded-[24px] p-5 mb-6"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p
          className="text-xs text-right mb-1"
          style={{ color: "#475569", minHeight: "18px" }}
        >
          {stored !== null && op ? `${stored} ${op}` : ""}
        </p>
        <p
          className="text-right font-light break-all"
          style={{
            color: "#f8fafc",
            fontSize: displayText.length > 9 ? "28px" : "44px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {displayText}
        </p>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {rows.map((row, ri) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static layout
          <div key={ri} className="flex justify-between">
            {row.map((btn) => (
              <button
                key={btn.label}
                type="button"
                style={{
                  ...btnStyle(
                    op === btn.label && btn.isOp ? "#a78bfa" : btn.color,
                  ),
                }}
                onClick={btn.action}
                data-ocid="tools.calculator.button"
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
        {/* Bottom row: 0, ., = */}
        <div className="flex justify-between">
          <button
            type="button"
            style={{
              ...btnStyle("#27272a"),
              width: "156px",
              borderRadius: "36px",
              justifyContent: "flex-start",
              paddingLeft: "24px",
            }}
            onClick={() => inputDigit("0")}
            data-ocid="tools.calculator.button"
          >
            0
          </button>
          <button
            type="button"
            style={btnStyle("#27272a")}
            onClick={inputDecimal}
            data-ocid="tools.calculator.button"
          >
            .
          </button>
          <button
            type="button"
            style={btnStyle("#4f46e5")}
            onClick={equals}
            data-ocid="tools.calculator.button"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar ──────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function CalendarTool() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<number | null>(today.getDate());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)" }}
          data-ocid="tools.calendar.button"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <p className="font-semibold text-white text-base">
          {MONTHS[month]} {year}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)" }}
          data-ocid="tools.calendar.button"
        >
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold py-1.5"
            style={{ color: "#64748b" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional grid
          <div key={i} className="flex items-center justify-center">
            {day !== null ? (
              <button
                type="button"
                className="w-9 h-9 rounded-full text-sm font-medium flex items-center justify-center transition-all"
                style={{
                  background:
                    selected === day && !isToday(day)
                      ? "rgba(124,58,237,0.3)"
                      : isToday(day)
                        ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                        : "transparent",
                  color: isToday(day)
                    ? "#fff"
                    : selected === day
                      ? "#a78bfa"
                      : "#cbd5e1",
                  border:
                    selected === day && !isToday(day)
                      ? "1px solid #7c3aed55"
                      : "none",
                }}
                onClick={() => setSelected(day)}
                data-ocid="tools.calendar.button"
              >
                {day}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="mt-4 px-4 py-3 rounded-[16px] text-sm text-center"
          style={{
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.2)",
            color: "#c4b5fd",
          }}
        >
          {MONTHS[month]} {selected}, {year}
        </div>
      )}
    </div>
  );
}

// ─── World Clock ───────────────────────────────────────────────────────────────

const CITIES = [
  { name: "India (IST)", flag: "🇮🇳", tz: "Asia/Kolkata" },
  { name: "USA (EST)", flag: "🇺🇸", tz: "America/New_York" },
  { name: "UK (GMT/BST)", flag: "🇬🇧", tz: "Europe/London" },
  { name: "UAE (GST)", flag: "🇦🇪", tz: "Asia/Dubai" },
  { name: "Japan (JST)", flag: "🇯🇵", tz: "Asia/Tokyo" },
  { name: "Australia (AEST)", flag: "🇦🇺", tz: "Australia/Sydney" },
];

function WorldClockTool() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="px-4 pt-4 pb-8 space-y-3">
      {CITIES.map((city) => {
        const timeStr = now.toLocaleTimeString("en-GB", {
          timeZone: city.tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const dateStr = now.toLocaleDateString("en-GB", {
          timeZone: city.tz,
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={city.name}
            className="flex items-center justify-between px-4 py-4 rounded-[18px]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{city.flag}</span>
              <div>
                <p className="font-semibold text-white text-sm leading-tight">
                  {city.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                  {dateStr}
                </p>
              </div>
            </div>
            <p
              className="font-bold tabular-nums"
              style={{
                color: "#a78bfa",
                fontSize: "20px",
                letterSpacing: "-0.02em",
              }}
            >
              {timeStr}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ToolsPage ────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [tab, setTab] = useState<ToolTab>("calculator");

  const tabs: { id: ToolTab; label: string; icon: typeof Calculator }[] = [
    { id: "calculator", label: "Calculator", icon: Calculator },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "worldclock", label: "World Clock", icon: Globe },
  ];

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="tools.page"
    >
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <h1
          className="text-xl font-bold text-white"
          style={{ letterSpacing: "-0.03em" }}
        >
          Tools
        </h1>
      </div>

      {/* Tab bar */}
      <div className="px-4 mb-2">
        <div
          className="flex p-1 rounded-[18px] gap-1"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] text-xs font-semibold transition-all duration-200 min-h-[40px]",
              )}
              style={
                tab === id
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.3))",
                      color: "#c4b5fd",
                      border: "1px solid rgba(124,58,237,0.3)",
                    }
                  : { color: "#64748b" }
              }
              onClick={() => setTab(id)}
              data-ocid="tools.tab"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "calculator" && <CalculatorTool />}
      {tab === "calendar" && <CalendarTool />}
      {tab === "worldclock" && <WorldClockTool />}
    </div>
  );
}
