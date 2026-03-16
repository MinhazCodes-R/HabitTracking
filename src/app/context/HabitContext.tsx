import React, { createContext, useContext, useState, useEffect } from 'react';

// Types
export interface Habit {
  id: string;
  name: string;
  category: string;
  frequency: string;
  metricType: string;
  unit: string;
  goal: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider?: 'email' | 'google';
}

// Map of date (YYYY-MM-DD) to a map of habitId to progress amount
export type ProgressLogs = Record<string, Record<string, number>>;

interface HabitContextType {
  user: User | null;
  habits: Habit[];
  logs: ProgressLogs;
  login: (email: string, name?: string) => void;
  loginWithGoogle: (googleUser: { id: string; name: string; email: string; avatar?: string }) => void;
  logout: () => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  logProgress: (habitId: string, date: string, amount: number) => void;
  getHabitProgress: (habitId: string, date: string) => number;
  getProgressForMonth: (habitIds: string[], year: number, month: number) => ProgressLogs;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

function getUserId(user: User | null): string {
  return user?.id || 'guest';
}

export function HabitProvider({ children }: { children: React.ReactNode }) {
  // Load initial state from localStorage
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('habit_app_user');
    return saved ? JSON.parse(saved) : null;
  });

  const getStorageKey = (suffix: string, uid?: string) =>
    `habit_app_${suffix}_${uid ?? getUserId(user)}`;

  const [habits, setHabits] = useState<Habit[]>(() => {
    const uid = (() => {
      const saved = localStorage.getItem('habit_app_user');
      return saved ? JSON.parse(saved)?.id || 'guest' : 'guest';
    })();
    // Migrate old keyless data for guest
    const legacyHabits = localStorage.getItem('habit_app_habits');
    if (legacyHabits && !localStorage.getItem(`habit_app_habits_${uid}`)) {
      localStorage.setItem(`habit_app_habits_${uid}`, legacyHabits);
    }
    const saved = localStorage.getItem(`habit_app_habits_${uid}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<ProgressLogs>(() => {
    const uid = (() => {
      const saved = localStorage.getItem('habit_app_user');
      return saved ? JSON.parse(saved)?.id || 'guest' : 'guest';
    })();
    const legacyLogs = localStorage.getItem('habit_app_logs');
    if (legacyLogs && !localStorage.getItem(`habit_app_logs_${uid}`)) {
      localStorage.setItem(`habit_app_logs_${uid}`, legacyLogs);
    }
    const saved = localStorage.getItem(`habit_app_logs_${uid}`);
    return saved ? JSON.parse(saved) : {};
  });

  // When user changes, reload habits/logs for that user
  useEffect(() => {
    const uid = getUserId(user);
    const savedHabits = localStorage.getItem(`habit_app_habits_${uid}`);
    const savedLogs = localStorage.getItem(`habit_app_logs_${uid}`);
    setHabits(savedHabits ? JSON.parse(savedHabits) : []);
    setLogs(savedLogs ? JSON.parse(savedLogs) : {});
  }, [user?.id]);

  // Save to localStorage when state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('habit_app_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('habit_app_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('habits'), JSON.stringify(habits));
  }, [habits, user?.id]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('logs'), JSON.stringify(logs));
  }, [logs, user?.id]);

  // Auth actions
  const login = (email: string, name = 'User') => {
    const id = `email_${email.replace(/[^a-z0-9]/gi, '_')}`;
    setUser({ id, email, name, provider: 'email' });
  };

  const loginWithGoogle = (googleUser: { id: string; name: string; email: string; avatar?: string }) => {
    setUser({ ...googleUser, provider: 'google' });
  };

  const logout = () => {
    setUser(null);
    setHabits([]);
    setLogs({});
  };

  // Habit actions
  const addHabit = (habitData: Omit<Habit, 'id' | 'createdAt'>) => {
    const newHabit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setHabits((prev) => [...prev, newHabit]);
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const logProgress = (habitId: string, date: string, amount: number) => {
    setLogs((prev) => {
      const dateLogs = prev[date] || {};
      return {
        ...prev,
        [date]: { ...dateLogs, [habitId]: amount },
      };
    });
  };

  const getHabitProgress = (habitId: string, date: string) => {
    return logs[date]?.[habitId] || 0;
  };

  /** Returns subset of logs for the given month — efficient O(days) scan */
  const getProgressForMonth = (habitIds: string[], year: number, month: number): ProgressLogs => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const result: ProgressLogs = {};
    for (const [date, dayLogs] of Object.entries(logs)) {
      if (!date.startsWith(prefix)) continue;
      const filtered: Record<string, number> = {};
      for (const hid of habitIds) {
        if (dayLogs[hid] !== undefined) filtered[hid] = dayLogs[hid];
      }
      if (Object.keys(filtered).length > 0) result[date] = filtered;
    }
    return result;
  };

  return (
    <HabitContext.Provider
      value={{
        user,
        habits,
        logs,
        login,
        loginWithGoogle,
        logout,
        addHabit,
        updateHabit,
        deleteHabit,
        logProgress,
        getHabitProgress,
        getProgressForMonth,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const context = useContext(HabitContext);
  if (context === undefined) {
    throw new Error('useHabits must be used within a HabitProvider');
  }
  return context;
}
