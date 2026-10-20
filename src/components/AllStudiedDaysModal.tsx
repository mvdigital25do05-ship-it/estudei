/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  CalendarCheck, 
  CalendarDays, 
  Clock, 
  FileQuestion, 
  TrendingUp, 
  Award, 
  Flame, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  BookOpen, 
  Coffee, 
  Sparkles, 
  Layers, 
  Percent, 
  ArrowUpDown,
  Download
} from 'lucide-react';
import { ActivityLog, Discipline } from '../types';
import { formatMinutes, getLocalDateString, getLogDateKey } from '../utils';

interface AllStudiedDaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityLogs: ActivityLog[];
  regDate: Date;
  disciplines: Discipline[];
  currentStreak: number;
  recordStreak: number;
}

export interface DayStudySummary {
  dateKey: string;
  dateObj: Date;
  formattedFull: string;
  formattedShort: string;
  weekdayShort: string;
  weekdayFull: string;
  monthYearKey: string;
  monthYearLabel: string;
  isToday: boolean;
  isYesterday: boolean;
  isRestOnly: boolean;
  isEffectiveStudy: boolean;
  totalMinutes: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  disciplines: {
    name: string;
    minutes: number;
    questions: number;
    colorClass?: string;
    types: string[];
  }[];
  logs: ActivityLog[];
  studyTypes: string[];
}

