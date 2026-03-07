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
  name: string;
  email: string;
}

// Map of date (YYYY-MM-DD) to a map of habitId to progress amount
export type ProgressLogs = Record<string, Record<string, number>>;

interface HabitContextType {
  user: User | null;
  habits: Habit[];
  logs: ProgressLogs;
  login: (email: string, name?: string) => void;
  logout: () => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  logProgress: (habitId: string, date: string, amount: number) => void;
  getHabitProgress: (habitId: string, date: string) => number;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  // Load initial state from localStorage
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('habit_app_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('habit_app_habits');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<ProgressLogs>(() => {
    const saved = localStorage.getItem('habit_app_logs');
    return saved ? JSON.parse(saved) : {};
  });

  // Save to localStorage when state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('habit_app_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('habit_app_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('habit_app_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('habit_app_logs', JSON.stringify(logs));
  }, [logs]);

  // Actions
  const login = (email: string, name = 'John Doe') => {
    setUser({ email, name });
  };

  const logout = () => {
    setUser(null);
    // Optional: clear everything to fully reset the experience
    // setHabits([]);
    // setLogs({});
  };

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
    setHabits((prev) => prev.map((h) => h).filter((h) => h.id !== id));
    // Optionally clean up logs for this habit
  };

  const logProgress = (habitId: string, date: string, amount: number) => {
    setLogs((prev) => {
      const dateLogs = prev[date] || {};
      const currentAmount = dateLogs[habitId] || 0;
      
      return {
        ...prev,
        [date]: {
          ...dateLogs,
          [habitId]: amount, // Can be set explicitly or we can add depending on use case. Let's assume absolute set here. Wait, the mock says '+100', so we usually want to add. Let's make this the absolute progress amount. The component should do current + amount and pass it here.
        },
      };
    });
  };

  const getHabitProgress = (habitId: string, date: string) => {
    return logs[date]?.[habitId] || 0;
  };

  return (
    <HabitContext.Provider
      value={{
        user,
        habits,
        logs,
        login,
        logout,
        addHabit,
        updateHabit,
        deleteHabit,
        logProgress,
        getHabitProgress,
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
