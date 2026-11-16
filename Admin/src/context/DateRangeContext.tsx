import React, { createContext, useContext, useState, useMemo } from 'react';
import { 
  startOfToday, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  format
} from 'date-fns';

export type RangePreset = 'Today' | 'Yesterday' | '7 days' | 'This week' | 'This month' | 'Last month' | 'All time' | 'Custom';

interface DateRangeContextType {
  preset: RangePreset;
  setPreset: (preset: RangePreset) => void;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  setCustomRange: (from: string, to: string) => void;
  formatRangeDisplay: () => string;
}

const DateRangeContext = createContext<DateRangeContextType | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<RangePreset>('This month');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  const { from, to } = useMemo(() => {
    const today = startOfToday();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

    switch (preset) {
      case 'Today':
        return { from: fmt(today), to: fmt(today) };
      case 'Yesterday': {
        const y = subDays(today, 1);
        return { from: fmt(y), to: fmt(y) };
      }
      case '7 days':
        return { from: fmt(subDays(today, 6)), to: fmt(today) };
      case 'This week': {
        // Week is Monday to Sunday in IST per Section 2 Decision 5
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const end = endOfWeek(today, { weekStartsOn: 1 });
        return { from: fmt(start), to: fmt(end) };
      }
      case 'This month':
        return { from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) };
      case 'Last month': {
        const prev = subMonths(today, 1);
        return { from: fmt(startOfMonth(prev)), to: fmt(endOfMonth(prev)) };
      }
      case 'All time':
        return { from: '2024-01-01', to: fmt(today) };
      case 'Custom':
        return { from: customFrom || fmt(startOfMonth(today)), to: customTo || fmt(today) };
      default:
        return { from: fmt(startOfMonth(today)), to: fmt(today) };
    }
  }, [preset, customFrom, customTo]);

  const setCustomRange = (newFrom: string, newTo: string) => {
    setCustomFrom(newFrom);
    setCustomTo(newTo);
    setPreset('Custom');
  };

  const formatRangeDisplay = () => {
    if (preset !== 'Custom') return preset;
    return `${from} to ${to}`;
  };

  return (
    <DateRangeContext.Provider
      value={{
        preset,
        setPreset,
        from,
        to,
        setCustomRange,
        formatRangeDisplay,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within DateRangeProvider');
  }
  return context;
}

