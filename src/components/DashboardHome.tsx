/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  Sparkles, 
  Calendar, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Hourglass,
  Clock,
  BookOpen,
  PlusCircle,
  FileQuestion,
  UserCheck,
  BarChart2,
  PieChart,
  TrendingUp,
  Layers,
  Filter,
  Coffee,
  Target,
  Percent,
  History,
  CalendarCheck
} from 'lucide-react';
import AllStudiedDaysModal from './AllStudiedDaysModal';
import { Discipline, Reminder, ActivityLog, StreakDay, ExerciseLog } from '../types';
import { MOTIVATIONAL_QUOTES } from '../data';
import { formatMinutes, formatHours, getLocalDateString, getLogDateKey } from '../utils';

interface DashboardHomeProps {
  disciplines: Discipline[];
  reminders: Reminder[];
  onAddReminder: (text: string, type: 'INSCRIÇÕES' | 'PROVAS' | 'GERAL', date: string) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  activityLogs: ActivityLog[];
  exerciseLogs?: ExerciseLog[];
  onDeleteActivityLog: (id: string) => void;
  onUpdateDisciplineTime?: (id: string, timeMin: number) => void;
  onUpdateWeeklyGoals?: (hoursTotal: number, questionsTotal: number, hoursDone?: number, questionsDone?: number) => void;
  weeklyGoalsHours: { done: number; total: number };
  weeklyGoalsQuestions: { done: number; total: number };
  weeklyGoalsReviews: { done: number; total: number };
  onAddStudySession: (session: {
    disciplineId: string;
    hours: number;
    minutes: number;
    type: 'Teoria' | 'Questões' | 'Revisão' | 'Simulado';
    material: string;
    correct?: number;
    wrong?: number;
    notes?: string;
    topicId?: string;
    concludeTopic?: boolean;
    date?: string;
  }) => void;
  activeProfileName: string;
  profilesCount: number;
  onCreateProfile: (name: string, templateType: string, initialDisciplines?: Discipline[]) => void;
  examDate?: string;
  examName?: string;
  onUpdateExamInfo?: (name: string, date: string) => void;
  onToggleStudyDay?: (dateKey: string, newStatus: 'completed' | 'rest' | 'none') => void;
  activeProfileCreatedAt?: string;
  userCreatedAt?: string;
}

