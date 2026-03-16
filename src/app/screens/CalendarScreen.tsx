import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BottomNav } from '../components/BottomNav';
import { MonthCalendar } from '../components/MonthCalendar';
import { useHabits } from '../context/HabitContext';
import {
  Droplet, BookOpen, Dumbbell, Target, Brain,
  DollarSign, Heart, Circle, LayoutGrid,
} from 'lucide-react';

// ─── Genre definitions ──────────────────────────────────────────────────────

interface Genre {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const GENRES: Genre[] = [
  { id: 'all',          label: 'All',          icon: LayoutGrid,  color: '#6366f1' },
  { id: 'health',       label: 'Health',       icon: Droplet,     color: '#22c55e' },
  { id: 'fitness',      label: 'Fitness',      icon: Dumbbell,    color: '#f97316' },
  { id: 'study',        label: 'Study',        icon: BookOpen,    color: '#3b82f6' },
  { id: 'productivity', label: 'Productivity', icon: Target,      color: '#a855f7' },
  { id: 'mindfulness',  label: 'Mindfulness',  icon: Brain,       color: '#ec4899' },
  { id: 'finance',      label: 'Finance',      icon: DollarSign,  color: '#eab308' },
  { id: 'personal',     label: 'Personal',     icon: Heart,       color: '#ef4444' },
  { id: 'custom',       label: 'Custom',       icon: Circle,      color: '#64748b' },
];

// ─── Build months array ─────────────────────────────────────────────────────

function buildMonthsRange(pastMonths: number, futureMonths: number) {
  const today = new Date();
  const months: Array<{ year: number; month: number; id: string }> = [];
  for (let i = -pastMonths; i <= futureMonths; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      id: `${d.getFullYear()}-${d.getMonth()}`,
    });
  }
  return months;
}

const MONTHS = buildMonthsRange(12, 12);

const todayObj = new Date();
const TODAY_STR = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
const CURRENT_MONTH_ID = `${todayObj.getFullYear()}-${todayObj.getMonth()}`;

// ─── Pill chip ────────────────────────────────────────────────────────────

