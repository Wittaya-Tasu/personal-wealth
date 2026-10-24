(function (global) {
  "use strict";
  const H = global.HabitTracker;
  function layout(year) {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) throw new Error("ปี Habit ไม่ถูกต้อง");
    const first = `${year}-01-01`, last = `${year}-12-31`, start = H.weekStart(first);
    const columns = Math.ceil(((H.date(last) - H.date(start)) / 86400000 + 1) / 7);
    const weeks = Array.from({ length: columns }, (_, column) => Array.from({ length: 7 }, (_, row) => {
      const day = H.shift(start, column * 7 + row);
      return day < first || day > last ? null : day;
    }));
    const months = Array.from({ length: 12 }, (_, month) => {
      const day = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      return { month, column: Math.floor((H.date(day) - H.date(start)) / 86400000 / 7) };
    });
    return { year, first, last, columns, weeks, months, days: weeks.flat().filter(Boolean) };
  }
  function color(habit) {
    let hash = 0;
    for (const char of String(habit.habit_id || habit.habit_name || "")) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return `hsl(${hash % 360}, 65%, 76%)`;
  }
  function summary(habit, logs, year, now = H.today()) {
    const calendar = layout(year), start = H.startDate(habit);
    const dates = new Set(logs.filter((log) => String(log.habit_id || "").trim() === String(habit.habit_id || "").trim()).map(H.logDate).filter((day) => day && day >= calendar.first && day <= calendar.last && day <= now));
    const completedDays = dates.size;
    let done = 0, goal = 0, pending = 0;
    const daily = ["Daily", "Interval"].includes(habit.frequency);
    const eligible = calendar.days.filter((day) => day <= now && (!start || day >= start));
    if (daily) {
      for (const day of eligible) {
        if (!H.isDue(habit, day)) continue;
        goal++; if (dates.has(day)) done++;
      }
    } else if (["Weekly", "Monthly", "Yearly"].includes(habit.frequency)) {
      const periods = new Map(eligible.map((day) => [H.periodKey(day, habit.frequency), day]));
      for (const day of periods.values()) {
        const [, end] = H.bounds(day, habit.frequency);
        // Assign an entire period to its ending year. Never turn unscheduled days into failures.
        if (!end.startsWith(String(year))) continue;
        const successful = H.count(habit, logs, day, now) >= H.target(habit);
        if (end < now || successful) { goal++; if (successful) done++; }
        else pending++;
      }
    }
    return { done, goal, pending, completedDays, unit: daily ? "วันตามกำหนด" : "รอบ", percent: goal ? Math.round(done / goal * 100) : null };
  }
  function model(habit, logs, year, now = H.today()) {
    const calendar = layout(year);
    const habitLogs = logs.filter((log) => String(log.habit_id || "").trim() === String(habit.habit_id || "").trim());
    const logged = new Set(habitLogs.map(H.logDate).filter(Boolean));
    // Passing only the matching row avoids scanning the entire ledger for every rendered day.
    const weeks = calendar.weeks.map((week) => week.map((day) => day ? {
      date: day,
      status: H.cell(habit, logged.has(day) ? [{ habit_id: habit.habit_id, completed_date: day }] : [], day, now)
    } : null));
    return { ...calendar, weeks, color: color(habit), summary: summary(habit, habitLogs, year, now), invalidSchedule: habit.frequency === "Interval" && !H.hasSchedule(habit) };
  }
  function aggregate(models) {
    const rated = models.filter((item) => item.summary.percent !== null);
    return {
      completedDays: models.reduce((sum, item) => sum + item.summary.completedDays, 0),
      percent: rated.length ? Math.round(rated.reduce((sum, item) => sum + item.summary.done / item.summary.goal * 100, 0) / rated.length) : null,
      habits: models.length
    };
  }
  global.HabitYear = Object.freeze({ layout, color, summary, model, aggregate });
})(typeof window === "undefined" ? globalThis : window);