export default function AllStudiedDaysModal({
  isOpen,
  onClose,
  activityLogs,
  regDate,
  disciplines,
  currentStreak,
  recordStreak
}: AllStudiedDaysModalProps) {
  // Navigation & display mode
  const [activeView, setActiveView] = useState<'list' | 'calendar' | 'heatmap'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [includeRestDays, setIncludeRestDays] = useState(false);
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Calendar specific state
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(() => new Date());
  const [selectedCalendarDayKey, setSelectedCalendarDayKey] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build map of discipline color classes
  const disciplineColorMap = useMemo(() => {
    const map = new Map<string, string>();
    disciplines.forEach(d => {
      map.set(d.name.toLowerCase().trim(), d.colorClass || 'emerald');
    });
    return map;
  }, [disciplines]);

  // Aggregate logs into days
  const { allDays, studiedDays, earliestDate, totalDaysSinceStart } = useMemo(() => {
    const dayMap = new Map<string, {
      logs: ActivityLog[];
      totalMinutes: number;
      totalQuestions: number;
      correctAnswers: number;
      wrongAnswers: number;
      disciplinesMap: Map<string, { minutes: number; questions: number; types: Set<string> }>;
      hasRestLog: boolean;
      hasNonRestLog: boolean;
    }>();

    // Process all activity logs
    activityLogs.forEach(log => {
      const dKey = getLogDateKey(log);
      if (!dKey) return;

      if (!dayMap.has(dKey)) {
        dayMap.set(dKey, {
          logs: [],
          totalMinutes: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          disciplinesMap: new Map(),
          hasRestLog: false,
          hasNonRestLog: false
        });
      }

      const dayData = dayMap.get(dKey)!;
      dayData.logs.push(log);

      const isRest = log.disciplineName === 'Dia de Descanso';
      if (isRest) {
        dayData.hasRestLog = true;
      } else {
        dayData.hasNonRestLog = true;
        dayData.totalMinutes += log.timeSpentMin || 0;
        
        const c = log.correctAnswers || 0;
        const w = log.wrongAnswers || 0;
        const q = log.questionsSolved || (c + w);
        dayData.totalQuestions += q;
        dayData.correctAnswers += c;
        dayData.wrongAnswers += w;

        // Discipline stats
        const discName = log.disciplineName || 'Estudos Diversos';
        if (!dayData.disciplinesMap.has(discName)) {
          dayData.disciplinesMap.set(discName, {
            minutes: 0,
            questions: 0,
            types: new Set()
          });
        }
        const dStat = dayData.disciplinesMap.get(discName)!;
        dStat.minutes += log.timeSpentMin || 0;
        dStat.questions += q;
        if (log.studyType) {
          dStat.types.add(log.studyType);
        }
      }
    });

    // Identify start date: min between regDate and earliest recorded log date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedLogDates = Array.from(dayMap.keys()).sort();
    let computedEarliest = new Date(regDate.getTime());
    computedEarliest.setHours(0, 0, 0, 0);

    if (sortedLogDates.length > 0) {
      const [year, month, day] = sortedLogDates[0].split('-').map(Number);
      const firstLogDate = new Date(year, month - 1, day, 0, 0, 0);
      if (firstLogDate.getTime() < computedEarliest.getTime()) {
        computedEarliest = firstLogDate;
      }
    }

    const diffMs = today.getTime() - computedEarliest.getTime();
    const totalDaysSinceStart = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const todayStr = getLocalDateString(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    // Build comprehensive DayStudySummary list
    const summaries: DayStudySummary[] = [];

    dayMap.forEach((data, dateKey) => {
      const parts = dateKey.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

      const isToday = dateKey === todayStr;
      const isYesterday = dateKey === yesterdayStr;
      const isRestOnly = data.hasRestLog && !data.hasNonRestLog;
      const isEffectiveStudy = data.hasNonRestLog;

      const accuracy = data.totalQuestions > 0 
        ? Math.round((data.correctAnswers / Math.max(1, data.correctAnswers + data.wrongAnswers || data.totalQuestions)) * 100)
        : 0;

      const weekdayFull = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const capitalizedWeekday = weekdayFull.charAt(0).toUpperCase() + weekdayFull.slice(1);
      const formattedFull = `${capitalizedWeekday}, ${dateObj.getDate()} de ${dateObj.toLocaleDateString('pt-BR', { month: 'long' })} de ${dateObj.getFullYear()}`;
      const formattedShort = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const weekdayShort = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();

      const monthYearKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
      const monthYearLabel = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${dateObj.getFullYear()}`;

      // Convert disciplines
      const disciplinesList = Array.from(data.disciplinesMap.entries()).map(([name, stat]) => ({
        name,
        minutes: stat.minutes,
        questions: stat.questions,
        colorClass: disciplineColorMap.get(name.toLowerCase().trim()) || 'emerald',
        types: Array.from(stat.types)
      })).sort((a, b) => b.minutes - a.minutes);

      // Collect unique study types
      const studyTypesSet = new Set<string>();
      data.logs.forEach(l => {
        if (l.studyType) studyTypesSet.add(l.studyType);
      });

      summaries.push({
        dateKey,
        dateObj,
        formattedFull,
        formattedShort,
        weekdayShort,
        weekdayFull: capitalizedWeekday,
        monthYearKey,
        monthYearLabel,
        isToday,
        isYesterday,
        isRestOnly,
        isEffectiveStudy,
        totalMinutes: data.totalMinutes,
        totalQuestions: data.totalQuestions,
        correctAnswers: data.correctAnswers,
        wrongAnswers: data.wrongAnswers,
        accuracy,
        disciplines: disciplinesList,
        logs: data.logs,
        studyTypes: Array.from(studyTypesSet)
      });
    });

    // Sort summaries descending by date
    summaries.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    const effectiveStudied = summaries.filter(s => s.isEffectiveStudy);

    return {
      allDays: summaries,
      studiedDays: effectiveStudied,
      earliestDate: computedEarliest,
      totalDaysSinceStart
    };
  }, [activityLogs, regDate, disciplineColorMap]);

  // Global aggregate metrics
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    const disciplineMinutes = new Map<string, number>();

    studiedDays.forEach(day => {
      totalMinutes += day.totalMinutes;
      totalQuestions += day.totalQuestions;
      totalCorrect += day.correctAnswers;
      totalWrong += day.wrongAnswers;

      day.disciplines.forEach(d => {
        const cur = disciplineMinutes.get(d.name) || 0;
        disciplineMinutes.set(d.name, cur + d.minutes);
      });
    });

    const totalDaysCount = studiedDays.length;
    const avgMinutesPerDay = totalDaysCount > 0 ? Math.round(totalMinutes / totalDaysCount) : 0;
    const consistencyRate = Math.min(100, Math.round((totalDaysCount / totalDaysSinceStart) * 100));
    const overallAccuracy = (totalCorrect + totalWrong) > 0 
      ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100)
      : (totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);

    let topDiscipline = 'Nenhuma';
    let maxMin = 0;
    disciplineMinutes.forEach((mins, name) => {
      if (mins > maxMin && name !== 'Presença nos Estudos') {
        maxMin = mins;
        topDiscipline = name;
      }
    });

    return {
      totalDaysCount,
      totalMinutes,
      totalQuestions,
      totalCorrect,
      overallAccuracy,
      avgMinutesPerDay,
      consistencyRate,
      topDiscipline,
      topDisciplineTime: maxMin
    };
  }, [studiedDays, totalDaysSinceStart]);

  // Distinct available months for filtering
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    allDays.forEach(day => {
      if (!map.has(day.monthYearKey)) {
        map.set(day.monthYearKey, day.monthYearLabel);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allDays]);

  // Distinct disciplines for filtering
  const availableDisciplines = useMemo(() => {
    const set = new Set<string>();
    studiedDays.forEach(d => {
      d.disciplines.forEach(disc => {
        if (disc.name && disc.name !== 'Presença nos Estudos') {
          set.add(disc.name);
        }
      });
    });
    return Array.from(set).sort();
  }, [studiedDays]);

  // Filtered days list for the view
  const filteredDays = useMemo(() => {
    const source = includeRestDays ? allDays : studiedDays;

    return source.filter(day => {
      // Month filter
      if (selectedMonth !== 'all' && day.monthYearKey !== selectedMonth) {
        return false;
      }

      // Discipline filter
      if (selectedDiscipline !== 'all') {
        const hasDisc = day.disciplines.some(d => d.name.toLowerCase() === selectedDiscipline.toLowerCase());
        if (!hasDisc) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDate = day.formattedFull.toLowerCase().includes(q) || day.formattedShort.includes(q) || day.dateKey.includes(q);
        const matchDisc = day.disciplines.some(d => d.name.toLowerCase().includes(q));
        const matchLogs = day.logs.some(l => (l.details || '').toLowerCase().includes(q) || (l.disciplineName || '').toLowerCase().includes(q));
        if (!matchDate && !matchDisc && !matchLogs) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.dateKey.localeCompare(a.dateKey);
      }
      return a.dateKey.localeCompare(b.dateKey);
    });
  }, [allDays, studiedDays, includeRestDays, selectedMonth, selectedDiscipline, searchQuery, sortOrder]);

  // Group filtered days by Month for structured list presentation
  const groupedDays = useMemo(() => {
    const groups: { monthKey: string; monthLabel: string; days: DayStudySummary[]; totalMinutes: number; totalQuestions: number }[] = [];
    const groupMap = new Map<string, typeof groups[0]>();

    filteredDays.forEach(day => {
      if (!groupMap.has(day.monthYearKey)) {
        const entry = {
          monthKey: day.monthYearKey,
          monthLabel: day.monthYearLabel,
          days: [],
          totalMinutes: 0,
          totalQuestions: 0
        };
        groupMap.set(day.monthYearKey, entry);
        groups.push(entry);
      }
      const entry = groupMap.get(day.monthYearKey)!;
      entry.days.push(day);
      entry.totalMinutes += day.totalMinutes;
      entry.totalQuestions += day.totalQuestions;
    });

    return groups;
  }, [filteredDays]);

  // Calendar matrix generation
  const calendarData = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startWeekday = firstDayOfMonth.getDay(); // 0 is Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    // Map existing days by dateKey
    const dayMap = new Map<string, DayStudySummary>();
    allDays.forEach(d => {
      dayMap.set(d.dateKey, d);
    });

    const cells: {
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      data?: DayStudySummary;
      isToday: boolean;
    }[] = [];

    // Preceding empty/previous month days
    for (let i = 0; i < startWeekday; i++) {
      const prevDate = new Date(year, month, 1 - (startWeekday - i));
      const k = getLocalDateString(prevDate);
      cells.push({
        dayNumber: prevDate.getDate(),
        dateKey: k,
        isCurrentMonth: false,
        data: dayMap.get(k),
        isToday: k === getLocalDateString(new Date())
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(year, month, day);
      const k = getLocalDateString(curDate);
      cells.push({
        dayNumber: day,
        dateKey: k,
        isCurrentMonth: true,
        data: dayMap.get(k),
        isToday: k === getLocalDateString(new Date())
      });
    }

    // Trailing days to fill 7 columns up to full rows
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const nextDate = new Date(year, month + 1, j);
      const k = getLocalDateString(nextDate);
      cells.push({
        dayNumber: nextDate.getDate(),
        dateKey: k,
        isCurrentMonth: false,
        data: dayMap.get(k),
        isToday: k === getLocalDateString(new Date())
      });
    }

    const monthLabel = calendarMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    return {
      cells,
      monthLabel: capitalizedMonthLabel,
      year,
      month
    };
  }, [calendarMonthDate, allDays]);

  // Heatmap generation: all days from earliestDate up to today
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(earliestDate.getTime());
    // Align start to preceding Sunday so columns align nicely
    const startDayOfWeek = start.getDay();
    start.setDate(start.getDate() - startDayOfWeek);

    const end = new Date(today.getTime());
    // Align end to Saturday of current week
    const endDayOfWeek = end.getDay();
    end.setDate(end.getDate() + (6 - endDayOfWeek));

    const dayMap = new Map<string, DayStudySummary>();
    allDays.forEach(d => {
      dayMap.set(d.dateKey, d);
    });

    const weeks: {
      days: {
        dateKey: string;
        dayNumber: number;
        month: number;
        dateObj: Date;
        data?: DayStudySummary;
        isFuture: boolean;
      }[];
    }[] = [];

    let curDate = new Date(start.getTime());
    let curWeek: typeof weeks[0]['days'] = [];

    while (curDate.getTime() <= end.getTime()) {
      const k = getLocalDateString(curDate);
      const isFuture = curDate.getTime() > today.getTime();

      curWeek.push({
        dateKey: k,
        dayNumber: curDate.getDate(),
        month: curDate.getMonth(),
        dateObj: new Date(curDate.getTime()),
        data: dayMap.get(k),
        isFuture
      });

      if (curWeek.length === 7) {
        weeks.push({ days: curWeek });
        curWeek = [];
      }

      curDate.setDate(curDate.getDate() + 1);
    }

    if (curWeek.length > 0) {
      weeks.push({ days: curWeek });
    }

    return { weeks };
  }, [earliestDate, allDays]);

  // Copy full summary report to clipboard
  const handleCopySummary = () => {
    const startFormatted = earliestDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let text = `📊 RELATÓRIO DE DIAS EFETIVAMENTE ESTUDADOS\n`;
    text += `===============================================\n`;
    text += `Início das marcações: ${startFormatted}\n`;
    text += `Total de dias estudados: ${stats.totalDaysCount} dias\n`;
    text += `Constância geral: ${stats.consistencyRate}% dos dias desde o início\n`;
    text += `Carga horária acumulada: ${formatMinutes(stats.totalMinutes)}\n`;
    text += `Média diária: ${formatMinutes(stats.avgMinutesPerDay)} por dia de estudo\n`;
    text += `Questões resolvidas: ${stats.totalQuestions} (${stats.overallAccuracy}% de acertos)\n`;
    text += `Sequência atual: ${currentStreak} dias | Recorde: ${recordStreak} dias\n`;
    text += `===============================================\n\n`;
    text += `HISTÓRICO COMPLETO DOS DIAS ESTUDADOS:\n`;

    studiedDays.forEach((day, idx) => {
      text += `\n${idx + 1}. ${day.formattedFull}\n`;
      text += `   • Tempo: ${formatMinutes(day.totalMinutes)}\n`;
      if (day.totalQuestions > 0) {
        text += `   • Questões: ${day.totalQuestions} (${day.accuracy}% de acerto)\n`;
      }
      if (day.disciplines.length > 0) {
        const discStr = day.disciplines.map(d => `${d.name} (${formatMinutes(d.minutes)}${d.questions > 0 ? `, ${d.questions}Q` : ''})`).join(', ');
        text += `   • Disciplinas: ${discStr}\n`;
      }
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 3000);
    });
  };

  if (!isOpen) return null;

  const firstDateFormatted = earliestDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div 
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-850/60 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 mt-0.5 border border-emerald-500/20">
              <CalendarCheck size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-lg sm:text-xl text-slate-800 dark:text-white uppercase tracking-wider">
                  Dias Efetivamente Estudados
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40">
                  {stats.totalDaysCount} {stats.totalDaysCount === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Histórico completo e detalhado desde que você começou a marcar (<strong className="text-slate-700 dark:text-slate-200">{firstDateFormatted}</strong> • {totalDaysSinceStart} {totalDaysSinceStart === 1 ? 'dia corrido' : 'dias corridos'}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-400 transition-all shadow-3xs cursor-pointer active:scale-95"
              title="Copiar relatório completo em texto"
            >
              {copiedSummary ? (
                <>
                  <Check size={14} className="text-emerald-500 stroke-[3]" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar Relatório</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Fechar (Esc)"
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top Key Metrics Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
          {/* Card 1: Total Days & Consistency */}
          <div className="bg-slate-50/80 dark:bg-slate-850/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              <span>Dias Estudados</span>
              <CalendarCheck size={13} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-2xl text-slate-850 dark:text-white">
                {stats.totalDaysCount}
              </span>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                / {totalDaysSinceStart} dias
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                {stats.consistencyRate}% constância
              </span>
            </div>
          </div>

          {/* Card 2: Total Study Time */}
          <div className="bg-slate-50/80 dark:bg-slate-850/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              <span>Tempo Acumulado</span>
              <Clock size={13} className="text-blue-500" />
            </div>
            <div className="font-display font-black text-2xl text-slate-850 dark:text-white">
              {formatMinutes(stats.totalMinutes)}
            </div>
            <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Média de <strong className="text-slate-700 dark:text-slate-200">{formatMinutes(stats.avgMinutesPerDay)}</strong> por dia
            </div>
          </div>

          {/* Card 3: Questions & Accuracy */}
          <div className="bg-slate-50/80 dark:bg-slate-850/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              <span>Questões Feitas</span>
              <FileQuestion size={13} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-2xl text-slate-850 dark:text-white">
                {stats.totalQuestions}
              </span>
              {stats.totalQuestions > 0 && (
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats.overallAccuracy}%
                </span>
              )}
            </div>
            <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {stats.totalCorrect} acertos registrados
            </div>
          </div>

          {/* Card 4: Streak & Record */}
          <div className="bg-slate-50/80 dark:bg-slate-850/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              <span>Sequência</span>
              <Flame size={13} className="text-orange-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-2xl text-emerald-600 dark:text-emerald-400">
                {currentStreak} <span className="text-xs font-bold text-slate-400">{currentStreak === 1 ? 'dia' : 'dias'}</span>
              </span>
            </div>
            <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Award size={11} className="text-amber-500" />
              <span>Recorde: <strong className="text-slate-700 dark:text-slate-200">{recordStreak} {recordStreak === 1 ? 'dia' : 'dias'}</strong></span>
            </div>
          </div>
        </div>

        {/* View Switcher & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* View Modes Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>Lista Detalhada</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Calendar size={14} />
              <span>Calendário Mensal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('heatmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'heatmap'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles size={14} />
              <span>Mapa de Constância</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[160px] flex-1 sm:flex-initial">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar data ou matéria..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-white font-medium placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Month Filter */}
            {availableMonths.length > 1 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Todos os meses ({availableMonths.length})</option>
                {availableMonths.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            )}

            {/* Discipline Filter */}
            {availableDisciplines.length > 0 && (
              <select
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">Todas as matérias</option>
                {availableDisciplines.map(dName => (
                  <option key={dName} value={dName}>{dName}</option>
                ))}
              </select>
            )}

            {/* Sort toggle (for list view) */}
            {activeView === 'list' && (
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title={sortOrder === 'desc' ? 'Ordenado: Mais recentes primeiro' : 'Ordenado: Mais antigos primeiro'}
              >
                <ArrowUpDown size={14} />
              </button>
            )}

            {/* Include Rest Days toggle */}
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-bold cursor-pointer select-none ml-1">
              <input
                type="checkbox"
                checked={includeRestDays}
                onChange={(e) => setIncludeRestDays(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Incluir Descansos</span>
            </label>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-slate-950/40">
          
          {/* VIEW 1: DETAILED LIST */}
          {activeView === 'list' && (
            <div className="space-y-6">
              {groupedDays.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-10 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <CalendarCheck size={24} />
                  </div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    Nenhum dia encontrado com os filtros selecionados
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Tente limpar a pesquisa ou selecionar outro mês/matéria para visualizar seus registros de estudo.
                  </p>
                  {(searchQuery || selectedMonth !== 'all' || selectedDiscipline !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedMonth('all');
                        setSelectedDiscipline('all');
                      }}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Limpar todos os filtros
                    </button>
                  )}
                </div>
              ) : (
                groupedDays.map(group => (
                  <div key={group.monthKey} className="space-y-3">
                    {/* Month Group Header */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-3xs sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-emerald-500" />
                        <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                          {group.monthLabel}
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                          • {group.days.length} {group.days.length === 1 ? 'dia estudado' : 'dias estudados'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs font-extrabold text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Clock size={12} />
                          {formatMinutes(group.totalMinutes)}
                        </span>
                        {group.totalQuestions > 0 && (
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <FileQuestion size={12} />
                            {group.totalQuestions}Q
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Days in Month */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {group.days.map(day => {
                        const isExpanded = expandedDayKey === day.dateKey;

                        return (
                          <div
                            key={day.dateKey}
                            className={`bg-white dark:bg-slate-900 rounded-xl border transition-all ${
                              day.isToday 
                                ? 'border-emerald-400 dark:border-emerald-600 shadow-md ring-1 ring-emerald-400/30' 
                                : day.isRestOnly
                                  ? 'border-blue-200 dark:border-blue-900/60'
                                  : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 shadow-3xs'
                            }`}
                          >
                            {/* Card Main Row */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left: Date & Status */}
                              <div className="flex items-center gap-3.5">
                                {/* Date Box */}
                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono shrink-0 shadow-xs border ${
                                  day.isRestOnly 
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800'
                                }`}>
                                  <span className="text-[10px] font-black uppercase leading-none tracking-wider">
                                    {day.weekdayShort}
                                  </span>
                                  <span className="text-lg font-black leading-tight">
                                    {day.dateObj.getDate().toString().padStart(2, '0')}
                                  </span>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-extrabold text-sm text-slate-850 dark:text-white">
                                      {day.formattedFull}
                                    </h4>
                                    {day.isToday && (
                                      <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider">
                                        Hoje
                                      </span>
                                    )}
                                    {day.isYesterday && (
                                      <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[9px] font-bold uppercase tracking-wider">
                                        Ontem
                                      </span>
                                    )}
                                    {day.isRestOnly && (
                                      <span className="flex items-center gap-1 px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[9px] font-extrabold">
                                        <Coffee size={10} /> Descanso
                                      </span>
                                    )}
                                  </div>

                                  {/* Disciplines Chips */}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    {day.disciplines.length === 0 ? (
                                      <span className="text-xs text-slate-400 italic">
                                        {day.isRestOnly ? 'Dia de pausa e recarga de energias' : 'Presença confirmada manualmente'}
                                      </span>
                                    ) : (
                                      day.disciplines.map((disc, dIdx) => (
                                        <span
                                          key={dIdx}
                                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          {disc.name}: <strong className="font-black text-slate-900 dark:text-white">{formatMinutes(disc.minutes)}</strong>
                                          {disc.questions > 0 && <span className="text-slate-400 font-normal">({disc.questions}Q)</span>}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Metrics & Expand Action */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                  {/* Time badge */}
                                  <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/80 font-black text-xs flex items-center gap-1">
                                    <Clock size={12} className="stroke-[2.5]" />
                                    <span>{formatMinutes(day.totalMinutes)}</span>
                                  </div>

                                  {/* Questions badge */}
                                  {day.totalQuestions > 0 && (
                                    <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/80 font-black text-xs flex items-center gap-1">
                                      <FileQuestion size={12} className="stroke-[2.5]" />
                                      <span>{day.totalQuestions}Q</span>
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">({day.accuracy}%)</span>
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setExpandedDayKey(isExpanded ? null : day.dateKey)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                  title={isExpanded ? 'Recolher detalhes' : 'Ver sessões deste dia'}
                                  aria-label="Expandir detalhes do dia"
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Sessions Drawer */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 rounded-b-xl space-y-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                  Sessões e Registros Deste Dia ({day.logs.length})
                                </p>

                                <div className="space-y-1.5">
                                  {day.logs.map((log) => {
                                    const c = log.correctAnswers || 0;
                                    const w = log.wrongAnswers || 0;
                                    const q = log.questionsSolved || (c + w);

                                    return (
                                      <div
                                        key={log.id}
                                        className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-slate-800 dark:text-white">
                                            {log.disciplineName}
                                          </span>
                                          {log.studyType && (
                                            <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded">
                                              {log.studyType}
                                            </span>
                                          )}
                                          {log.timestamp && (
                                            <span className="text-[10px] text-slate-400">
                                              • {log.timestamp}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                          {log.details && (
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                              {log.details}
                                            </span>
                                          )}
                                          <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                            {formatMinutes(log.timeSpentMin || 0)}
                                          </span>
                                          {q > 0 && (
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                                              {q} questões ({c}A / {w}E)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW 2: MONTHLY CALENDAR */}
          {activeView === 'calendar' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
              {/* Calendar Month Navigation Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-500" />
                  <h3 className="font-display font-black text-base text-slate-850 dark:text-white uppercase tracking-wider">
                    {calendarData.monthLabel}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1);
                      setCalendarMonthDate(prev);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Mês anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalendarMonthDate(new Date())}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 rounded-lg transition-colors"
                  >
                    Mês Atual
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 1);
                      setCalendarMonthDate(next);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Próximo mês"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((dName, idx) => (
                  <div key={idx} className="text-[10px] font-black uppercase text-slate-400 py-1">
                    {dName}
                  </div>
                ))}
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarData.cells.map((cell, idx) => {
                  const isStudied = cell.data?.isEffectiveStudy;
                  const isRest = cell.data?.isRestOnly;
                  const isSelected = selectedCalendarDayKey === cell.dateKey;

                  let cellClasses = 'min-h-[64px] sm:min-h-[76px] p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative ';
                  
                  if (!cell.isCurrentMonth) {
                    cellClasses += 'opacity-30 bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400 ';
                  } else if (isSelected) {
                    cellClasses += 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-400 ';
                  } else if (isStudied) {
                    cellClasses += 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-3xs ';
                  } else if (isRest) {
                    cellClasses += 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 ';
                  } else {
                    cellClasses += 'bg-slate-50/80 dark:bg-slate-850/40 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 ';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCalendarDayKey(cell.dateKey)}
                      className={cellClasses}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-black ${cell.isToday ? 'bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center -ml-0.5 -mt-0.5' : ''}`}>
                          {cell.dayNumber}
                        </span>

                        {isStudied && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="Dia estudado" />
                        )}
                        {isRest && (
                          <Coffee size={10} className="text-blue-500" title="Dia de descanso" />
                        )}
                      </div>

                      {cell.data && cell.data.totalMinutes > 0 && (
                        <div className="mt-1">
                          <span className="text-[10px] font-black block text-emerald-700 dark:text-emerald-300 leading-tight">
                            {formatMinutes(cell.data.totalMinutes)}
                          </span>
                          {cell.data.totalQuestions > 0 && (
                            <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 block leading-none">
                              {cell.data.totalQuestions}Q
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Inspector */}
              {selectedCalendarDayKey && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                  {(() => {
                    const selDay = allDays.find(d => d.dateKey === selectedCalendarDayKey);
                    if (!selDay) {
                      return (
                        <div className="text-center py-2 text-xs text-slate-400">
                          Data: <strong>{selectedCalendarDayKey}</strong> — Nenhum registro de estudo encontrado para este dia.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                              {selDay.formattedFull}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {selDay.isEffectiveStudy ? 'Dia com estudo registrado com sucesso!' : 'Dia marcado como descanso.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-black">
                              ⏱️ {formatMinutes(selDay.totalMinutes)}
                            </span>
                            {selDay.totalQuestions > 0 && (
                              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-black">
                                📝 {selDay.totalQuestions}Q ({selDay.accuracy}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Disciplines breakdown */}
                        {selDay.disciplines.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                            {selDay.disciplines.map((d, dIdx) => (
                              <div
                                key={dIdx}
                                className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                              >
                                {d.name}: <strong className="text-emerald-600 dark:text-emerald-400">{formatMinutes(d.minutes)}</strong>
                                {d.questions > 0 && <span className="text-slate-400 text-[10px] ml-1">({d.questions}Q)</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: HEATMAP (GITHUB-STYLE ALL TIME CONSISTENCY) */}
          {activeView === 'heatmap' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-display font-black text-base text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-500" />
                    Mapa de Constância de Estudos
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Visão global de todos os dias e intensidades de estudo desde o seu primeiro registro ({firstDateFormatted}).
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 self-end sm:self-auto">
                  <span>Menos</span>
                  <span className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title="Sem estudo" />
                  <span className="w-3 h-3 rounded-xs bg-emerald-200 dark:bg-emerald-900" title="Até 45min" />
                  <span className="w-3 h-3 rounded-xs bg-emerald-400 dark:bg-emerald-700" title="45min ~ 2h" />
                  <span className="w-3 h-3 rounded-xs bg-emerald-600 dark:bg-emerald-500" title="2h ~ 4h" />
                  <span className="w-3 h-3 rounded-xs bg-emerald-800 dark:bg-emerald-300" title="Mais de 4h" />
                  <span>Mais</span>
                </div>
              </div>

              {/* Heatmap Matrix Scrollable */}
              <div className="overflow-x-auto pb-2 scrollbar-thin">
                <div className="flex gap-1.5 min-w-max py-2">
                  {heatmapData.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1.5">
                      {week.days.map((day, dIdx) => {
                        const m = day.data?.totalMinutes || 0;
                        const isStudied = day.data?.isEffectiveStudy;
                        const isRest = day.data?.isRestOnly;

                        let colorClass = 'bg-slate-100 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60';
                        if (day.isFuture) {
                          colorClass = 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 opacity-40';
                        } else if (isRest) {
                          colorClass = 'bg-blue-300 dark:bg-blue-800 border-blue-400 dark:border-blue-700';
                        } else if (isStudied) {
                          if (m <= 45) {
                            colorClass = 'bg-emerald-200 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-800';
                          } else if (m <= 120) {
                            colorClass = 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600';
                          } else if (m <= 240) {
                            colorClass = 'bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400';
                          } else {
                            colorClass = 'bg-emerald-800 dark:bg-emerald-300 border-emerald-900 dark:border-emerald-200';
                          }
                        }

                        const tooltip = `${day.data?.formattedFull || day.dateKey}: ${isStudied ? `${formatMinutes(m)} estudados` : isRest ? 'Dia de descanso' : 'Sem registros'}`;

                        return (
                          <div
                            key={dIdx}
                            className={`w-3.5 h-3.5 rounded-xs border transition-transform hover:scale-125 cursor-pointer ${colorClass}`}
                            title={tooltip}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Check size={14} className="text-emerald-500 stroke-[3]" />
                  Você estudou em <strong className="text-emerald-600 dark:text-emerald-400">{stats.totalDaysCount}</strong> dias diferentes desde o início do seu planejamento.
                </span>
                <span className="font-black text-slate-800 dark:text-white">
                  Média de {formatMinutes(stats.avgMinutesPerDay)} por dia ativo
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <CalendarCheck size={14} className="text-emerald-500" />
            <span>
              Exibindo <strong>{filteredDays.length}</strong> de <strong>{studiedDays.length}</strong> dias estudados
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3.5 py-2 font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Copy size={13} />
              <span>Copiar Dados</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