export default function DashboardHome({
  disciplines,
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  activityLogs,
  exerciseLogs = [],
  onDeleteActivityLog,
  onUpdateDisciplineTime,
  onUpdateWeeklyGoals,
  weeklyGoalsHours,
  weeklyGoalsQuestions,
  weeklyGoalsReviews,
  onAddStudySession,
  activeProfileName,
  profilesCount,
  onCreateProfile,
  examDate = '',
  examName = '',
  onUpdateExamInfo,
  onToggleStudyDay,
  activeProfileCreatedAt = '',
  userCreatedAt = ''
}: DashboardHomeProps) {
  // Local state for motivational quotes
  const [quoteIndex, setQuoteIndex] = useState(0);

  // States for dynamic exam editing
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [tempExamName, setTempExamName] = useState(examName || '');
  const [tempExamDate, setTempExamDate] = useState(examDate || '');

  useEffect(() => {
    setTempExamName(examName || '');
    setTempExamDate(examDate || '');
  }, [examName, examDate]);

  const countdownCalc = useMemo(() => {
    if (!examDate) {
      return { days: 0, text: 'Nenhuma prova salva', displayDate: 'Toque para cadastrar manualmente' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = examDate.split('-');
    if (parts.length !== 3) {
      return { days: 0, text: 'Data inválida', displayDate: 'Insira no formato AAAA-MM-DD' };
    }
    const examYear = parseInt(parts[0], 10);
    const examMonth = parseInt(parts[1], 10) - 1;
    const examDay = parseInt(parts[2], 10);
    const examDateTime = new Date(examYear, examMonth, examDay);

    const diffTime = examDateTime.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const weekdayMap = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
    const monthMap = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const weekday = weekdayMap[examDateTime.getDay()];
    const day = examDateTime.getDate();
    const month = monthMap[examDateTime.getMonth()];
    const year = examDateTime.getFullYear();
    const displayDate = `${weekday}, ${day} de ${month} de ${year}`;

    return {
      days: Math.max(0, diffDays),
      text: diffDays < 0 ? 'Já realizada' : `${diffDays} Dias Restantes`,
      displayDate
    };
  }, [examDate]);

  // Onboard profile creation states
  const [onboardName, setOnboardName] = useState('');
  const [onboardTemplate, setOnboardTemplate] = useState('Policial');
  
  // Local state for adding reminders
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderType, setNewReminderType] = useState<'INSCRIÇÕES' | 'PROVAS' | 'GERAL'>('GERAL');
  const [newReminderDate, setNewReminderDate] = useState('');

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // New Study Session Add States
  const [showAddStudyModal, setShowAddStudyModal] = useState(false);
  const [studyDisciplineId, setStudyDisciplineId] = useState(disciplines[0]?.id || '');
  const [studyHours, setStudyHours] = useState<number | ''>(1);
  const [studyMinutes, setStudyMinutes] = useState<number | ''>(0);
  const [studyType, setStudyType] = useState<'Teoria' | 'Questões' | 'Revisão' | 'Simulado'>('Teoria');
  const [studyMaterial, setStudyMaterial] = useState('PDF');
  const [studyCorrect, setStudyCorrect] = useState(0);
  const [studyWrong, setStudyWrong] = useState(0);
  const [studyNotes, setStudyNotes] = useState('');
  const [studyTopicId, setStudyTopicId] = useState('');
  const [studyConcludeTopic, setStudyConcludeTopic] = useState(false);
  const [studyDate, setStudyDate] = useState(getTodayDateString);

  // Local states for adjusting accumulated study hours
  const [showAdjustHoursModal, setShowAdjustHoursModal] = useState(false);
  const [adjustDisciplineId, setAdjustDisciplineId] = useState('');
  const [adjustHours, setAdjustHours] = useState<number | ''>(0);
  const [adjustMinutes, setAdjustMinutes] = useState<number | ''>(0);

  const handleSelectDisciplineToAdjust = (disciplineId: string) => {
    setAdjustDisciplineId(disciplineId);
    const disc = disciplines.find(d => d.id === disciplineId);
    if (disc) {
      const mins = Number(disc.timeSpentMin) || 0;
      setAdjustHours(Math.floor(mins / 60));
      setAdjustMinutes(mins % 60);
    } else {
      setAdjustHours(0);
      setAdjustMinutes(0);
    }
  };

  const handleSaveDisciplineAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustDisciplineId || !onUpdateDisciplineTime) return;
    const h = parseInt(String(adjustHours), 10) || 0;
    const m = parseInt(String(adjustMinutes), 10) || 0;
    const totalMin = (h * 60) + m;
    onUpdateDisciplineTime(adjustDisciplineId, totalMin);
    setShowAdjustHoursModal(false);
  };

  // Local states for adjusting weekly study goals
  const [showEditGoalsModal, setShowEditGoalsModal] = useState(false);
  const [newGoalsHours, setNewGoalsHours] = useState(weeklyGoalsHours.total);
  const [newGoalsQuestions, setNewGoalsQuestions] = useState(weeklyGoalsQuestions.total);
  const [newGoalsHoursDone, setNewGoalsHoursDone] = useState(weeklyGoalsHours.done);
  const [newGoalsQuestionsDone, setNewGoalsQuestionsDone] = useState(weeklyGoalsQuestions.done);

  // Local states for manually correcting/adjusting weekly chart study logs
  const [showAdjustChartModal, setShowAdjustChartModal] = useState(false);
  const [adjustChartDate, setAdjustChartDate] = useState(getTodayDateString);
  const [adjustChartDisciplineId, setAdjustChartDisciplineId] = useState('');
  const [adjustChartHours, setAdjustChartHours] = useState<number>(1);
  const [adjustChartMinutes, setAdjustChartMinutes] = useState<number>(0);
  const [adjustChartQuestions, setAdjustChartQuestions] = useState<number>(0);
  const [adjustChartCorrect, setAdjustChartCorrect] = useState<number>(0);
  const [adjustChartWrong, setAdjustChartWrong] = useState<number>(0);
  const [adjustChartType, setAdjustChartType] = useState<'Teoria' | 'Questões' | 'Revisão' | 'Simulado'>('Teoria');

  const openAdjustChartForDate = (dateKey?: string) => {
    setAdjustChartDate(dateKey || getTodayDateString());
    if (disciplines.length > 0) {
      setAdjustChartDisciplineId(disciplines[0].id);
    }
    setAdjustChartHours(1);
    setAdjustChartMinutes(0);
    setAdjustChartQuestions(0);
    setAdjustChartCorrect(0);
    setAdjustChartWrong(0);
    setAdjustChartType('Teoria');
    setShowAdjustChartModal(true);
  };

  const handleSaveChartAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const discId = adjustChartDisciplineId || (disciplines[0]?.id || '');
    if (!discId) return;

    const totalQ = adjustChartQuestions > 0 
      ? Number(adjustChartQuestions) 
      : ((Number(adjustChartCorrect) || 0) + (Number(adjustChartWrong) || 0));

    const isQuestionsOnly = adjustChartType === 'Questões' || adjustChartType === 'Simulado' || totalQ > 0;

    const correctVal = adjustChartCorrect > 0 
      ? Number(adjustChartCorrect) 
      : (isQuestionsOnly && totalQ > 0 ? totalQ : 0);
    
    const wrongVal = Number(adjustChartWrong) || (totalQ > correctVal ? totalQ - correctVal : 0);

    onAddStudySession({
      disciplineId: discId,
      hours: Number(adjustChartHours) || 0,
      minutes: Number(adjustChartMinutes) || 0,
      type: adjustChartType,
      material: 'Ajuste Manual do Gráfico',
      correct: correctVal,
      wrong: wrongVal,
      notes: 'Ajuste manual no gráfico semanal',
      date: adjustChartDate
    });

    setShowAdjustChartModal(false);
  };

  const handleSaveWeeklyGoals = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateWeeklyGoals) {
      onUpdateWeeklyGoals(newGoalsHours, newGoalsQuestions, newGoalsHoursDone, newGoalsQuestionsDone);
    }
    setShowEditGoalsModal(false);
  };

  // State for subject study time visualization panel
  const [painelView, setPainelView] = useState<'tempo' | 'topicos'>('tempo');
  const [subjectTimeframe, setSubjectTimeframe] = useState<'all' | 'week' | 'today'>('all');
  const [subjectSortBy, setSubjectSortBy] = useState<'time' | 'name' | 'questions'>('time');

  const topicsStats = useMemo(() => {
    const map = new Map<string, { topicName: string; disciplineName: string; total: number; correct: number; wrong: number }>();
    
    exerciseLogs.forEach(log => {
      // Use topicName as fallback if topicId is missing, though exerciseLogs usually has both
      const key = `${log.disciplineId}_${log.topicId || log.topicName}`;
      const existing = map.get(key) || { 
        topicName: log.topicName, 
        disciplineName: log.disciplineName, 
        total: 0, 
        correct: 0, 
        wrong: 0 
      };
      
      existing.total += log.questionsCount;
      existing.correct += log.correctAnswers;
      existing.wrong += log.wrongAnswers;
      
      map.set(key, existing);
    });
    
    return Array.from(map.values()).sort((a, b) => b.wrong - a.wrong);
  }, [exerciseLogs]);

  const subjectTimeStats = useMemo(() => {
    const todayKey = getLocalDateString(new Date());
    
    // Set of date keys for the last 7 days
    const last7DaysKeys = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7DaysKeys.add(getLocalDateString(d));
    }

    const statsMap = new Map<string, {
      id: string;
      name: string;
      colorClass: string;
      timeSpentMin: number;
      questionsSolved: number;
      correctAnswers: number;
      wrongAnswers: number;
    }>();

    if (subjectTimeframe === 'all') {
      disciplines.forEach(d => {
        statsMap.set(d.id, {
          id: d.id,
          name: d.name,
          colorClass: d.colorClass || 'emerald',
          timeSpentMin: d.timeSpentMin || 0,
          questionsSolved: (d.correctAnswers || 0) + (d.wrongAnswers || 0),
          correctAnswers: d.correctAnswers || 0,
          wrongAnswers: d.wrongAnswers || 0,
        });
      });
    } else {
      disciplines.forEach(d => {
        statsMap.set(d.id, {
          id: d.id,
          name: d.name,
          colorClass: d.colorClass || 'emerald',
          timeSpentMin: 0,
          questionsSolved: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
        });
      });

      activityLogs.forEach(log => {
        const logDate = getLogDateKey(log);
        const isMatch = subjectTimeframe === 'today' 
          ? logDate === todayKey 
          : last7DaysKeys.has(logDate);

        if (isMatch) {
          const matchedDisc = disciplines.find(d => 
            d.name.trim().toLowerCase() === log.disciplineName.trim().toLowerCase()
          );
          const discId = matchedDisc?.id || log.disciplineName;

          if (statsMap.has(discId)) {
            const item = statsMap.get(discId)!;
            item.timeSpentMin += log.timeSpentMin || 0;
            item.questionsSolved += log.questionsSolved || ((log.correctAnswers || 0) + (log.wrongAnswers || 0));
            item.correctAnswers += log.correctAnswers || 0;
            item.wrongAnswers += log.wrongAnswers || 0;
          } else {
            statsMap.set(discId, {
              id: discId,
              name: log.disciplineName || 'Outros',
              colorClass: matchedDisc?.colorClass || 'emerald',
              timeSpentMin: log.timeSpentMin || 0,
              questionsSolved: log.questionsSolved || ((log.correctAnswers || 0) + (log.wrongAnswers || 0)),
              correctAnswers: log.correctAnswers || 0,
              wrongAnswers: log.wrongAnswers || 0,
            });
          }
        }
      });
    }

    const list = Array.from(statsMap.values());

    const totalTimeMins = list.reduce((acc, curr) => acc + curr.timeSpentMin, 0);
    const totalQuestions = list.reduce((acc, curr) => acc + curr.questionsSolved, 0);

    list.sort((a, b) => {
      if (subjectSortBy === 'time') return b.timeSpentMin - a.timeSpentMin;
      if (subjectSortBy === 'questions') return b.questionsSolved - a.questionsSolved;
      return a.name.localeCompare(b.name);
    });

    const topDiscipline = list.length > 0 && list[0].timeSpentMin > 0 ? list[0] : null;

    return {
      list,
      totalTimeMins,
      totalQuestions,
      topDiscipline,
      maxTimeMins: Math.max(...list.map(l => l.timeSpentMin), 1)
    };
  }, [disciplines, activityLogs, subjectTimeframe, subjectSortBy]);

  // Local state for non-blocking deletion of activity logs inside iframe environment
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Local state for limiting activity logs feed to 20 items to prevent screen from stretching
  const [showAllActivities, setShowAllActivities] = useState(false);
  const displayedActivityLogs = useMemo(() => {
    if (showAllActivities) return activityLogs;
    return activityLogs.slice(0, 20);
  }, [activityLogs, showAllActivities]);

  const handleDisciplineChangeForStudy = (id: string) => {
    setStudyDisciplineId(id);
    setStudyConcludeTopic(false);
    const disc = disciplines.find(d => d.id === id);
    if (disc && disc.topics.length > 0) {
      setStudyTopicId(disc.topics[0].id);
    } else {
      setStudyTopicId('');
    }
  };

  const handleTypeChange = (type: 'Teoria' | 'Questões' | 'Revisão' | 'Simulado') => {
    setStudyType(type);
    if (type === 'Questões' || type === 'Simulado') {
      if (studyCorrect === 0 && studyWrong === 0) {
        setStudyCorrect(10);
        setStudyWrong(2);
      }
    }
  };

  const submitStudySession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyDisciplineId) return;

    // We consider questions solved if they are explicitly in "Questões"/"Simulado" mode or entered numbers
    const includeQuestions = studyType === 'Questões' || studyType === 'Simulado' || (studyCorrect > 0 || studyWrong > 0);

    onAddStudySession({
      disciplineId: studyDisciplineId,
      hours: studyHours,
      minutes: studyMinutes,
      type: studyType,
      material: studyMaterial,
      correct: includeQuestions ? studyCorrect : undefined,
      wrong: includeQuestions ? studyWrong : undefined,
      notes: studyNotes.trim() || undefined,
      topicId: studyTopicId || undefined,
      concludeTopic: studyConcludeTopic,
      date: studyDate
    });

    // Reset states
    setStudyHours(1);
    setStudyMinutes(0);
    setStudyType('Teoria');
    setStudyMaterial('PDF');
    setStudyCorrect(0);
    setStudyWrong(0);
    setStudyNotes('');
    setStudyDate(getTodayDateString());
    setStudyConcludeTopic(false);
    setShowAddStudyModal(false);
  };

  // Daily Planning interaction state mapped dynamically by discipline id
  const [dailyTaskProgress, setDailyTaskProgress] = useState<Record<string, number>>({});

  // Calculated Stats based on actual active lists
  const totalStudyMinutes = disciplines.reduce((acc, curr) => acc + curr.timeSpentMin, 0); // Strictly calculate from actual studied entries
  const hours = Math.floor(totalStudyMinutes / 60);
  const minutes = totalStudyMinutes % 60;

  const totalCorrect = disciplines.reduce((acc, curr) => acc + curr.correctAnswers, 0);
  const totalWrong = disciplines.reduce((acc, curr) => acc + curr.wrongAnswers, 0);
  const totalAnswers = totalCorrect + totalWrong;
  const overallAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  const totalTopics = disciplines.reduce((acc, curr) => acc + curr.topicsTotal, 0);
  const doneTopics = disciplines.reduce((acc, curr) => acc + curr.topicsDone, 0);
  const overallSyllabusProgress = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  // --- Desempenho Filter State & Calculations ---
  const [selectedPerformanceDisciplines, setSelectedPerformanceDisciplines] = useState<string[]>([]);
  const [isPerformanceFilterOpen, setIsPerformanceFilterOpen] = useState(false);

  const perfStats = useMemo(() => {
    // 1. Geral (all disciplines)
    const geralCorrect = disciplines.reduce((acc, curr) => acc + curr.correctAnswers, 0);
    const geralWrong = disciplines.reduce((acc, curr) => acc + curr.wrongAnswers, 0);
    const geralTotal = geralCorrect + geralWrong;
    const geralAcc = geralTotal > 0 ? Math.round((geralCorrect / geralTotal) * 100) : 0;

    // 2. Selecionadas
    const selDisciplines = disciplines.filter(d => selectedPerformanceDisciplines.includes(d.id));
    const selCorrect = selDisciplines.reduce((acc, curr) => acc + curr.correctAnswers, 0);
    const selWrong = selDisciplines.reduce((acc, curr) => acc + curr.wrongAnswers, 0);
    const selTotal = selCorrect + selWrong;
    const selAcc = selTotal > 0 ? Math.round((selCorrect / selTotal) * 100) : 0;

    // 3. Geral sem Selecionadas
    const unselDisciplines = disciplines.filter(d => !selectedPerformanceDisciplines.includes(d.id));
    const unselCorrect = unselDisciplines.reduce((acc, curr) => acc + curr.correctAnswers, 0);
    const unselWrong = unselDisciplines.reduce((acc, curr) => acc + curr.wrongAnswers, 0);
    const unselTotal = unselCorrect + unselWrong;
    const unselAcc = unselTotal > 0 ? Math.round((unselCorrect / unselTotal) * 100) : 0;

    return {
      geral: { correct: geralCorrect, wrong: geralWrong, total: geralTotal, acc: geralAcc },
      sel: { correct: selCorrect, wrong: selWrong, total: selTotal, acc: selAcc },
      unsel: { correct: unselCorrect, wrong: unselWrong, total: unselTotal, acc: unselAcc }
    };
  }, [disciplines, selectedPerformanceDisciplines]);
  // ----------------------------------------------


  // Dynamic Weekly Study Chart Calculation
  const [chartWeekOffset, setChartWeekOffset] = useState<number>(0);
  const [chartMetricMode, setChartMetricMode] = useState<'volume' | 'accuracy'>('volume');
  const [showAccuracyBadges, setShowAccuracyBadges] = useState<boolean>(true);
  const [selectedChartDayKey, setSelectedChartDayKey] = useState<string | null>(null);

  const weeklyChartData = useMemo(() => {
    const dataList = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getLocalDateString(today);

    // Find Sunday of the week corresponding to chartWeekOffset (0 = current week)
    const startOfWeek = new Date(today);
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    startOfWeek.setDate(today.getDate() - currentDayOfWeek + (chartWeekOffset * 7));

    const weekdayAbbrs = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const weekdayFull = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateKey = getLocalDateString(d);
      const label = weekdayAbbrs[d.getDay()];
      const fullDayName = weekdayFull[d.getDay()];
      
      let minsStudied = 0;
      let qCount = 0;
      let correctCount = 0;
      let wrongCount = 0;
      
      activityLogs.forEach(log => {
        const logDate = getLogDateKey(log);
        if (logDate === dateKey) {
          minsStudied += log.timeSpentMin || 0;
          let c = log.correctAnswers || 0;
          let w = log.wrongAnswers || 0;
          let q = log.questionsSolved || (c + w);

          // Fallback parsing from details if correct/wrong were not explicitly set on log
          if (c === 0 && w === 0 && log.details) {
            const match = log.details.match(/\((\d+)\s*acertos?\s*\/\s*(\d+)\s*erros?\)/i);
            if (match) {
              c = parseInt(match[1], 10) || 0;
              w = parseInt(match[2], 10) || 0;
              if (q === 0) q = c + w;
            } else {
              const simMatch = log.details.match(/\((\d+)\/(\d+)\s*acertos?\)/i);
              if (simMatch) {
                c = parseInt(simMatch[1], 10) || 0;
                const tot = parseInt(simMatch[2], 10) || c;
                w = Math.max(0, tot - c);
                if (q === 0) q = tot;
              }
            }
          }

          qCount += q;
          correctCount += c;
          wrongCount += w;
        }
      });
      
      const dayHours = minsStudied / 60;
      const totalAnswered = (correctCount + wrongCount) > 0 ? (correctCount + wrongCount) : qCount;
      const accuracyPercent = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : null;
      
      dataList.push({
        label,
        fullDayName,
        dateKey,
        hours: Math.round(dayHours * 10) / 10,
        minsStudied, // precise study minutes
        questions: qCount,
        correctCount,
        wrongCount,
        totalAnswered,
        accuracyPercent,
        isToday: dateKey === todayStr,
        dateFormatted: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      });
    }

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const rangeStr = `${startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

    const totalWeeklyQuestions = dataList.reduce((acc, curr) => acc + curr.questions, 0);
    const totalWeeklyCorrect = dataList.reduce((acc, curr) => acc + curr.correctCount, 0);
    const totalWeeklyWrong = dataList.reduce((acc, curr) => acc + curr.wrongCount, 0);
    const totalWeeklyAnswered = (totalWeeklyCorrect + totalWeeklyWrong) > 0 ? (totalWeeklyCorrect + totalWeeklyWrong) : totalWeeklyQuestions;
    const weeklyAccuracyPercent = totalWeeklyAnswered > 0 ? Math.round((totalWeeklyCorrect / totalWeeklyAnswered) * 100) : null;

    return {
      dataList,
      rangeStr,
      isCurrentWeek: chartWeekOffset === 0,
      totalWeeklyQuestions,
      totalWeeklyCorrect,
      totalWeeklyWrong,
      totalWeeklyAnswered,
      weeklyAccuracyPercent
    };
  }, [activityLogs, chartWeekOffset]);

  // Active selected day for detail preview under chart
  const activeSelectedDay = useMemo(() => {
    if (selectedChartDayKey) {
      const found = weeklyChartData.dataList.find(d => d.dateKey === selectedChartDayKey);
      if (found) return found;
    }
    const todayItem = weeklyChartData.dataList.find(d => d.isToday);
    if (todayItem) return todayItem;
    return weeklyChartData.dataList[weeklyChartData.dataList.length - 1];
  }, [weeklyChartData, selectedChartDayKey]);

  const maxWeeklyHours = useMemo(() => {
    const maxVal = Math.max(...weeklyChartData.dataList.map(d => d.hours));
    return maxVal > 0 ? maxVal : 4;
  }, [weeklyChartData]);

  const maxWeeklyQuestions = useMemo(() => {
    const maxVal = Math.max(...weeklyChartData.dataList.map(d => d.questions));
    return maxVal > 0 ? maxVal : 10;
  }, [weeklyChartData]);

  // Local states for registration timeline & paginated streak view
  const [streakViewMode, setStreakViewMode] = useState<'14d' | 'monthly'>('14d');
  const [streakPage, setStreakPage] = useState<number>(-1);
  const [showAllStudiedDaysModal, setShowAllStudiedDaysModal] = useState<boolean>(false);

  // Total unique dates effectively studied (excluding rest-only days)
  const totalStudiedDaysCount = useMemo(() => {
    const dates = new Set<string>();
    activityLogs.forEach(log => {
      const dStr = getLogDateKey(log);
      if (dStr && log.disciplineName !== 'Dia de Descanso') {
        dates.add(dStr);
      }
    });
    return dates.size;
  }, [activityLogs]);

  const regDate = useMemo(() => {
    if (activeProfileCreatedAt) {
      const PT_MONTHS: Record<string, number> = {
        jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
        jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
      };
      const parts = activeProfileCreatedAt.trim().split(/\s+/);
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const montStr = parts[1].toLowerCase().substring(0, 3);
        const month = PT_MONTHS[montStr] !== undefined ? PT_MONTHS[montStr] : 4;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        d.setHours(0,0,0,0);
        return d;
      }
    }
    if (userCreatedAt) {
      const parsed = new Date(userCreatedAt);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(0,0,0,0);
        return parsed;
      }
    }
    const fallback = new Date();
    fallback.setDate(fallback.getDate() - 3);
    fallback.setHours(0,0,0,0);
    return fallback;
  }, [activeProfileCreatedAt, userCreatedAt]);

  const daysPerPage = useMemo(() => {
    return streakViewMode === '14d' ? 14 : 28;
  }, [streakViewMode]);

  const defaultPageForToday = 0; // We now use 0 as the current period

  // Sync / initialize streakPage to defaultPageForToday
  useEffect(() => {
    if (streakPage === -1) {
      setStreakPage(defaultPageForToday);
    }
  }, [defaultPageForToday, streakPage]);

  const activeStreakPage = streakPage === -1 ? defaultPageForToday : streakPage;

  // Dynamic Streak Calculation
  const streakCalc = useMemo(() => {
    // Collect unique study dates
    const studiedDates = new Map<string, 'completed' | 'rest'>();
    
    activityLogs.forEach(log => {
      const dStr = getLogDateKey(log);
      if (dStr) {
        if (log.disciplineName === 'Dia de Descanso') {
          if (!studiedDates.has(dStr)) {
            studiedDates.set(dStr, 'rest');
          }
        } else {
          studiedDates.set(dStr, 'completed');
        }
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compute global current streak
    let currentStreak = 0;
    const todayStr = getLocalDateString(today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    const hasStudiedToday = studiedDates.has(todayStr);
    const hasStudiedYesterday = studiedDates.has(yesterdayStr);
    
    if (hasStudiedToday) {
      currentStreak = 1;
      const dCount = new Date();
      dCount.setDate(dCount.getDate() - 1);
      while (studiedDates.has(getLocalDateString(dCount))) {
        currentStreak++;
        dCount.setDate(dCount.getDate() - 1);
      }
    } else if (hasStudiedYesterday) {
      currentStreak = 1;
      const dCount = new Date();
      dCount.setDate(dCount.getDate() - 2);
      while (studiedDates.has(getLocalDateString(dCount))) {
        currentStreak++;
        dCount.setDate(dCount.getDate() - 1);
      }
    } else {
      currentStreak = 0;
    }

    // Compute max/record streak from studiedDates Set
    let recordStreak = 0;
    const sortedDays = Array.from(studiedDates.keys()).sort();
    if (sortedDays.length > 0) {
      recordStreak = 1;
      let currentRunning = 1;
      for (let j = 1; j < sortedDays.length; j++) {
        const d1 = new Date(sortedDays[j - 1] + 'T00:00:00');
        const d2 = new Date(sortedDays[j] + 'T00:00:00');
        const diffMs = d2.getTime() - d1.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentRunning++;
        } else if (diffDays > 1) {
          currentRunning = 1;
        }
        if (currentRunning > recordStreak) {
          recordStreak = currentRunning;
        }
      }
    }

    if (currentStreak > recordStreak) {
      recordStreak = currentStreak;
    }

    // Now, generate the paginated day list relative to Today
    const list: StreakDay[] = [];
    const pageEndDate = new Date(today.getTime());
    // In current view (page 0), let's show today + 2 future days at the end
    pageEndDate.setDate(pageEndDate.getDate() + 2 + (activeStreakPage * daysPerPage));
    const pageStartDate = new Date(pageEndDate.getTime());
    pageStartDate.setDate(pageStartDate.getDate() - (daysPerPage - 1));

    for (let i = 0; i < daysPerPage; i++) {
      const d = new Date(pageStartDate.getTime());
      d.setDate(d.getDate() + i);
      const dateKey = getLocalDateString(d);
      const displayStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      const compDate = new Date(d);
      compDate.setHours(0,0,0,0);
      
      let status: 'completed' | 'failed' | 'future' | 'rest' = 'failed';
      
      if (studiedDates.has(dateKey)) {
        status = studiedDates.get(dateKey) || 'completed';
      } else {
        if (compDate.getTime() > today.getTime()) {
          status = 'future';
        } else if (compDate.getTime() === today.getTime()) {
          status = 'future';
        } else {
          status = 'failed';
        }
      }
      
      list.push({
        dateString: displayStr,
        status,
        dateKey
      });
    }

    const rangeStr = `${list[0].dateString} ~ ${list[list.length - 1].dateString}`;

    return {
      list,
      currentStreak,
      recordStreak,
      rangeStr,
      pageStartDate,
      pageEndDate: new Date(pageStartDate.getTime() + (daysPerPage - 1) * 24 * 60 * 60 * 1000)
    };
  }, [activityLogs, regDate, activeStreakPage, daysPerPage]);

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  const handlePrevQuote = () => {
    setQuoteIndex((prev) => (prev - 1 + MOTIVATIONAL_QUOTES.length) % MOTIVATIONAL_QUOTES.length);
  };

  const submitReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    
    // Format date defaults
    const today = new Date();
    const formattedDate = newReminderDate || `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${(today.getFullYear() % 100)}`;
    
    onAddReminder(newReminderText, newReminderType, formattedDate);
    setNewReminderText('');
    setNewReminderDate('');
    setShowAddReminderModal(false);
  };

  if (profilesCount === 0) {
    return (
      <div className="max-w-xl mx-auto my-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
          <Sparkles size={32} className="stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display font-black text-xl text-slate-800 dark:text-white uppercase tracking-wider">
            Boas-vindas ao Estudei! 🚀
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
            Sua jornada rumo à aprovação começa aqui! Para ativar todas as visualizações do painel, crie primeiramente seu plano do concurso desejado.
          </p>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (onboardName.trim()) {
            onCreateProfile(onboardName.trim(), onboardTemplate);
          }
        }} className="text-left space-y-4 max-w-sm mx-auto pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
              Qual concurso você vai prestar?
            </label>
            <input 
              type="text"
              value={onboardName}
              onChange={(e) => setOnboardName(e.target.value)}
              placeholder="Ex: Receita Federal, Polícia Civil, INSS..."
              className="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
              Área de Estudos (Matérias Iniciais)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'Policial', label: 'Policial', desc: 'Direto Penal, Processual, etc.' },
                { id: 'Fiscal', label: 'Fiscal', desc: 'Tributário, Contabilidade' },
                { id: 'Judiciário', label: 'Judiciário', desc: 'Constitucional, Proc. Civil' },
                { id: 'Administrativo', label: 'Administrativo', desc: 'Informática, Português' },
                { id: 'custom', label: 'Em Branco', desc: 'Edital livre/em branco' }
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setOnboardTemplate(tpl.id)}
                  className={`p-2.5 text-left border rounded-lg transition-all ${
                    onboardTemplate === tpl.id
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary'
                      : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider leading-none">{tpl.label}</p>
                  <p className="text-[9px] text-slate-400 mt-1 leading-tight font-medium">{tpl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/95 text-white font-black text-xs py-3 uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
          >
            <PlusCircle size={15} className="stroke-[2.5]" />
            Gerar Meu Plano de Estudos
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Welcome & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-850 shadow-3xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 text-primary bg-primary/10 rounded font-bold text-[9px] uppercase tracking-wider">{activeProfileName || "Sem Plano"}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="font-display font-black text-lg text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 mt-1">
            <Sparkles className="text-secondary" size={18} />
            Seu Painel de Estudos
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Acompanhe o rendimento geral, gerencie lembretes e controle suas horas de estudo com alta constância.
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => {
            const firstDisc = disciplines[0];
            if (firstDisc) {
              setStudyDisciplineId(firstDisc.id);
              if (firstDisc.topics.length > 0) {
                setStudyTopicId(firstDisc.topics[0].id);
              }
            }
            setShowAddStudyModal(true);
          }}
          className="bg-primary hover:bg-primary/95 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-101 active:scale-98 shrink-0 self-stretch sm:self-auto justify-center uppercase tracking-wider"
        >
          <PlusCircle size={15} className="stroke-[2.5]" />
          Adicionar Estudo
        </button>
      </div>
      
      {/* 1. Upper Dynamic Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Tempo de Estudo Widget */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[120px]">
          <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Tempo de Estudo</h3>
          <div className="flex justify-between items-baseline mt-2">
            <span className="font-display font-extrabold text-3xl text-slate-800 leading-none font-mono">{formatMinutes(totalStudyMinutes)}</span>
            <button
              type="button"
              onClick={() => {
                const firstDisc = disciplines[0];
                if (firstDisc) {
                  handleSelectDisciplineToAdjust(firstDisc.id);
                }
                setShowAdjustHoursModal(true);
              }}
              className="text-[9px] font-black text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 border border-rose-100 hover:border-transparent px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 uppercase tracking-wider h-fit"
              title="Alterar ou ajustar horas de estudo acumulado"
            >
              <Edit2 size={10} /> Ajustar
            </button>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <Clock size={12} />
            Tempo acumulado total
          </p>
        </div>

        {/* Desempenho Widget */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[120px] relative z-20">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Desempenho</h3>
              <div className="relative">
                <button 
                  onClick={() => setIsPerformanceFilterOpen(!isPerformanceFilterOpen)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${selectedPerformanceDisciplines.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  title="Filtrar por matéria"
                >
                  <Filter size={10} />
                  {selectedPerformanceDisciplines.length > 0 ? `${selectedPerformanceDisciplines.length} Filtros` : 'Filtrar'}
                </button>
                
                {isPerformanceFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsPerformanceFilterOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-50 w-56 max-h-60 overflow-y-auto">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Matérias</h4>
                        {selectedPerformanceDisciplines.length > 0 && (
                          <button 
                            onClick={() => setSelectedPerformanceDisciplines([])}
                            className="text-[9px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {disciplines.map(d => (
                          <label key={d.id} className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                              checked={selectedPerformanceDisciplines.includes(d.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPerformanceDisciplines([...selectedPerformanceDisciplines, d.id]);
                                } else {
                                  setSelectedPerformanceDisciplines(selectedPerformanceDisciplines.filter(id => id !== d.id));
                                }
                              }}
                            />
                            <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 truncate" title={d.name}>{d.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedPerformanceDisciplines.length === 0 && (
              <div className="text-right">
                <span className="block text-[10px] text-slate-500 font-bold">{perfStats.geral.total} Feitas</span>
                <span className="block text-[10px] text-emerald-600 font-bold">{perfStats.geral.correct} Acertos</span>
                <span className="block text-[10px] text-rose-500 font-bold">{perfStats.geral.wrong} Erros</span>
              </div>
            )}
          </div>
          
          {selectedPerformanceDisciplines.length === 0 ? (
            <div className="flex items-center justify-between mt-2">
              <div className="font-display font-extrabold text-3xl text-slate-800 leading-none">{perfStats.geral.acc}%</div>
              
              {/* SVG Progress Arc Gauge */}
              <div className="relative w-12 h-12">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle 
                    cx="18" cy="18" r="15.915" 
                    fill="none" 
                    stroke="#22c55e" 
                    strokeWidth="3" 
                    strokeDasharray={`${perfStats.geral.acc}, 100`} 
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  {perfStats.geral.acc}%
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2 flex-1 flex flex-col justify-end">
              {/* Geral */}
              <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Geral</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-medium text-slate-400">{perfStats.geral.total}F / {perfStats.geral.correct}C / {perfStats.geral.wrong}E</span>
                  <span className="text-[11px] font-extrabold text-slate-700 w-7 text-right">{perfStats.geral.acc}%</span>
                </div>
              </div>
              {/* Selecionadas */}
              <div className="flex justify-between items-center bg-emerald-50 px-2 py-1.5 rounded">
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider truncate max-w-[80px]" title="Matérias Selecionadas">Sel.</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-medium text-emerald-500/70">{perfStats.sel.total}F / {perfStats.sel.correct}C / {perfStats.sel.wrong}E</span>
                  <span className="text-[11px] font-extrabold text-emerald-600 w-7 text-right">{perfStats.sel.acc}%</span>
                </div>
              </div>
              {/* Geral s/ Selecionadas */}
              <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[80px]" title="Geral sem as selecionadas">Sem Sel.</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-medium text-slate-400">{perfStats.unsel.total}F / {perfStats.unsel.correct}C / {perfStats.unsel.wrong}E</span>
                  <span className="text-[11px] font-extrabold text-slate-700 w-7 text-right">{perfStats.unsel.acc}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progresso no Edital Widget */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Progresso no Edital</h3>
            <div className="text-right">
              <span className="block text-[10px] text-emerald-500 font-bold">{doneTopics} Concluídos</span>
              <span className="block text-[10px] text-amber-500 font-bold">{totalTopics - doneTopics} Pendentes</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="font-display font-extrabold text-3xl text-slate-800 leading-none">{overallSyllabusProgress}%</div>
            
            <div className="relative w-12 h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle 
                  cx="18" cy="18" r="15.915" 
                  fill="none" 
                  stroke="#006e2f" 
                  strokeWidth="3" 
                  strokeDasharray={`${overallSyllabusProgress}, 100`}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-600">
                {overallSyllabusProgress}%
              </div>
            </div>
          </div>
        </div>

        {/* Quote Widget */}
        <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100 shadow-xs flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
          <div className="absolute top-1 right-1 opacity-10 group-hover:opacity-25 transition-opacity">
            <Sparkles size={48} className="text-primary" />
          </div>
          
          <p className="text-xs italic text-slate-700 leading-relaxed font-medium relative z-10">
            "{MOTIVATIONAL_QUOTES[quoteIndex].text}"
          </p>
          
          <div className="flex justify-between items-center mt-3 relative z-10">
            <span className="text-[11px] font-semibold text-primary">— {MOTIVATIONAL_QUOTES[quoteIndex].author}</span>
            <div className="flex gap-1.5">
              <button 
                type="button" 
                onClick={handlePrevQuote} 
                className="p-1 hover:bg-emerald-100/80 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Previous quote"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                type="button" 
                onClick={handleNextQuote} 
                className="p-1 hover:bg-emerald-100/80 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Next quote"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Streak Tracker (Constância nos Estudos) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  <Calendar size={14} className="text-emerald-500" />
                  <h3 className="font-semibold text-[10px]">Constância nos Estudos</h3>
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full font-mono text-slate-500 dark:text-slate-400">
                    Início: {regDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Toque nos dias para alternar: <strong>Presença</strong> → <strong>Descanso</strong> → <strong>Vazio</strong>.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Button: Ver Todos os Dias Estudados */}
            <button
              type="button"
              onClick={() => setShowAllStudiedDaysModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
              title="Ver histórico completo de todos os dias efetivamente estudados"
            >
              <CalendarCheck size={14} className="stroke-[2.5]" />
              <span>Ver Todos os Dias Estudados</span>
              <span className="bg-emerald-800/80 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {totalStudiedDaysCount}
              </span>
            </button>

            {/* View Mode Toggle Button */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/40 dark:border-slate-700/40">
              <button
                type="button"
                onClick={() => {
                  setStreakViewMode('14d');
                  setStreakPage(-1); // Reset to trigger recalculation for default view
                }}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                  streakViewMode === '14d'
                    ? 'bg-white dark:bg-slate-700 text-slate-850 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                14 Dias
              </button>
              <button
                type="button"
                onClick={() => {
                  setStreakViewMode('monthly');
                  setStreakPage(-1); // Reset to trigger recalculation for default view
                }}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                  streakViewMode === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-slate-850 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Mensal (28d)
              </button>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setStreakPage(prev => prev - 1)}
                className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Voltar para semanas anteriores"
              >
                <ChevronLeft size={15} />
              </button>
              
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 px-1 font-mono">
                {streakCalc.rangeStr}
              </span>

              <button
                type="button"
                onClick={() => setStreakPage(prev => prev + 1)}
                className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Avançar para as próximas semanas"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Back to Today shortcut */}
            <button
              type="button"
              onClick={() => setStreakPage(defaultPageForToday)}
              disabled={activeStreakPage === defaultPageForToday}
              className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200/40 dark:border-emerald-800 hover:bg-emerald-100/50 disabled:opacity-40 disabled:pointer-events-none transition-all leading-none"
              title="Ir para o período atual que contém Hoje"
            >
              Hoje
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          {totalStudyMinutes === 0 ? (
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm font-semibold text-balance">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              Você ainda não registrou nenhum estudo neste plano. Toque em qualquer círculozinho abaixo para registrar presença instantaneamente! 🚀
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-slate-705 dark:text-slate-300 text-sm font-semibold text-balance">
                Você está há <strong className="text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-sm">{streakCalc.currentStreak} {streakCalc.currentStreak === 1 ? 'dia' : 'dias'}</strong> sem falhar! Seu recorde atual é de <span className="font-bold text-slate-805 dark:text-white">{streakCalc.recordStreak} {streakCalc.recordStreak === 1 ? 'dia' : 'dias'}</span>. 🏆
              </p>
              <button
                type="button"
                onClick={() => setShowAllStudiedDaysModal(true)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 w-fit cursor-pointer transition-colors"
                title="Abrir histórico detalhado com todos os dias estudados"
              >
                <span>Ver histórico completo ({totalStudiedDaysCount} {totalStudiedDaysCount === 1 ? 'dia' : 'dias'})</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
          {streakCalc.list.map((day, idx) => {
            const isToday = day.dateKey === getLocalDateString(new Date());
            
            // Cycle logic: 
            // failed / future -> completed
            // completed -> rest
            // rest -> none
            
            let displayTitle = '';
            if (day.status === 'completed') displayTitle = `Data: ${day.dateKey}\nPresença confirmada! Clique para alterar para DIA DE DESCANSO.`;
            else if (day.status === 'rest') displayTitle = `Data: ${day.dateKey}\nDia de Descanso! Clique para REMOVER registro.`;
            else displayTitle = `Data: ${day.dateKey}\nNenhum registro. Clique para MARCAR PRESENÇA.`;

            if (day.status === 'completed') {
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleStudyDay && day.dateKey) {
                        onToggleStudyDay(day.dateKey, 'rest');
                      }
                    }}
                    className={`w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/10 cursor-pointer active:scale-90 transition-all ${
                      isToday ? 'ring-2 ring-emerald-300 ring-offset-2 dark:ring-offset-slate-900' : ''
                    }`}
                    title={displayTitle}
                  >
                    <Check size={15} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <span className={`text-[9px] font-black ${isToday ? 'text-emerald-600 dark:text-emerald-400 font-extrabold underline' : 'text-slate-500'}`}>
                    {day.dateString}
                    {isToday && <span className="block text-[7px] text-center uppercase tracking-widest leading-none font-bold">Hoje</span>}
                  </span>
                </div>
              );
            } else if (day.status === 'rest') {
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleStudyDay && day.dateKey) {
                        onToggleStudyDay(day.dateKey, 'none');
                      }
                    }}
                    className={`w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/10 cursor-pointer active:scale-90 transition-all ${
                      isToday ? 'ring-2 ring-blue-300 ring-offset-2 dark:ring-offset-slate-900' : ''
                    }`}
                    title={displayTitle}
                  >
                    <Coffee size={14} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <span className={`text-[9px] font-black ${isToday ? 'text-blue-600 dark:text-blue-400 font-extrabold underline' : 'text-slate-500'}`}>
                    {day.dateString}
                    {isToday && <span className="block text-[7px] text-center uppercase tracking-widest leading-none font-bold">Hoje</span>}
                  </span>
                </div>
              );
            } else if (day.status === 'failed') {
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleStudyDay && day.dateKey) {
                        onToggleStudyDay(day.dateKey, 'completed');
                      }
                    }}
                    className={`w-8 h-8 rounded-full bg-rose-50 hover:bg-emerald-100 border border-rose-200/80 hover:border-emerald-400 text-rose-500 hover:text-emerald-600 flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                      isToday ? 'ring-2 ring-rose-300 ring-offset-2 dark:ring-offset-slate-900 bg-rose-100/50' : ''
                    }`}
                    title={displayTitle}
                  >
                    <X size={14} strokeWidth={2.5} className="group-hover:hidden transition-all" />
                    <Plus size={14} strokeWidth={3} className="hidden group-hover:block text-emerald-600" />
                  </button>
                  <span className={`text-[9px] font-bold ${isToday ? 'text-rose-500 underline font-extrabold' : 'text-slate-400'}`}>
                    {day.dateString}
                    {isToday && <span className="block text-[7px] text-center uppercase tracking-widest leading-none font-bold">Hoje</span>}
                  </span>
                </div>
              );
            } else {
              // Future / Unlogged current days
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleStudyDay && day.dateKey) {
                        onToggleStudyDay(day.dateKey, 'completed');
                      }
                    }}
                    className={`w-8 h-8 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400 text-slate-305 dark:text-slate-500 hover:text-emerald-500 flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                      isToday ? 'ring-2 ring-slate-300 ring-offset-2 dark:ring-offset-slate-900' : ''
                    }`}
                    title={displayTitle}
                  >
                    <span className="text-sm font-bold group-hover:hidden">•</span>
                    <Plus size={14} strokeWidth={3} className="hidden group-hover:block" />
                  </button>
                  <span className={`text-[9px] font-semibold ${isToday ? 'text-slate-600 dark:text-slate-300 font-extrabold underline' : 'text-slate-400'}`}>
                    {day.dateString}
                    {isToday && <span className="block text-[7px] text-center uppercase tracking-widest leading-none font-bold">Hoje</span>}
                  </span>
                </div>
              );
            }
          })}
        </div>
          </div>

          <div className="lg:w-80 shrink-0 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6 mt-2 lg:mt-0">
            {/* Prova Countdown Widget */}
            <div className="bg-slate-900 rounded-xl p-5 text-white shadow-md relative overflow-hidden w-full flex flex-col justify-center">
              <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
              
              {isEditingExam ? (
                <div className="relative z-10 space-y-3 w-full">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Definir Data da Prova</span>
                    <button 
                      onClick={() => setIsEditingExam(false)} 
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Nome do Concurso</label>
                      <input 
                        type="text"
                        className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Ex: Delegado Polícia Federal"
                        value={tempExamName}
                        onChange={(e) => setTempExamName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Data da Prova</label>
                      <input 
                        type="date"
                        className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        value={tempExamDate}
                        onChange={(e) => setTempExamDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button 
                      onClick={() => {
                        if (onUpdateExamInfo) {
                          onUpdateExamInfo(tempExamName, tempExamDate);
                        }
                        setIsEditingExam(false);
                      }}
                      disabled={!tempExamName || !tempExamDate}
                      className="bg-emerald-500 text-white rounded text-xs px-3.5 py-1 font-bold hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all leading-tight flex items-center gap-1"
                    >
                      <Check size={12} />
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-[9px] text-slate-400 uppercase tracking-widest truncate">
                        {examName || 'Data do Concurso'}
                      </h3>
                      <button 
                        onClick={() => {
                          setTempExamName(examName);
                          setTempExamDate(examDate);
                          setIsEditingExam(true);
                        }}
                        className="text-slate-500 hover:text-emerald-400 p-1 rounded-full hover:bg-slate-800/60 transition-colors"
                        title="Editar Data da Prova"
                      >
                        <Edit2 size={11} />
                      </button>
                    </div>
                    
                    <p className="text-xs font-semibold text-slate-300 truncate">
                      {countdownCalc.displayDate}
                    </p>
                  </div>
                  
                  <div className="text-center pl-4 border-l border-white/10 shrink-0 min-w-[70px]">
                    <div className="text-3xl font-display font-black text-emerald-400 tracking-tight leading-none">
                      {examDate ? countdownCalc.days : '0'}
                    </div>
                    <div className="text-[7px] text-slate-400 uppercase font-black tracking-widest mt-1">
                      {examDate ? countdownCalc.text : 'Dias Restantes'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Double Column Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Wide) - Panel & Daily Agenda */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PAINEL VISUAL DE TEMPO ESTUDADO POR MATÉRIA E TÓPICOS */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-5">
            {/* Header + Main View Toggle Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  {painelView === 'tempo' ? <Clock size={20} /> : <FileQuestion size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                      {painelView === 'tempo' ? 'Tempo Estudado por Matéria' : 'Desempenho por Tópico'}
                    </h3>
                    <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Painel
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {painelView === 'tempo' 
                      ? 'Visualização proporcional e acumulada de dedicate por disciplina' 
                      : 'Análise de questões feitas e ranking de erros por tópico'}
                  </p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs font-bold shrink-0">
                <button
                  onClick={() => setPainelView('tempo')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    painelView === 'tempo'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Tempo (Matérias)
                </button>
                <button
                  onClick={() => setPainelView('topicos')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    painelView === 'topicos'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Questões (Tópicos)
                </button>
              </div>
            </div>

            {painelView === 'tempo' ? (
              <div className="space-y-5">
                {/* Timeframe Filter Tabs */}
                <div className="flex justify-end">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 dark:bg-slate-800/50 p-1 rounded-lg text-[10px] font-bold shrink-0">
                    <button
                      onClick={() => setSubjectTimeframe('all')}
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        subjectTimeframe === 'all'
                          ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => setSubjectTimeframe('week')}
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        subjectTimeframe === 'week'
                          ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Semana
                    </button>
                    <button
                      onClick={() => setSubjectTimeframe('today')}
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        subjectTimeframe === 'today'
                          ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Hoje
                    </button>
                  </div>
                </div>

                {/* Metrics Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                  <BarChart2 size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Estudado</div>
                  <div className="text-base font-display font-black text-slate-800 dark:text-white truncate">
                    {formatMinutes(subjectTimeStats.totalTimeMins)}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Mais Estudada</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {subjectTimeStats.topDiscipline ? subjectTimeStats.topDiscipline.name : 'Nenhuma ainda'}
                  </div>
                  {subjectTimeStats.topDiscipline && (
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatMinutes(subjectTimeStats.topDiscipline.timeSpentMin)}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Disciplinas Com Registro</div>
                  <div className="text-base font-display font-black text-slate-800 dark:text-white truncate">
                    {subjectTimeStats.list.filter(l => l.timeSpentMin > 0).length} / {subjectTimeStats.list.length} matérias
                  </div>
                </div>
              </div>
            </div>

            {/* Proportional Multi-Segment Visual Stacked Bar */}
            {subjectTimeStats.totalTimeMins > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <PieChart size={12} className="text-emerald-500" />
                    Proporção de Tempo por Matéria
                  </span>
                  <span>100% ({formatMinutes(subjectTimeStats.totalTimeMins)})</span>
                </div>

                <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex gap-0.5 p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                  {subjectTimeStats.list.filter(item => item.timeSpentMin > 0).map((item, idx) => {
                    const pct = ((item.timeSpentMin / subjectTimeStats.totalTimeMins) * 100).toFixed(1);
                    const colorClasses = [
                      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-400', 
                      'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500'
                    ];
                    const barBg = colorClasses[idx % colorClasses.length];

                    return (
                      <div
                        key={item.id || idx}
                        style={{ width: `${pct}%` }}
                        className={`${barBg} h-full transition-all hover:brightness-110 relative group cursor-pointer first:rounded-l-lg last:rounded-r-lg`}
                        title={`${item.name}: ${formatMinutes(item.timeSpentMin)} (${pct}%)`}
                      >
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-lg border border-slate-700 text-center">
                          <div className="text-emerald-400 font-bold">{item.name}</div>
                          <div className="text-[9px] text-slate-300 font-mono">{formatMinutes(item.timeSpentMin)} • {pct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subject List Breakdown Cards with Progress Bars */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span className="uppercase tracking-wider text-[10px] text-slate-400">Detalhamento Individual por Matéria</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-normal">Ordenar por:</span>
                  <select
                    value={subjectSortBy}
                    onChange={(e) => setSubjectSortBy(e.target.value as any)}
                    className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 dark:text-white border-0 rounded-lg px-2.5 py-1 text-slate-700 cursor-pointer focus:outline-none"
                  >
                    <option value="time">Mais Estudadas</option>
                    <option value="name">Nome (A-Z)</option>
                    <option value="questions">Mais Questões</option>
                  </select>
                </div>
              </div>

              {subjectTimeStats.list.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  Nenhuma disciplina cadastrada ainda. Adicione matérias para visualizar seu tempo de estudo! 📚
                </div>
              ) : (
                <div className="space-y-2.5">
                  {subjectTimeStats.list.map((item, idx) => {
                    const pctOfTotal = subjectTimeStats.totalTimeMins > 0 
                      ? Math.round((item.timeSpentMin / subjectTimeStats.totalTimeMins) * 100) 
                      : 0;
                    const relativeBarPct = subjectTimeStats.maxTimeMins > 0 
                      ? Math.round((item.timeSpentMin / subjectTimeStats.maxTimeMins) * 100) 
                      : 0;

                    const barColors = [
                      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-400', 
                      'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500'
                    ];
                    const barColor = barColors[idx % barColors.length];

                    return (
                      <div 
                        key={item.id || idx}
                        className="p-3.5 bg-slate-50/80 dark:bg-slate-850 hover:bg-slate-100/90 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 rounded-xl transition-all space-y-2.5 group"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-3 h-3 rounded-full ${barColor} shrink-0`} />
                            <span className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.name}</span>
                            {pctOfTotal > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                                {pctOfTotal}% do total
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                {formatMinutes(item.timeSpentMin)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {item.questionsSolved} questões
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectDisciplineToAdjust(item.id);
                                setShowAdjustHoursModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                              title={`Ajustar tempo acumulado de ${item.name}`}
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Relative Progress Bar */}
                        <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${barColor} transition-all duration-500 rounded-full`} 
                            style={{ width: `${relativeBarPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-400 mb-4">
                  <span>Ranking de Erros por Tópico</span>
                  <span>{topicsStats.length} Tópicos Registrados</span>
                </div>
                
                {topicsStats.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">
                    Nenhum tópico registrado nas suas sessões de estudo (Questões).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topicsStats.map((stat, idx) => {
                      const acc = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                      let badgeColor = 'bg-slate-100 text-slate-600';
                      if (acc >= 80) badgeColor = 'bg-emerald-100 text-emerald-700';
                      else if (acc >= 60) badgeColor = 'bg-amber-100 text-amber-700';
                      else if (acc > 0) badgeColor = 'bg-rose-100 text-rose-700';
                      
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-lg gap-3">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-slate-800 dark:text-white truncate" title={stat.topicName}>
                              {stat.topicName || 'Tópico Geral'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
                              {stat.disciplineName}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-center">
                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Feitas</div>
                              <div className="text-sm font-black text-slate-700">{stat.total}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Erros</div>
                              <div className="text-sm font-black text-rose-500">{stat.wrong}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Acertos</div>
                              <div className="text-sm font-black text-emerald-500">{stat.correct}</div>
                            </div>
                            <div className="w-12 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                                {acc}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>

          {/* Subjects Table Panel */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider mb-4">Painel de Performance por Disciplina</h3>
            
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="py-3 px-1 text-left">Disciplinas</th>
                    <th className="py-3 text-center">Tempo</th>
                    <th className="py-3 text-center text-emerald-600">Acertos</th>
                    <th className="py-3 text-center text-rose-500">Erros</th>
                    <th className="py-3 text-center text-slate-600">Total</th>
                    <th className="py-3 text-center">% Acerto</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 divide-y divide-slate-50 font-medium">
                  {disciplines.map((d) => {
                    const formattedHours = Math.floor(d.timeSpentMin / 60);
                    const formattedMinutes = d.timeSpentMin % 60;
                    const disciplineTotal = d.correctAnswers + d.wrongAnswers;
                    const accuracy = disciplineTotal > 0 ? Math.round((d.correctAnswers / disciplineTotal) * 100) : 0;
                    
                    let badgeColor = 'bg-emerald-500 text-white';
                    if (accuracy < 70) badgeColor = 'bg-rose-500 text-white';
                    else if (accuracy < 85) badgeColor = 'bg-amber-500 text-white';
                    
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group/row">
                        <td className="py-3.5 px-1 font-semibold text-slate-700">{d.name}</td>
                        <td className="py-3.5 text-center text-slate-500 font-mono">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{formatMinutes(d.timeSpentMin)}</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectDisciplineToAdjust(d.id);
                                setShowAdjustHoursModal(true);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-all opacity-0 group-hover/row:opacity-100 cursor-pointer"
                              title={`Ajustar tempo acumulado de ${d.name}`}
                            >
                              <Edit2 size={11} className="transition-transform duration-100 hover:scale-110" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 text-center text-emerald-600 font-bold">{d.correctAnswers}</td>
                        <td className="py-3.5 text-center text-rose-500 font-bold">{d.wrongAnswers}</td>
                        <td className="py-3.5 text-center text-slate-600">{disciplineTotal}</td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                            {accuracy}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Planejamento do Dia Interactive Progress Block */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Planejamento do Dia</h3>
              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Interativo: toque para ajustar o progresso</span>
              </div>
            </div>

            <div className="space-y-4">
              {disciplines.length === 0 ? (
                <p className="text-slate-400 text-xs font-medium py-3 text-center">
                  Nenhuma matéria no seu planejamento d'hoje. Comece adicionando matérias na aba de Disciplinas! 🎯
                </p>
              ) : (
                disciplines.map((d, index) => {
                  const colorBgMap: Record<string, string> = {
                    blue: 'bg-blue-500',
                    emerald: 'bg-emerald-500',
                    yellow: 'bg-amber-400',
                    purple: 'bg-purple-500',
                    red: 'bg-rose-500',
                    indigo: 'bg-indigo-500'
                  };
                  const colorClass = colorBgMap[d.colorClass] || 'bg-primary';

                  // Base target minutes depending on index for visual rhythm
                  const targetList = [110, 80, 55, 90, 120, 60, 45];
                  const targetMins = targetList[index % targetList.length];

                  const progressVal = dailyTaskProgress[d.id] || 0;
                  const currentMins = Math.round((targetMins * progressVal) / 100);

                  const targetHoursStr = formatMinutes(targetMins);
                  const currentHoursStr = formatMinutes(currentMins);

                  return (
                    <div 
                      key={d.id}
                      onClick={() => {
                        const nextProg = progressVal >= 100 ? 0 : progressVal + 25;
                        setDailyTaskProgress(prev => ({ ...prev, [d.id]: nextProg }));
                      }}
                      className="flex items-center gap-4 p-3 border border-slate-100 rounded-lg hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer group"
                    >
                      <div className={`w-1.5 h-10 rounded-full ${colorClass}`} />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-semibold text-xs text-slate-700 leading-none">{d.name}</h4>
                          <span className="text-[10px] text-slate-550 font-bold">{progressVal}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-2 relative overflow-hidden">
                          <div className={`${colorClass} h-full rounded-full transition-all duration-300 ease-out`} style={{ width: `${progressVal}%` }} />
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-400 whitespace-nowrap font-mono">
                        {currentHoursStr} / {targetHoursStr}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Narrow) - Goals & Reminders */}
        <div className="space-y-6">

          {/* Weekly Goals Progress Metrics */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Metas de Estudo Semanal</h3>
                <span className="text-[9px] text-slate-400 font-medium">Ciclo Dom–Sáb • Zera todo domingo às 00h</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewGoalsHours(weeklyGoalsHours.total);
                  setNewGoalsQuestions(weeklyGoalsQuestions.total);
                  setNewGoalsHoursDone(Math.round(weeklyGoalsHours.done * 10) / 10);
                  setNewGoalsQuestionsDone(weeklyGoalsQuestions.done);
                  setShowEditGoalsModal(true);
                }}
                className="text-[9px] font-black text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 border border-rose-100 hover:border-transparent px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                title="Editar metas de estudo (horas e questões)"
              >
                <Edit2 size={10} /> Editar
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Horas */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 font-semibold mb-1">
                  <span>{formatHours(weeklyGoalsHours.done)} / {formatHours(weeklyGoalsHours.total)}</span>
                  <span>Horas de Estudo</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 relative overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full flex items-center px-2 text-[8px] text-white font-bold transition-all duration-300"
                    style={{ width: `${Math.min(100, (weeklyGoalsHours.done / weeklyGoalsHours.total) * 100)}%` }}
                  >
                    {Math.round((weeklyGoalsHours.done / weeklyGoalsHours.total) * 100)}%
                  </div>
                </div>
              </div>

              {/* Questoes */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 font-semibold mb-1">
                  <span>{weeklyGoalsQuestions.done} / {weeklyGoalsQuestions.total} Resolvidas</span>
                  <span>Questões Realizadas</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 relative overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full rounded-full flex items-center px- px-2 text-[8px] text-white font-bold transition-all duration-300"
                    style={{ width: `${Math.min(100, (weeklyGoalsQuestions.done / weeklyGoalsQuestions.total) * 100)}%` }}
                  >
                    {Math.round((weeklyGoalsQuestions.done / weeklyGoalsQuestions.total) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Estudo Semanal SVG Visualizer */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
            {/* 1. Header Bar: Title, Week Navigator, and Main Adjust Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                  {chartMetricMode === 'volume' ? <BarChart2 size={18} /> : <Target size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                      Estudo Semanal
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      (Dom – Sáb)
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    {chartMetricMode === 'volume' 
                      ? 'Volume diário de estudo e questões resolvidas' 
                      : 'Rendimento diário e taxa de acertos em questões'}
                  </p>
                </div>
              </div>

              {/* Actions on the Right: Week Navigator + Primary Adjust Button */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {/* Week Navigator */}
                <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  {chartWeekOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setChartWeekOffset(0)}
                      className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-1 rounded-md hover:bg-emerald-200/70 dark:hover:bg-emerald-900/60 transition-all cursor-pointer mr-1"
                      title="Voltar para a semana atual"
                    >
                      Hoje
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChartWeekOffset(prev => prev - 1)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-md hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                    title="Semana anterior"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 px-2 min-w-[85px] text-center font-mono flex items-center justify-center gap-1">
                    <Calendar size={11} className="text-slate-400" />
                    <span>{weeklyChartData.rangeStr}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setChartWeekOffset(prev => prev + 1)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-md hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                    title="Próxima semana"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Primary Chart Adjust Action Button */}
                <button 
                  onClick={() => openAdjustChartForDate(activeSelectedDay?.dateKey)}
                  className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
                  title="Registrar ou ajustar tempo e questões no gráfico"
                >
                  <Edit2 size={12} />
                  <span>Ajustar Gráfico</span>
                </button>
              </div>
            </div>

            {/* 2. Sub-Toolbar: Segmented Metric Mode Switcher & Context Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/90 dark:bg-slate-850/60 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              {/* Segmented Mode Switcher */}
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setChartMetricMode('volume')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartMetricMode === 'volume'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Clock size={13} />
                  <span>Horas & Volume</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetricMode('accuracy')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartMetricMode === 'accuracy'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Target size={13} className={chartMetricMode === 'accuracy' ? 'text-emerald-500' : ''} />
                  <span>% de Acertos Diário</span>
                </button>
              </div>

              {/* Contextual Action / Indicator on the Right */}
              <div className="flex items-center gap-2">
                {chartMetricMode === 'volume' ? (
                  <button
                    type="button"
                    onClick={() => setShowAccuracyBadges(prev => !prev)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                      showAccuracyBadges
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                    title="Alternar exibição de badges de porcentagem de acertos sobre as colunas"
                  >
                    <Percent size={11} />
                    <span>Exibir % nos Dias</span>
                    <span className={`text-[8.5px] px-1 py-0.2 rounded-full font-mono uppercase font-black ${
                      showAccuracyBadges 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {showAccuracyBadges ? 'ON' : 'OFF'}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> ≥80%</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> 60-79%</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-full" /> &lt;60%</span>
                  </div>
                )}

                {/* Weekly Average Accuracy Pill */}
                {weeklyChartData.weeklyAccuracyPercent !== null && (
                  <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700 font-mono">
                    <span className="text-slate-400">Média:</span>
                    <span className={`font-black ${
                      weeklyChartData.weeklyAccuracyPercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                      weeklyChartData.weeklyAccuracyPercent >= 60 ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {weeklyChartData.weeklyAccuracyPercent}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Custom SVG Visualization Container */}
            <div className="h-36 w-full bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-100 dark:border-slate-800 relative mt-2 flex items-end justify-between p-2 px-6">
              {/* Background Reference Lines */}
              <div className="absolute inset-0 flex flex-col justify-between py-3 px-3 pointer-events-none opacity-40 z-0">
                <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full h-1 flex justify-end pr-1">
                  {chartMetricMode === 'accuracy' && <span className="text-[7px] text-slate-400 font-mono -mt-2">100%</span>}
                </div>
                <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full h-1 flex justify-end pr-1">
                  {chartMetricMode === 'accuracy' && <span className="text-[7px] text-slate-400 font-mono -mt-2">75%</span>}
                </div>
                <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full h-1 flex justify-end pr-1">
                  {chartMetricMode === 'accuracy' && <span className="text-[7px] text-slate-400 font-mono -mt-2">50%</span>}
                </div>
                <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full h-1 flex justify-end pr-1">
                  {chartMetricMode === 'accuracy' && <span className="text-[7px] text-slate-400 font-mono -mt-2">25%</span>}
                </div>
              </div>

              {/* Day Columns */}
              {weeklyChartData.dataList.map((day, idx) => {
                const isSelected = activeSelectedDay?.dateKey === day.dateKey;

                // Accuracy Mode Metrics
                const hasQuestions = day.questions > 0;
                const acc = day.accuracyPercent;
                
                // Height calculation
                let barHeightPct = 14;
                if (chartMetricMode === 'volume') {
                  const pct = day.hours / maxWeeklyHours;
                  barHeightPct = day.hours > 0 ? Math.max(16, Math.min(80, pct * 80)) : 14;
                } else {
                  // Accuracy mode
                  if (acc !== null) {
                    barHeightPct = Math.max(16, Math.min(82, (acc / 100) * 82));
                  } else {
                    barHeightPct = 12;
                  }
                }

                // Color styling for accuracy
                let accBadgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
                let accBarGradient = 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
                if (acc !== null) {
                  if (acc >= 80) {
                    accBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
                    accBarGradient = 'bg-gradient-to-t from-emerald-600 to-emerald-400 text-white shadow-sm shadow-emerald-500/20';
                  } else if (acc >= 60) {
                    accBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
                    accBarGradient = 'bg-gradient-to-t from-amber-600 to-amber-400 text-white shadow-sm shadow-amber-500/20';
                  } else {
                    accBadgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700';
                    accBarGradient = 'bg-gradient-to-t from-rose-600 to-rose-400 text-white shadow-sm shadow-rose-500/20';
                  }
                }
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setSelectedChartDayKey(day.dateKey);
                    }}
                    className="flex flex-col items-center justify-end h-full w-9 relative group z-10 select-none cursor-pointer"
                    title={`Clique para selecionar e detalhar (${day.dateFormatted})`}
                  >
                    {/* Rich Tooltip showing exact hours, questions & daily accuracy */}
                    <div className="absolute bottom-full mb-1.5 bg-slate-800 dark:bg-slate-700 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl leading-snug shrink-0 text-center whitespace-nowrap min-w-[100px] border border-slate-700">
                      <div className="font-black text-emerald-400">{day.fullDayName} • {day.dateFormatted}</div>
                      <div className="text-slate-300 text-[8px] mt-0.5">⏱️ Tempo: {formatMinutes(day.minsStudied)}</div>
                      <div className="text-purple-300 text-[8px]">
                        📝 Questões: {day.questions} ({day.correctCount} acertos / {day.wrongCount} erros)
                      </div>
                      <div className="mt-1 pt-1 border-t border-slate-700 flex items-center justify-center gap-1 font-black">
                        <span>🎯 Acertos:</span>
                        {acc !== null ? (
                          <span className={acc >= 80 ? 'text-emerald-400' : acc >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                            {acc}%
                          </span>
                        ) : (
                          <span className="text-slate-400">Sem questões</span>
                        )}
                      </div>
                      <div className="text-[7.5px] text-slate-400 mt-0.5">Toque p/ detalhar/editar</div>
                    </div>

                    {/* Floating Accuracy Tag above bar */}
                    {chartMetricMode === 'volume' ? (
                      showAccuracyBadges && acc !== null && (
                        <div className="absolute mb-1 bottom-[calc(var(--bar-h)+2px)] pointer-events-none z-20 transition-transform group-hover:scale-110">
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-2xs leading-none whitespace-nowrap ${accBadgeClass}`}>
                            {acc}%
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="mb-1 pointer-events-none z-20 transition-transform group-hover:scale-110">
                        {acc !== null ? (
                          <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-full shadow-2xs leading-none flex items-center gap-0.5 ${accBadgeClass}`}>
                            <span>{acc}%</span>
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-400 font-bold opacity-60">-</span>
                        )}
                      </div>
                    )}

                    {/* Bar Column */}
                    <div 
                      className={`w-7 rounded-t-md transition-all duration-300 flex flex-col justify-end items-center pb-1.5 relative ${
                        isSelected 
                          ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900 shadow-md' 
                          : day.isToday 
                          ? 'ring-1 ring-emerald-400/80 ring-offset-1 dark:ring-offset-slate-900' 
                          : ''
                      } ${
                        chartMetricMode === 'volume'
                          ? day.hours > 0 
                            ? 'bg-emerald-500 group-hover:bg-emerald-600 shadow-md shadow-emerald-500/10 text-white' 
                            : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600 text-slate-500 dark:text-slate-400'
                          : acc !== null
                            ? `${accBarGradient} group-hover:brightness-105`
                            : 'bg-slate-200/80 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400'
                      }`}
                      style={{ height: `${barHeightPct}%`, '--bar-h': `${barHeightPct}%` } as React.CSSProperties}
                    >
                      <span className="text-[9px] font-extrabold select-none leading-none drop-shadow-2xs">{day.label}</span>
                      <span className="text-[7px] font-bold opacity-80 leading-none mt-0.5">{day.dateFormatted.split('/')[0]}</span>
                    </div>

                    {/* Subtext under bar in accuracy mode */}
                    {chartMetricMode === 'accuracy' && (
                      <span className="text-[7.5px] font-mono font-bold text-slate-400 mt-1 leading-none">
                        {hasQuestions ? `${day.correctCount}/${day.totalAnswered}` : '0 q'}
                      </span>
                    )}
                  </div>
                );
              })}
              
              {/* SVG Trendline overlay (Volume mode: Questions count spline) */}
              {chartMetricMode === 'volume' && maxWeeklyQuestions > 0 && (() => {
                const pts = weeklyChartData.dataList.map((day, idx) => {
                  const x = 5 + (idx * 15);
                  const pct = day.questions / maxWeeklyQuestions;
                  const y = 93 - (pct * 83);
                  return { x, y };
                });

                const getBezierPath = (pointsArray: {x: number, y: number}[]) => {
                  if (pointsArray.length === 0) return "";
                  let path = `M ${pointsArray[0].x} ${pointsArray[0].y}`;
                  const tension = 0.35;
                  for (let i = 0; i < pointsArray.length - 1; i++) {
                    const p0 = pointsArray[i];
                    const p1 = pointsArray[i + 1];
                    const pPrev = pointsArray[i - 1] || p0;
                    const pNext = pointsArray[i + 2] || p1;
                    
                    const cp1x = p0.x + (p1.x - pPrev.x) * tension;
                    const cp1y = p0.y + (p1.y - pPrev.y) * tension;
                    const cp2x = p1.x - (pNext.x - p0.x) * tension;
                    const cp2y = p1.y - (pNext.y - p0.y) * tension;
                    
                    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
                  }
                  return path;
                };

                const bezierPathStr = getBezierPath(pts);
                const fillPathStr = pts.length > 0
                  ? `${bezierPathStr} L ${pts[pts.length - 1].x} 94 L ${pts[0].x} 94 Z`
                  : "";

                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none pb-6 pt-3 px-7 z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="purpleWaveGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {fillPathStr && (
                      <path 
                        d={fillPathStr} 
                        fill="url(#purpleWaveGlow)" 
                        className="transition-all duration-300"
                      />
                    )}

                    <path 
                      d={bezierPathStr} 
                      fill="none" 
                      stroke="#a855f7" 
                      strokeWidth="2.8" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="transition-all duration-300"
                    />
                    
                    {pts.map((pt, idx) => (
                      <g key={idx}>
                        <circle 
                          cx={pt.x} 
                          cy={pt.y} 
                          r="2.5" 
                          fill="#ffffff" 
                          stroke="#a855f7" 
                          strokeWidth="1.2" 
                          className="transition-all duration-300 drop-shadow-sm" 
                        />
                      </g>
                    ))}
                  </svg>
                );
              })()}

              {/* SVG Trendline overlay (Accuracy mode: Daily accuracy progression wave) */}
              {chartMetricMode === 'accuracy' && (() => {
                const daysWithAcc = weeklyChartData.dataList
                  .map((day, idx) => ({ ...day, idx }))
                  .filter(d => d.accuracyPercent !== null);

                if (daysWithAcc.length === 0) return null;

                const pts = daysWithAcc.map((day) => {
                  const x = 5 + (day.idx * 15);
                  const pct = (day.accuracyPercent || 0) / 100;
                  const y = 92 - (pct * 80);
                  return { x, y, acc: day.accuracyPercent };
                });

                const getBezierPath = (pointsArray: {x: number, y: number}[]) => {
                  if (pointsArray.length === 0) return "";
                  if (pointsArray.length === 1) return `M ${pointsArray[0].x} ${pointsArray[0].y}`;
                  let path = `M ${pointsArray[0].x} ${pointsArray[0].y}`;
                  const tension = 0.3;
                  for (let i = 0; i < pointsArray.length - 1; i++) {
                    const p0 = pointsArray[i];
                    const p1 = pointsArray[i + 1];
                    const pPrev = pointsArray[i - 1] || p0;
                    const pNext = pointsArray[i + 2] || p1;
                    
                    const cp1x = p0.x + (p1.x - pPrev.x) * tension;
                    const cp1y = p0.y + (p1.y - pPrev.y) * tension;
                    const cp2x = p1.x - (pNext.x - p0.x) * tension;
                    const cp2y = p1.y - (pNext.y - p0.y) * tension;
                    
                    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
                  }
                  return path;
                };

                const bezierPathStr = getBezierPath(pts);

                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none pb-6 pt-3 px-7 z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="accuracyLineGlow" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>

                    {pts.length > 1 && (
                      <path 
                        d={bezierPathStr} 
                        fill="none" 
                        stroke="url(#accuracyLineGlow)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeDasharray="4 2"
                        className="transition-all duration-300 drop-shadow-xs"
                      />
                    )}
                    
                    {pts.map((pt, idx) => (
                      <g key={idx}>
                        <circle 
                          cx={pt.x} 
                          cy={pt.y} 
                          r="3" 
                          fill="#ffffff" 
                          stroke={pt.acc && pt.acc >= 80 ? '#10b981' : pt.acc && pt.acc >= 60 ? '#f59e0b' : '#f43f5e'} 
                          strokeWidth="1.8" 
                          className="transition-all duration-300 drop-shadow-xs" 
                        />
                      </g>
                    ))}
                  </svg>
                );
              })()}
            </div>
            
            {/* Chart Legend & Summary Info */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-1 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
              {chartMetricMode === 'volume' ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
                    <span>Horas Estudadas (Coluna)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-purple-500 rounded-xs" />
                    <span>Questões Resolvidas (Linha)</span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
                    <span>Alta Taxa (≥ 80%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs" />
                    <span>Regular (60–79%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs" />
                    <span>Atenção (&lt; 60%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-slate-300 dark:bg-slate-700 rounded-xs" />
                    <span>Sem questões (-)</span>
                  </span>
                </div>
              )}

              {/* Weekly Summary Stat */}
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">Total na semana:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {formatHours(weeklyChartData.dataList.reduce((acc, curr) => acc + curr.hours, 0))}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {weeklyChartData.totalWeeklyQuestions} q
                </span>
              </div>
            </div>

            {/* Interactive Selected Day Performance Card */}
            {activeSelectedDay && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850/80 rounded-xl border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    activeSelectedDay.accuracyPercent !== null
                      ? activeSelectedDay.accuracyPercent >= 80
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : activeSelectedDay.accuracyPercent >= 60
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    <Target size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800 dark:text-white">
                        {activeSelectedDay.fullDayName}, {activeSelectedDay.dateFormatted}
                      </span>
                      {activeSelectedDay.isToday && (
                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          Hoje
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                      <span>⏱️ {formatMinutes(activeSelectedDay.minsStudied)} de estudo</span>
                      <span>•</span>
                      <span>📝 {activeSelectedDay.questions} questões resolvidas</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-[9.5px] uppercase font-bold tracking-wider text-slate-400">
                      Percentual de Acertos do Dia
                    </div>
                    {activeSelectedDay.accuracyPercent !== null ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`text-base font-black font-display ${
                          activeSelectedDay.accuracyPercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                          activeSelectedDay.accuracyPercent >= 60 ? 'text-amber-600 dark:text-amber-400' :
                          'text-rose-600 dark:text-rose-400'
                        }`}>
                          🎯 {activeSelectedDay.accuracyPercent}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold font-mono">
                          ({activeSelectedDay.correctCount} acertos / {activeSelectedDay.wrongCount} erros)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Nenhuma questão neste dia</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openAdjustChartForDate(activeSelectedDay.dateKey)}
                    className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 active:scale-95"
                    title={`Ajustar ou lançar dados de ${activeSelectedDay.dateFormatted}`}
                  >
                    <Edit2 size={12} />
                    <span>Editar Dia</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Reminders (Checklist) & Recent Activity Timeline Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Lembretes (Reminders) widget */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Lembretes & Compromissos</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddReminderModal(true)}
                className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                Adicionar Lembrete
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {reminders.map((rem) => (
                <div key={rem.id} className="flex items-center justify-between p-2.5 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={rem.completed} 
                      onChange={() => onToggleReminder(rem.id)}
                      className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4.5 h-4.5 cursor-pointer"
                    />
                    <span className={`text-[12px] font-semibold text-slate-700 dark:text-slate-200 ${rem.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                      {rem.text}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      rem.type === 'INSCRIÇÕES' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                        : rem.type === 'PROVAS' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {rem.type}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700 font-bold">
                      {rem.date}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => onDeleteReminder(rem.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded cursor-pointer"
                      title="Deletar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              
              {reminders.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-6">Nenhum lembrete cadastrado. Clique em Adicionar!</p>
              )}
            </div>
          </div>
          
          <button 
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white py-2.5 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 mt-4 cursor-pointer active:scale-98"
            onClick={() => setShowAddReminderModal(true)}
          >
            <Plus size={15} />
            Novo Lembrete de Edital
          </button>
        </div>

        {/* Últimas Atividades Cards Feed (Limitado aos 20 mais recentes com scroll inteligente) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          {/* Card Header with count badge and optional expand */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <History size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                    Últimas Atividades Registradas
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700">
                    {activityLogs.length > 20 && !showAllActivities ? '20 mais recentes' : `${activityLogs.length} ${activityLogs.length === 1 ? 'registro' : 'registros'}`}
                  </span>
                </div>
              </div>
            </div>

            {activityLogs.length > 20 && (
              <button
                type="button"
                onClick={() => setShowAllActivities(prev => !prev)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
              >
                <span>{showAllActivities ? 'Mostrar 20 recentes' : `Ver todas (${activityLogs.length})`}</span>
              </button>
            )}
          </div>
          
          {/* Activity Cards List with defined max-height to avoid stretching */}
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1.5 scrollbar-thin">
            {displayedActivityLogs.map((log) => {
              // Calculate accuracy if question stats exist
              const totalQ = log.questionsSolved || ((log.correctAnswers || 0) + (log.wrongAnswers || 0));
              const hasAnswers = (log.correctAnswers !== undefined || log.wrongAnswers !== undefined) && totalQ > 0;
              const accPct = hasAnswers ? Math.round(((log.correctAnswers || 0) / totalQ) * 100) : null;

              // Type badge styles
              const typeColor = log.studyType === 'Teoria'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60'
                : log.studyType === 'Questões'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                : log.studyType === 'Revisão'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60'
                : log.studyType === 'Simulado'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

              return (
                <div 
                  key={log.id} 
                  className="p-3 bg-slate-50/80 dark:bg-slate-850/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-800 transition-all hover:shadow-2xs group"
                >
                  {/* Card Top Row: Discipline, Type Badge, Timestamp, Delete */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[180px] sm:max-w-[220px]">
                        {log.disciplineName}
                      </span>
                      {log.studyType && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${typeColor}`}>
                          {log.studyType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-800">
                        <Clock size={10} className="text-slate-400" />
                        {log.timestamp}
                      </span>

                      {deletingLogId === log.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 px-1.5 py-0.5 rounded-md animate-scale-up">
                          <span className="text-[8.5px] text-rose-700 dark:text-rose-400 font-black uppercase mr-0.5 select-none">Excluir?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteActivityLog(log.id);
                              setDeletingLogId(null);
                            }}
                            className="bg-rose-500 text-white font-black text-[8.5px] px-1.5 py-0.5 rounded shadow-xs hover:bg-rose-600 cursor-pointer uppercase transition-colors"
                            title="Confirmar exclusão"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingLogId(null)}
                            className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[8.5px] px-1.5 py-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer uppercase transition-colors"
                            title="Cancelar"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingLogId(log.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1 rounded-md transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                          title="Excluir este registro de estudo"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Metrics Chips (Time, Questions, Accuracy) */}
                  {(log.timeSpentMin > 0 || totalQ > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {log.timeSpentMin > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 font-mono">
                          ⏱️ {formatMinutes(log.timeSpentMin)}
                        </span>
                      )}

                      {totalQ > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/60 font-mono">
                          📝 {totalQ} questões
                        </span>
                      )}

                      {accPct !== null && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border font-mono ${
                          accPct >= 80 
                            ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
                            : accPct >= 60 
                            ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                            : 'bg-rose-100/80 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                        }`}>
                          🎯 {accPct}% ({log.correctAnswers || 0}A / {log.wrongAnswers || 0}E)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Description/Details */}
                  <p className="font-medium text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {log.details}
                  </p>
                </div>
              );
            })}
            
            {activityLogs.length === 0 && (
              <div className="text-center py-10 px-4 text-slate-400 dark:text-slate-500">
                <History size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Nenhum estudo registrado ainda.</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Registre suas sessões no cronômetro da página Planejamento ou adicione diretamente pelo gráfico semanal!
                </p>
              </div>
            )}
          </div>

          {/* Footer note when capped at 20 */}
          {activityLogs.length > 20 && (
            <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px] text-slate-400 dark:text-slate-500">
              <span>
                {showAllActivities 
                  ? `Mostrando todas as ${activityLogs.length} atividades registradas.`
                  : `Mostrando as 20 mais recentes de ${activityLogs.length} atividades.`}
              </span>
              <button
                type="button"
                onClick={() => setShowAllActivities(prev => !prev)}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {showAllActivities ? 'Recolher para 20' : 'Ver todas'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reminder Addition Modal */}
      {showAddReminderModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full border border-slate-100 shadow-xl animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-extrabold text-lg text-slate-800">Criar Novo Lembrete</h3>
              <button 
                type="button" 
                onClick={() => setShowAddReminderModal(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Descrição do Compromisso</label>
                <input 
                  type="text" 
                  value={newReminderText}
                  onChange={(e) => setNewReminderText(e.target.value)}
                  placeholder="Ex: Entrega dos exames complementares"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Tipo</label>
                  <select 
                    value={newReminderType}
                    onChange={(e) => setNewReminderType(e.target.value as 'INSCRIÇÕES' | 'PROVAS' | 'GERAL')}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-medium focus:ring-1 focus:ring-primary"
                  >
                    <option value="GERAL">Geral</option>
                    <option value="INSCRIÇÕES">Inscrições</option>
                    <option value="PROVAS">Provas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Data Prevista</label>
                  <input 
                    type="text" 
                    value={newReminderDate}
                    onChange={(e) => setNewReminderDate(e.target.value)}
                    placeholder="Ex: 12/11/26"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-mono font-bold focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddReminderModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-semibold text-white bg-primary hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD STUDY SESSION MODAL FORM */}
      {showAddStudyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-scale-up space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-display font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={16} className="text-primary" />
                Registrar Nova Sessão de Estudo
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddStudyModal(false)}
                className="text-slate-450 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitStudySession} className="space-y-4">
              {/* Disciplina */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Matéria Estudada</label>
                <select
                  value={studyDisciplineId}
                  onChange={(e) => handleDisciplineChangeForStudy(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200"
                  required
                >
                  <option value="" disabled>Selecione uma disciplina...</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Data do Estudo */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-550 mb-1.5 uppercase tracking-wider font-semibold">Data do Estudo</label>
                <input
                  type="date"
                  value={studyDate}
                  onChange={(e) => setStudyDate(e.target.value)}
                  max={getTodayDateString()}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200 font-mono"
                  required
                />
              </div>

              {/* Tópico Assunto */}
              {studyDisciplineId && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Tópico do Edital</label>
                    <select
                      value={studyTopicId}
                      onChange={(e) => {
                        setStudyTopicId(e.target.value);
                        setStudyConcludeTopic(false);
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200"
                    >
                      <option value="">Geral / Sem Tópico Específico</option>
                      {disciplines.find(d => d.id === studyDisciplineId)?.topics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {studyTopicId && (
                    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-850/60 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800/40 font-semibold font-sans">
                      <input
                        type="checkbox"
                        id="studyConcludeTopic"
                        checked={studyConcludeTopic || (disciplines.find(d => d.id === studyDisciplineId)?.topics.find(t => t.id === studyTopicId)?.completed || false)}
                        disabled={disciplines.find(d => d.id === studyDisciplineId)?.topics.find(t => t.id === studyTopicId)?.completed || false}
                        onChange={(e) => setStudyConcludeTopic(e.target.checked)}
                        className="w-4 h-4 rounded text-primary border-slate-200 dark:border-slate-800 focus:ring-primary focus:ring-2 cursor-pointer"
                      />
                      <label htmlFor="studyConcludeTopic" className="text-xs font-semibold text-slate-700 dark:text-slate-350 select-none cursor-pointer">
                        {disciplines.find(d => d.id === studyDisciplineId)?.topics.find(t => t.id === studyTopicId)?.completed 
                          ? "✨ Tópico já concluído no edital" 
                          : "Marcar este tópico como concluído no edital nesta sessão"}
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Horas e Minutos */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Tempo Estudado</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={studyHours}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setStudyHours('');
                          } else {
                            const parsed = parseInt(val, 10);
                            setStudyHours(isNaN(parsed) ? 0 : Math.max(0, parsed));
                          }
                        }}
                        min={0}
                        className="w-full pl-3 pr-12 py-1.5 text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-slate-800 dark:text-white"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">hora(s)</span>
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={studyMinutes}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setStudyMinutes('');
                          } else {
                            const parsed = parseInt(val, 10);
                            setStudyMinutes(isNaN(parsed) ? 0 : Math.min(59, Math.max(0, parsed)));
                          }
                        }}
                        min={0}
                        max={59}
                        className="w-full pl-3 pr-14 py-1.5 text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-slate-800 dark:text-white"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">minuto(s)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Foco de Estudo */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Foco do Estudo</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Teoria', 'Questões', 'Revisão', 'Simulado'] as const).map((type) => {
                    const isActive = studyType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeChange(type)}
                        className={`py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer border ${
                          isActive 
                            ? 'bg-primary text-white border-primary shadow-xs' 
                            : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Material Estudado */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Material Utilizado</label>
                <select
                  value={studyMaterial}
                  onChange={(e) => setStudyMaterial(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200"
                  required
                >
                  <option value="PDF">📄 PDF</option>
                  <option value="Videoaula">🎥 Videoaula</option>
                  <option value="Livro / Apostila">📚 Livro / Apostila</option>
                  <option value="Lei Seca">⚖️ Lei Seca</option>
                  <option value="Resumos / Mapas">🗺️ Resumos / Mapas</option>
                  <option value="Áudio">🎧 Áudio</option>
                  <option value="Outro">🌐 Outro</option>
                </select>
              </div>

              {/* Acertos e Erros */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rendimento (Questões Resolvidas)</span>
                  {(studyType === 'Questões' || studyType === 'Simulado') && (
                    <span className="text-[8px] bg-emerald-55/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">Recomendado</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase">Acertos</label>
                    <input 
                      type="number" 
                      value={studyCorrect}
                      onChange={(e) => setStudyCorrect(Math.max(0, Number(e.target.value)))}
                      min={0}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase">Erros</label>
                    <input 
                      type="number" 
                      value={studyWrong}
                      onChange={(e) => setStudyWrong(Math.max(0, Number(e.target.value)))}
                      min={0}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center text-rose-505"
                    />
                  </div>
                </div>

                {/* Live Accuracy percentage indicator block */}
                {(studyCorrect > 0 || studyWrong > 0) && (
                  <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400">Taxa de Acertos:</span>
                    <span className={`font-mono font-black ${
                      (studyCorrect / (studyCorrect + studyWrong)) >= 0.85 ? 'text-emerald-500' :
                      (studyCorrect / (studyCorrect + studyWrong)) >= 0.70 ? 'text-amber-500' :
                      'text-rose-500'
                    }`}>
                      {Math.round((studyCorrect / (studyCorrect + studyWrong)) * 100)}% ({studyCorrect} acertos / {studyWrong} erros)
                    </span>
                  </div>
                )}
              </div>

              {/* Anotações */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-505 mb-1.5 uppercase tracking-wider font-semibold">Anotações / Dificuldades</label>
                <textarea
                  value={studyNotes}
                  onChange={(e) => setStudyNotes(e.target.value)}
                  placeholder="Macetes da banca, principais erros cometidos, pontos de atenção..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* Confirm / Cancel Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddStudyModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/95 rounded-lg cursor-pointer transition-colors shadow-sm uppercase tracking-wider"
                >
                  Confirmar Estudo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STUDY ACCUMULATED HOURS MODAL */}
      {showAdjustHoursModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-scale-up space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-display font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-rose-500" />
                Alterar Tempo Acumulado
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAdjustHoursModal(false)}
                className="text-slate-450 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDisciplineAdjustment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Matéria</label>
                <select
                  value={adjustDisciplineId}
                  onChange={(e) => handleSelectDisciplineToAdjust(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200"
                  required
                >
                  <option value="" disabled>Selecione uma disciplina...</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-550 mb-1.5 uppercase tracking-wider font-semibold">Novo Tempo Acumulado de Estudo</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">Horas</label>
                    <input 
                      type="number" 
                      value={adjustHours}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setAdjustHours('');
                        } else {
                          const parsed = parseInt(val, 10);
                          setAdjustHours(isNaN(parsed) ? 0 : Math.max(0, parsed));
                        }
                      }}
                      min={0}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">Minutos</label>
                    <input 
                      type="number" 
                      value={adjustMinutes}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setAdjustMinutes('');
                        } else {
                          const parsed = parseInt(val, 10);
                          setAdjustMinutes(isNaN(parsed) ? 0 : Math.min(59, Math.max(0, parsed)));
                        }
                      }}
                      min={0}
                      max={59}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 rounded-lg border border-rose-100 dark:border-rose-950/20 text-[10.5px] text-rose-700 dark:text-rose-400 leading-relaxed font-semibold">
                ⚠️ <strong>Atenção:</strong> Isso irá alterar diretamente a carga horária acumulada da matéria. O total geral de estudo e o progresso da meta semanal serão recalculados automaticamente em tempo real.
              </div>

              {/* Confirm / Cancel Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAdjustHoursModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors shadow-sm uppercase tracking-wider"
                >
                  Confirmar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDY GOALS MODAL */}
      {showEditGoalsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-scale-up space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-display font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-rose-500" />
                Ajustar Metas de Estudo
              </h3>
              <button 
                type="button" 
                onClick={() => setShowEditGoalsModal(false)}
                className="text-slate-450 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWeeklyGoals} className="space-y-4">
              <div>
                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-2 font-semibold">Meta de Horas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">Horas Cumpridas (Estudado)</label>
                    <input 
                      type="number" 
                      value={newGoalsHoursDone}
                      onChange={(e) => setNewGoalsHoursDone(Math.max(0, Number(e.target.value)))}
                      min={0}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">Meta Total de Horas</label>
                    <input 
                      type="number" 
                      value={newGoalsHours}
                      onChange={(e) => setNewGoalsHours(Math.max(0, Number(e.target.value)))}
                      min={0}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-2 font-semibold">Meta de Questões</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">Questões Resolvidas</label>
                    <input 
                      type="number" 
                      value={newGoalsQuestionsDone}
                      onChange={(e) => setNewGoalsQuestionsDone(Math.max(0, Number(e.target.value)))}
                      min={0}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">Meta Total de Questões</label>
                    <input 
                      type="number" 
                      value={newGoalsQuestions}
                      onChange={(e) => setNewGoalsQuestions(Math.max(0, Number(e.target.value)))}
                      min={0}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 rounded-lg border border-rose-100 dark:border-rose-950/20 text-[10.5px] text-rose-700 dark:text-rose-400 leading-relaxed font-semibold">
                ⚠️ <strong>Dica:</strong> Para obter as metas corretas de estudo recomendadas diárias ou semanais, ajuste os totais desejados acima. A alteração será refletida instantaneamente.
              </div>

              {/* Confirm / Cancel Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowEditGoalsModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors shadow-sm uppercase tracking-wider"
                >
                  Salvar Metas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust / Correct Weekly Chart Record */}
      {showAdjustChartModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">Corrigir Registros do Gráfico</h3>
                  <p className="text-[10px] text-slate-400">Lance ou ajuste horas de estudo para uma data específica</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdjustChartModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveChartAdjustment} className="space-y-4">
              {/* Data do Registro */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">
                  Data do Estudo
                </label>
                <input 
                  type="date" 
                  value={adjustChartDate}
                  onChange={(e) => setAdjustChartDate(e.target.value)}
                  max={getTodayDateString()}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold"
                  required
                />
              </div>

              {/* Matéria */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">
                  Matéria
                </label>
                <select
                  value={adjustChartDisciplineId}
                  onChange={(e) => setAdjustChartDisciplineId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-200"
                  required
                >
                  <option value="" disabled>Selecione uma disciplina...</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Tempo Estudado */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">
                  Tempo Estudado nesta Data
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Horas</label>
                    <input 
                      type="number" 
                      min={0}
                      max={24}
                      value={adjustChartHours}
                      onChange={(e) => setAdjustChartHours(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Minutos</label>
                    <input 
                      type="number" 
                      min={0}
                      max={59}
                      value={adjustChartMinutes}
                      onChange={(e) => setAdjustChartMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Foco e Questões */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">
                    Foco
                  </label>
                  <select
                    value={adjustChartType}
                    onChange={(e) => setAdjustChartType(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg font-bold"
                  >
                    <option value="Teoria">Teoria</option>
                    <option value="Revisão">Revisão</option>
                    <option value="Questões">Questões</option>
                    <option value="Simulado">Simulado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">
                    Questões Totais
                  </label>
                  <input 
                    type="number" 
                    min={0}
                    value={adjustChartQuestions || (adjustChartCorrect + adjustChartWrong) || 0}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setAdjustChartQuestions(val);
                      if (val === 0) {
                        setAdjustChartCorrect(0);
                        setAdjustChartWrong(0);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold font-mono text-center"
                  />
                </div>
              </div>

              {/* Acertos e Erros (Rendimento Diário no Gráfico) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850/70 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Rendimento (Acertos & Erros)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-black">
                    Calcula % no Gráfico
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Acertos</label>
                    <input 
                      type="number" 
                      min={0}
                      value={adjustChartCorrect}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setAdjustChartCorrect(val);
                        setAdjustChartQuestions(val + adjustChartWrong);
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold font-mono text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Erros</label>
                    <input 
                      type="number" 
                      min={0}
                      value={adjustChartWrong}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setAdjustChartWrong(val);
                        setAdjustChartQuestions(adjustChartCorrect + val);
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-rose-500 font-bold font-mono text-center text-xs"
                    />
                  </div>
                </div>

                {(adjustChartCorrect > 0 || adjustChartWrong > 0) && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400">Taxa de Acertos Calculada:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">
                      🎯 {Math.round((adjustChartCorrect / (adjustChartCorrect + adjustChartWrong)) * 100)}% de acertos
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-[10.5px] text-emerald-800 dark:text-emerald-300 leading-relaxed font-semibold">
                ✨ <strong>Sincronização em tempo real:</strong> Ao confirmar, o registro de estudo será lançado para a data selecionada ({adjustChartDate}), recalculando na hora o gráfico e adicionando o registro no feed.
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAdjustChartModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors shadow-sm uppercase tracking-wider"
                >
                  Confirmar Correção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: All Studied Days History */}
      <AllStudiedDaysModal
        isOpen={showAllStudiedDaysModal}
        onClose={() => setShowAllStudiedDaysModal(false)}
        activityLogs={activityLogs}
        regDate={regDate}
        disciplines={disciplines}
        currentStreak={streakCalc.currentStreak}
        recordStreak={streakCalc.recordStreak}
      />

    </div>
  );
}
