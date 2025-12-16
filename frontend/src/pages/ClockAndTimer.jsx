import React, { useEffect, useMemo, useState } from "react";

// ===== Helpers لتخزين الوقت الحقيقي =====
function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addStudySeconds(secondsToAdd) {
  const key = "study_seconds_by_day";
  const raw = localStorage.getItem(key);
  const obj = raw ? JSON.parse(raw) : {};
  const today = dateKey();

  const add = Math.max(0, Math.floor(secondsToAdd));
  obj[today] = (obj[today] || 0) + add;

  localStorage.setItem(key, JSON.stringify(obj));
  window.dispatchEvent(new Event("timeSpentUpdated"));
}

// 🔹 Timer Component
function ClockAndTimer() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  // countdown
  const [countdownTime, setCountdownTime] = useState(0); // remaining seconds
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // لتسجيل الجلسة الحقيقية
  const [initialCountdown, setInitialCountdown] = useState(0); // total seconds when start
  const [sessionActive, setSessionActive] = useState(false); // started and not yet saved

  // clock
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // countdown tick
  useEffect(() => {
    let timerId;
    if (timerRunning && countdownTime > 0) {
      timerId = setInterval(() => {
        setCountdownTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    }

    // إذا انتهى الوقت وهو شغال: نسجل كامل الجلسة (initialCountdown)
    if (countdownTime === 0 && timerRunning) {
      alert("Time's up!");
      setTimerRunning(false);

      // سجلي الجلسة لو كانت فعلاً بدأت
      if (sessionActive && initialCountdown > 0) {
        addStudySeconds(initialCountdown);
        setSessionActive(false);
        setInitialCountdown(0);
      }
    }

    return () => clearInterval(timerId);
  }, [timerRunning, countdownTime, sessionActive, initialCountdown]);

  const totalSecondsInput = useMemo(() => {
    const h = Math.max(0, Number(hours) || 0);
    const m = Math.max(0, Number(minutes) || 0);
    const s = Math.max(0, Number(seconds) || 0);
    return h * 3600 + m * 60 + s;
  }, [hours, minutes, seconds]);

  const handleStartTimer = () => {
    if (totalSecondsInput <= 0) {
      alert("Please set a time greater than 0.");
      return;
    }

    setCountdownTime(totalSecondsInput);
    setInitialCountdown(totalSecondsInput);
    setSessionActive(true);
    setTimerRunning(true);
  };

  const handleStopTimer = () => {
    setTimerRunning(false);

    // سجلي فقط الوقت اللي مضى فعلاً
    if (sessionActive && initialCountdown > 0) {
      const elapsed = Math.max(0, initialCountdown - countdownTime);
      if (elapsed > 0) addStudySeconds(elapsed);

      setSessionActive(false);
      setInitialCountdown(0);
    }
  };

  const clampNonNegative = (n) => Math.max(0, Number(n) || 0);

  const handleWheel = (e, type) => {
    const delta = e.deltaY < 0 ? 1 : -1;

    if (type === "hours") setHours((prev) => clampNonNegative(prev + delta));
    if (type === "minutes") setMinutes((prev) => clampNonNegative(prev + delta));
    if (type === "seconds") setSeconds((prev) => clampNonNegative(prev + delta));
  };

  const formatTime = (timeInSeconds) => {
    const hh = String(Math.floor(timeInSeconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((timeInSeconds % 3600) / 60)).padStart(2, "0");
    const ss = String(timeInSeconds % 60).padStart(2, "0");
    return { hours: hh, minutes: mm, seconds: ss };
  };

  const { hours: displayHours, minutes: displayMinutes, seconds: displaySeconds } = formatTime(countdownTime);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px", flexDirection: "column", alignItems: "center" }}>
      {/* Timer Widget */}
      <div
        style={{
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
          padding: "12px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          backgroundColor: "#000",
          color: "white",
          marginBottom: "20px",
          width: "280px",
          fontSize: "12px",
        }}
      >
        {/* Timer Name */}
        <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "6px" }}>Timer</div>

        {/* Time Input Fields */}
        <div style={{ fontSize: "14px", marginBottom: "8px", display: "flex", justifyContent: "space-between", width: "100%" }}>
          <div style={{ width: "30%", textAlign: "center", padding: "6px", backgroundColor: "#555", borderRadius: "8px" }} onWheel={(e) => handleWheel(e, "hours")}>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(clampNonNegative(e.target.value))}
              min="0"
              placeholder="H"
              style={{
                padding: "6px",
                fontSize: "14px",
                width: "100%",
                margin: "0 5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                backgroundColor: "#555",
                color: "white",
              }}
            />
          </div>

          <div style={{ width: "30%", textAlign: "center", padding: "6px", backgroundColor: "#555", borderRadius: "8px" }} onWheel={(e) => handleWheel(e, "minutes")}>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(clampNonNegative(e.target.value))}
              min="0"
              placeholder="M"
              style={{
                padding: "6px",
                fontSize: "14px",
                width: "100%",
                margin: "0 5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                backgroundColor: "#555",
                color: "white",
              }}
            />
          </div>

          <div style={{ width: "30%", textAlign: "center", padding: "6px", backgroundColor: "#555", borderRadius: "8px" }} onWheel={(e) => handleWheel(e, "seconds")}>
            <input
              type="number"
              value={seconds}
              onChange={(e) => setSeconds(clampNonNegative(e.target.value))}
              min="0"
              placeholder="S"
              style={{
                padding: "6px",
                fontSize: "14px",
                width: "100%",
                margin: "0 5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                backgroundColor: "#555",
                color: "white",
              }}
            />
          </div>
        </div>

        {/* Start and Stop Timer Buttons */}
        <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
          <button
            onClick={handleStartTimer}
            style={{
              padding: "8px 14px",
              fontSize: "14px",
              cursor: "pointer",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              width: "40%",
            }}
          >
            Start
          </button>

          <button
            onClick={handleStopTimer}
            style={{
              padding: "8px 14px",
              fontSize: "14px",
              cursor: "pointer",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "8px",
              width: "40%",
            }}
          >
            Stop
          </button>
        </div>

        {/* Countdown Timer Display */}
        <div style={{ fontSize: "20px", fontWeight: "bold", marginTop: "8px" }}>
          <p>{displayHours}:{displayMinutes}:{displaySeconds}</p>
        </div>
      </div>
    </div>
  );
}

export default ClockAndTimer;