function Chip({
  label,
  icon: Icon,
  active,
  accentColor,
  onClick,
}: {
  label: string;
  icon?: React.ElementType;
  active: boolean;
  accentColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '999px',
        border: `1.5px solid ${active ? (accentColor ?? '#fff') : 'var(--border)'}`,
        background: active ? (accentColor ? `${accentColor}22` : 'var(--secondary)') : 'transparent',
        color: active ? (accentColor ?? '#fff') : 'var(--muted-foreground)',
        fontSize: '0.8rem',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
        outline: 'none',
        flexShrink: 0,
      }}
    >
      {Icon && <Icon size={13} />}
      {label}
    </button>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function CalendarScreen() {
  const { habits, logs, getProgressForMonth } = useHabits();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(TODAY_STR);

  // Ref map: month id → DOM element for scroll-to
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current month when calendar mounts
  useEffect(() => {
    const el = monthRefs.current[CURRENT_MONTH_ID];
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  // Filtered habit list by genre
  const filteredHabits = useMemo(() => {
    if (selectedCategory === 'all') return habits;
    return habits.filter((h) => h.category === selectedCategory);
  }, [habits, selectedCategory]);

  // Filtered by individual habit selection
  const activeHabits = useMemo(() => {
    if (!selectedHabitId) return filteredHabits;
    return filteredHabits.filter((h) => h.id === selectedHabitId);
  }, [filteredHabits, selectedHabitId]);

  // When category changes, clear habit selection
  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setSelectedHabitId(null);
  }, []);

  // Per-month cache of logs for active habits
  const getMonthLogs = useCallback(
    (year: number, month: number) =>
      getProgressForMonth(activeHabits.map((h) => h.id), year, month),
    [activeHabits, logs] // re-derive when habits selection or logs change
  );

  // Genre colour lookup
  const genreColor = useMemo(() => {
    const g = GENRES.find((g) => g.id === selectedCategory);
    return g?.color ?? '#6366f1';
  }, [selectedCategory]);

  // Detail panel for the selected date
  const selectedDetailHabits = useMemo(() => {
    if (!selectedDate) return [];
    return activeHabits.map((habit) => {
      const progress = logs[selectedDate]?.[habit.id] ?? 0;
      const ratio = habit.goal > 0 ? Math.min(progress / habit.goal, 1) : 0;
      return { habit, progress, ratio };
    });
  }, [selectedDate, activeHabits, logs]);

  const formatSelectedDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', maxWidth: '480px', margin: '0 auto', paddingBottom: '96px' }}>

      {/* ── Sticky Header + Filters ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--background)',
        borderBottom: '1px solid var(--border)',
        paddingTop: '48px',
        paddingBottom: '12px',
      }}>
        <div style={{ padding: '0 24px 12px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Calendar
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', margin: '2px 0 0' }}>
            {todayObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Genre chips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '0 24px 8px',
          scrollbarWidth: 'none',
        }}>
          {GENRES.map((g) => (
            <Chip
              key={g.id}
              label={g.label}
              icon={g.icon}
              active={selectedCategory === g.id}
              accentColor={g.color}
              onClick={() => handleCategorySelect(g.id)}
            />
          ))}
        </div>

        {/* Habit chips — only show when there are habits in the selected genre */}
        {filteredHabits.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '0 24px 4px',
            scrollbarWidth: 'none',
          }}>
            <Chip
              label="All Habits"
              active={selectedHabitId === null}
              accentColor={genreColor}
              onClick={() => setSelectedHabitId(null)}
            />
            {filteredHabits.map((h) => (
              <Chip
                key={h.id}
                label={h.name}
                active={selectedHabitId === h.id}
                accentColor={genreColor}
                onClick={() => setSelectedHabitId(h.id)}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 24px 0',
          flexWrap: 'wrap',
        }}>
          {[
            { color: 'rgba(99,102,241,0.35)', label: 'Low' },
            { color: 'rgba(234,179,8,0.45)',  label: 'Mid' },
            { color: 'rgba(34,197,94,0.55)',  label: 'High' },
            { color: 'rgba(255,255,255,0.95)', label: '100%', textColor: '#000' },
          ].map(({ color, label, textColor }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '3px',
                background: color, border: '1px solid rgba(255,255,255,0.15)',
              }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable months ── */}
      <div
        ref={scrollRef}
        style={{ padding: '16px 24px 0', overflowY: 'auto' }}
      >
        {MONTHS.map(({ year, month, id }) => (
          <div
            key={id}
            ref={(el) => { monthRefs.current[id] = el; }}
          >
            <MonthCalendar
              year={year}
              month={month}
              habits={activeHabits}
              monthLogs={getMonthLogs(year, month)}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
        ))}
      </div>

      {/* ── Selected Day Detail ── */}
      {selectedDate && (
        <div style={{
          margin: '0 24px 24px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px',
        }}>
          <h3 style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', margin: '0 0 16px' }}>
            {formatSelectedDate(selectedDate)}
          </h3>

          {activeHabits.length === 0 ? (
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              {habits.length === 0
                ? 'No habits yet — create one from the Home screen.'
                : 'No habits in this category.'}
            </p>
          ) : selectedDetailHabits.every((d) => d.progress === 0) ? (
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              No progress logged for this day.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedDetailHabits.map(({ habit, progress, ratio }) => (
                <div key={habit.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>
                      {habit.name}
                    </span>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                      {progress} / {habit.goal} {habit.unit}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '999px',
                      width: `${Math.round(ratio * 100)}%`,
                      background: ratio >= 1 ? '#22c55e' : ratio >= 0.5 ? '#eab308' : '#6366f1',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
