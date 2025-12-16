import React from "react";

function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getStoredByDaySeconds() {
  const raw = localStorage.getItem("study_seconds_by_day");
  return raw ? JSON.parse(raw) : {};
}

// نخلي الأسبوع يبدأ من Saturday زي الواجهة (S M T W T F S)
function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 1) % 7; // Sat=>0, Sun=>1, Mon=>2...
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

// ✅ يعرض ساعات + دقائق + ثواني (عشان تشوفين التغيير فورًا)
function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

const TimeSpentExact = () => {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const onUpdate = () => setTick((x) => x + 1);
    window.addEventListener("timeSpentUpdated", onUpdate);
    return () => window.removeEventListener("timeSpentUpdated", onUpdate);
  }, []);

  const byDay = React.useMemo(() => getStoredByDaySeconds(), [tick]);

  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  const weekStart = startOfWeek(new Date());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = dateKey(d);
    const seconds = Number(byDay[key] || 0);
    return { label: labels[i], key, seconds };
  });

  const totalWeekSeconds = weekDays.reduce((sum, x) => sum + x.seconds, 0);
  const maxSeconds = Math.max(1, ...weekDays.map((x) => x.seconds));
  const todayKey = dateKey(new Date());

  return (
    <div className="time-card">
      <div className="time-header">
        <h3>Time Spent</h3>
        <span className="time-value">{formatHMS(totalWeekSeconds)}</span>
      </div>

      <div className="bars">
        {weekDays.map((item) => {
          const pct = Math.round((item.seconds / maxSeconds) * 100);
          const isToday = item.key === todayKey;

          return (
            <div className="bar-wrapper" key={item.key}>
              <div
                className={`bar ${isToday ? "active" : ""}`}
                style={{ height: `${pct}%` }}
                title={`${item.key}: ${formatHMS(item.seconds)}`}
              />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSpentExact;



