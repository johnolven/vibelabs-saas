'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePeriod, Period, PeriodType } from '@/contexts/PeriodContext';

export default function PeriodSelector() {
  const {
    currentPeriod,
    periodType,
    periodView,
    setPeriodType,
    setPeriodView,
    setCustomPeriod,
    getPeriods,
    getCurrentPeriod,
    getPreviousPeriod
  } = usePeriod();

  const [isOpen, setIsOpen] = useState(false);
  const [showCustomSelector, setShowCustomSelector] = useState(false);

  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type);
    setIsOpen(false);
  };

  const handlePeriodViewChange = (view: 'current' | 'previous') => {
    setPeriodView(view);
    setIsOpen(false);
  };

  const handleCustomPeriodSelect = (period: Period) => {
    setCustomPeriod(period);
    setShowCustomSelector(false);
    setIsOpen(false);
  };

  const periods = getPeriods(periodType, periodType === 'month' ? 12 : periodType === 'quarter' ? 8 : 5);

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-all ${
          isOpen 
            ? 'bg-primary/10 border border-primary/20' 
            : 'bg-secondary/50 border border-transparent hover:bg-secondary hover:border-border'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium truncate">{currentPeriod.label}</span>
        </div>
        <svg 
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 w-full min-w-[280px] bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Period Type Selector */}
              <div className="p-4 bg-muted/30 border-b border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Tipo de Período</div>
                <div className="flex gap-2">
                  {(['month', 'quarter', 'year'] as PeriodType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => handlePeriodTypeChange(type)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        periodType === type
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {type === 'month' ? 'Mes' : type === 'quarter' ? 'Trimestre' : 'Año'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Select */}
              <div className="p-4 border-b border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">Vista Rápida</div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handlePeriodViewChange('all')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      periodView === 'all'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Todo el tiempo</span>
                      {periodView === 'all' && (
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => handlePeriodViewChange('current')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      periodView === 'current' && !showCustomSelector
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{getCurrentPeriod(periodType).label}</span>
                      {periodView === 'current' && !showCustomSelector && (
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => handlePeriodViewChange('previous')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      periodView === 'previous' && !showCustomSelector
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{getPreviousPeriod(periodType).label}</span>
                      {periodView === 'previous' && !showCustomSelector && (
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setShowCustomSelector(!showCustomSelector)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      showCustomSelector
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Seleccionar {periodType === 'month' ? 'Mes' : periodType === 'quarter' ? 'Trimestre' : 'Año'}...</span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${showCustomSelector ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Period Selector */}
              <AnimatePresence>
                {showCustomSelector && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 max-h-64 overflow-y-auto">
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wider">
                        Seleccionar {periodType === 'month' ? 'Mes' : periodType === 'quarter' ? 'Trimestre' : 'Año'}
                      </div>
                      <div className="space-y-1">
                        {periods.map((period) => (
                          <button
                            key={period.value}
                            onClick={() => handleCustomPeriodSelect(period)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              periodView === 'custom' && currentPeriod.value === period.value
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'hover:bg-muted/50 text-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{period.label}</span>
                              {periodView === 'custom' && currentPeriod.value === period.value && (
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

