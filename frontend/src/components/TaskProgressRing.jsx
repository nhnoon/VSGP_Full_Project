import React from "react";

export default function TaskProgressRing({
  value = 0,              // 0..100
  size = 86,              // حجم الدائرة
  stroke = 10,            // سماكة الدائرة
  labelTop = "Tasks",
  centerText = "0/0",
  subText = "Completed tasks",
}) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  return (
    <div style={{ width: "100%" }}>
      {/* عنوان أعلى نفس بقية الكروت */}
      <div style={{ color: "#6b7280", fontSize: 13 }}>{labelTop}</div>

      {/* محتوى وسط الكرت */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 10,
          minHeight: 120,
        }}
      >
        {/* Ring */}
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size}>
            {/* الخلفية */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={stroke}
            />

            {/* التقدم */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#2563EB"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>

          {/* النص داخل الدائرة */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              lineHeight: 1.1,
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>Progress</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
              {v}%
            </div>
          </div>
        </div>

        {/* تحت الدائرة */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
            {centerText}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{subText}</div>
        </div>
      </div>
    </div>
  );
}

