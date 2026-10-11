(function (global) {
  "use strict";
  const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Yearly", "Interval"];
  const LIMITS = { Daily: 1, Weekly: 7, Monthly: 31, Yearly: 366, Interval: 1 };
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error("วันที่ Habit ไม่ถูกต้อง");
    const result = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) throw new Error("วันที่ Habit ไม่ถูกต้อง");
    return result;
  }
  const iso = (value) => value.toISOString().slice(0, 10);
  function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  function shift(value, days) {
    const result = date(value);
    result.setUTCDate(result.getUTCDate() + days);
    return iso(result);
  }
  function weekStart(value) {
    const day = date(value).getUTCDay();
    return shift(value, -(day === 0 ? 6 : day - 1));
  }
  function periodKey(value, frequency) {
    const parsed = date(value);
    if (!FREQUENCIES.includes(frequency)) throw new Error("ความถี่ Habit ไม่ถูกต้อง");
    if (frequency === "Daily" || frequency === "Interval") return value;
    if (frequency === "Monthly") return value.slice(0, 7);
    if (frequency === "Yearly") return value.slice(0, 4);
    parsed.setUTCDate(parsed.getUTCDate() + 4 - (parsed.getUTCDay() || 7));
    const year = parsed.getUTCFullYear();
    const week = Math.ceil(((parsed - new Date(Date.UTC(year, 0, 1))) / 86400000 + 1) / 7);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }
  function bounds(value, frequency) {
    const parsed = date(value), year = parsed.getUTCFullYear(), month = parsed.getUTCMonth();
    if (frequency === "Daily" || frequency === "Interval") return [value, value];
    if (frequency === "Weekly") { const start = weekStart(value); return [start, shift(start, 6)]; }
    if (frequency === "Monthly") return [iso(new Date(Date.UTC(year, month, 1))), iso(new Date(Date.UTC(year, month + 1, 0)))];
    if (frequency === "Yearly") return [`${year}-01-01`, `${year}-12-31`];
    throw new Error("ความถี่ Habit ไม่ถูกต้อง");
  }
  function dateKey(value) {
    const key = String(value || "").trim().slice(0, 10);
    try { date(key); return key; } catch { return ""; }
  }
  function startDate(habit) {
    if (habit.frequency === "Interval") return dateKey(habit.start_date);
    const value = String(habit.created_at || "").trim();
    if (/T/.test(value)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
    return dateKey(value);
  }
  function logDate(log) {
    // Keep undated legacy period records in progress, without inventing a day in the grid.
    return dateKey(log.completed_date) || startDate({ created_at: log.completed_at }) || dateKey(log.period_key);
  }
  function target(habit) {
    if (habit.frequency === "Daily" || habit.frequency === "Interval") return 1;
    const value = Number(habit.target_count);
    return Number.isInteger(value) && value >= 1 && value <= LIMITS[habit.frequency] ? value : 1;
  }
  function validateTarget(value, frequency) {
    if (!FREQUENCIES.includes(frequency)) throw new Error("ความถี่ Habit ไม่ถูกต้อง");
    const count = value === "" || value == null ? 1 : Number(value);
    if (!Number.isInteger(count) || count < 1 || count > LIMITS[frequency]) throw new Error(`เป้าหมายต้องเป็นจำนวนเต็ม 1–${LIMITS[frequency]} ครั้งต่อรอบ`);
    return count;
  }
  const sameHabit = (habit, log) => String(habit.habit_id || "").trim() === String(log.habit_id || "").trim();
  function validateInterval(value, start) {
    const interval = Number(value);
    if (!Number.isInteger(interval) || interval < 2 || interval > 365) throw new Error("ระยะห่างต้องเป็นจำนวนเต็ม 2–365 วัน");
    date(start);
    return interval;
  }
  function hasSchedule(habit) {
    if (habit.frequency !== "Interval") return true;
    try { validateInterval(habit.interval_days, habit.start_date); return true; } catch { return false; }
  }
  function isDue(habit, value) {
    if (habit.frequency !== "Interval") return !startDate(habit) || value >= startDate(habit);
    if (!hasSchedule(habit)) return false;
    const distance = (date(value) - date(habit.start_date)) / 86400000;
    return distance >= 0 && distance % Number(habit.interval_days) === 0;
  }
  function completed(habit, logs, value) {
    return logs.some((log) => sameHabit(habit, log) && logDate(log) === value);
  }
  function count(habit, logs, value, cutoff = today()) {
    const key = periodKey(value, habit.frequency), dates = new Set();
    let undated = false;
    for (const log of logs) {
      if (!sameHabit(habit, log)) continue;
      const day = logDate(log);
      if (day) {
        if (day <= cutoff && periodKey(day, habit.frequency) === key) dates.add(day);
      } else if (String(log.period_key || "").trim() === key) undated = true;
    }
    // A legacy row with no usable date represents one completion in that period.
    return dates.size + Number(undated && bounds(value, habit.frequency)[0] <= cutoff);
  }
  function cell(habit, logs, value, now = today()) {
    if (completed(habit, logs, value)) return value > now ? "future" : "done";
    const start = startDate(habit);
    if (start && value < start) return "off";
    if (value > now) return "future";
    if (habit.frequency === "Interval" && !isDue(habit, value)) return "off";
    if (value === now) return "pending";
    return ["Daily", "Interval"].includes(habit.frequency) ? "miss" : "off";
  }
  function streak(habit, logs, value, now = today()) {
    if (habit.frequency === "Interval") {
      if (!hasSchedule(habit)) return 0;
      const anchor = habit.start_date, interval = Number(habit.interval_days);
      const cutoff = value < now ? value : now;
      if (cutoff < anchor) return 0;
      const distance = (date(cutoff) - date(anchor)) / 86400000;
      let cursor = shift(anchor, Math.floor(distance / interval) * interval), total = 0;
      // Only today's due date remains open. A missed earlier due date breaks the run.
      if (cursor === now && !completed(habit, logs, cursor)) cursor = shift(cursor, -interval);
      while (cursor >= anchor && completed(habit, logs, cursor)) {
        total++; cursor = shift(cursor, -interval);
      }
      return total;
    }
    let cursor = value < now ? value : now;
    let total = 0;
    const cutoff = cursor, start = startDate(habit);
    const successful = (day) => count(habit, logs, day, cutoff) >= target(habit);
    // An unfinished open period does not break the preceding run yet.
    if (!successful(cursor)) {
      if (bounds(cursor, habit.frequency)[1] < now) return 0;
      cursor = shift(bounds(cursor, habit.frequency)[0], -1);
    }
    const earliest = logs.filter((log) => sameHabit(habit, log)).map(logDate).filter(Boolean).sort()[0];
    const floor = start || earliest;
    if (!floor) return successful(cursor) ? 1 : 0;
    while (bounds(cursor, habit.frequency)[1] >= floor && successful(cursor)) {
      total++;
      cursor = shift(bounds(cursor, habit.frequency)[0], -1);
    }
    return total;
  }
  function days(value, view) {
    const [start, end] = bounds(value, view === "month" ? "Monthly" : "Weekly");
    const result = [];
    for (let cursor = start; cursor <= end; cursor = shift(cursor, 1)) result.push(cursor);
    return result;
  }
  function progress(habit, logs, value, view = "week", now = today()) {
    if (!["Daily", "Interval"].includes(habit.frequency)) return { done: count(habit, logs, value, now), goal: target(habit) };
    const eligible = days(value, view).filter((day) => day <= now && isDue(habit, day));
    return { done: eligible.filter((day) => completed(habit, logs, day)).length, goal: eligible.length };
  }
  function weekSummary(habits, logs, value, now = today()) {
    let done = 0, goal = 0;
    for (const habit of habits.filter((h) => ["Daily", "Weekly", "Interval"].includes(h.frequency))) {
      const [start, end] = bounds(value, "Weekly");
      if (start > now || (startDate(habit) && startDate(habit) > end)) continue;
      const result = progress(habit, logs, value, "week", now);
      done += Math.min(result.done, result.goal); goal += result.goal;
    }
    return { done, goal, percent: goal ? Math.round(done / goal * 100) : 0 };
  }
  global.HabitTracker = Object.freeze({ LIMITS, date, today, shift, weekStart, periodKey, bounds, dateKey, startDate, logDate, target, validateTarget, validateInterval, hasSchedule, isDue, completed, count, cell, streak, days, progress, weekSummary });
})(typeof window === "undefined" ? globalThis : window);
