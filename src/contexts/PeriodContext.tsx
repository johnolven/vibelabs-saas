'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type PeriodType = 'month' | 'quarter' | 'year';
export type PeriodView = 'current' | 'previous' | 'custom' | 'all';

export interface Period {
  type: PeriodType;
  value: string; // '2024-01' para month, '2024-Q1' para quarter, '2024' para year
  label: string; // 'Enero 2024', 'Q1 2024', '2024'
  startDate: Date;
  endDate: Date;
}

interface PeriodContextType {
  currentPeriod: Period;
  periodType: PeriodType;
  periodView: PeriodView;
  setPeriodType: (type: PeriodType) => void;
  setPeriodView: (view: PeriodView) => void;
  setCustomPeriod: (period: Period) => void;
  getPeriods: (type: PeriodType, count?: number) => Period[];
  getCurrentPeriod: (type: PeriodType) => Period;
  getPreviousPeriod: (type: PeriodType) => Period;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
}

// Helper functions
function getMonthPeriod(year: number, month: number): Period {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  return {
    type: 'month',
    value: `${year}-${String(month).padStart(2, '0')}`,
    label: `${monthNames[month - 1]} ${year}`,
    startDate,
    endDate
  };
}

function getQuarterPeriod(year: number, quarter: number): Period {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  const startDate = new Date(year, startMonth - 1, 1);
  const endDate = new Date(year, endMonth, 0, 23, 59, 59);
  
  return {
    type: 'quarter',
    value: `${year}-Q${quarter}`,
    label: `Q${quarter} ${year}`,
    startDate,
    endDate
  };
}

function getYearPeriod(year: number): Period {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  
  return {
    type: 'year',
    value: String(year),
    label: String(year),
    startDate,
    endDate
  };
}

function getCurrentMonth(): Period {
  const now = new Date();
  return getMonthPeriod(now.getFullYear(), now.getMonth() + 1);
}

function getCurrentQuarter(): Period {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return getQuarterPeriod(now.getFullYear(), quarter);
}

function getCurrentYear(): Period {
  const now = new Date();
  return getYearPeriod(now.getFullYear());
}

function getPreviousMonth(): Period {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return getMonthPeriod(prevYear, prevMonth);
}

function getPreviousQuarter(): Period {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  let prevQuarter = currentQuarter - 1;
  let prevYear = now.getFullYear();
  
  if (prevQuarter === 0) {
    prevQuarter = 4;
    prevYear -= 1;
  }
  
  return getQuarterPeriod(prevYear, prevQuarter);
}

function getPreviousYear(): Period {
  const now = new Date();
  return getYearPeriod(now.getFullYear() - 1);
}

interface PeriodProviderProps {
  children: ReactNode;
}

export function PeriodProvider({ children }: PeriodProviderProps) {
  const [periodType, setPeriodTypeState] = useState<PeriodType>('month');
  const [periodView, setPeriodViewState] = useState<PeriodView>('all');
  const [customPeriod, setCustomPeriodState] = useState<Period | null>(null);

  const getCurrentPeriod = (type: PeriodType): Period => {
    switch (type) {
      case 'month':
        return getCurrentMonth();
      case 'quarter':
        return getCurrentQuarter();
      case 'year':
        return getCurrentYear();
      default:
        return getCurrentMonth();
    }
  };

  const getPreviousPeriod = (type: PeriodType): Period => {
    switch (type) {
      case 'month':
        return getPreviousMonth();
      case 'quarter':
        return getPreviousQuarter();
      case 'year':
        return getPreviousYear();
      default:
        return getPreviousMonth();
    }
  };

  const getPeriods = (type: PeriodType, count: number = 12): Period[] => {
    const periods: Period[] = [];
    const now = new Date();
    
    if (type === 'month') {
      for (let i = 0; i < count; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periods.push(getMonthPeriod(date.getFullYear(), date.getMonth() + 1));
      }
    } else if (type === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      for (let i = 0; i < count; i++) {
        let quarter = currentQuarter - i;
        let year = now.getFullYear();
        
        while (quarter <= 0) {
          quarter += 4;
          year -= 1;
        }
        
        periods.push(getQuarterPeriod(year, quarter));
      }
    } else if (type === 'year') {
      for (let i = 0; i < count; i++) {
        periods.push(getYearPeriod(now.getFullYear() - i));
      }
    }
    
    return periods;
  };

  const setPeriodType = (type: PeriodType) => {
    setPeriodTypeState(type);
    setCustomPeriodState(null);
    setPeriodViewState('current');
  };

  const setPeriodView = (view: PeriodView) => {
    setPeriodViewState(view);
    if (view !== 'custom') {
      setCustomPeriodState(null);
    }
  };

  const setCustomPeriod = (period: Period) => {
    setCustomPeriodState(period);
    setPeriodViewState('custom');
  };

  const getAllPeriod = (): Period => {
    return {
      type: 'year',
      value: 'all',
      label: 'Todo el tiempo',
      startDate: new Date(2000, 0, 1),
      endDate: new Date(2100, 11, 31)
    };
  };

  const getCurrentPeriodValue = (): Period => {
    if (periodView === 'all') {
      return getAllPeriod();
    }
    
    if (periodView === 'custom' && customPeriod) {
      return customPeriod;
    }
    
    if (periodView === 'previous') {
      return getPreviousPeriod(periodType);
    }
    
    return getCurrentPeriod(periodType);
  };

  const currentPeriod = getCurrentPeriodValue();

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('periodType', periodType);
    localStorage.setItem('periodView', periodView);
    if (customPeriod) {
      localStorage.setItem('customPeriod', JSON.stringify(customPeriod));
    }
  }, [periodType, periodView, customPeriod]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedType = localStorage.getItem('periodType') as PeriodType;
    const savedView = localStorage.getItem('periodView') as PeriodView;
    const savedCustom = localStorage.getItem('customPeriod');
    
    if (savedType) setPeriodTypeState(savedType);
    if (savedView) {
      setPeriodViewState(savedView);
    } else {
      // Si no hay valor guardado, usar 'all' por defecto
      setPeriodViewState('all');
    }
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        setCustomPeriodState(parsed);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  return (
    <PeriodContext.Provider
      value={{
        currentPeriod,
        periodType,
        periodView,
        setPeriodType,
        setPeriodView,
        setCustomPeriod,
        getPeriods,
        getCurrentPeriod,
        getPreviousPeriod
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
}


