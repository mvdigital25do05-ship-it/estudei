/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Gavel, 
  Laptop, 
  Calculator, 
  BookOpen, 
  Activity, 
  Shield, 
  Plus, 
  TrendingUp, 
  ArrowRight, 
  Clock, 
  MoreVertical,
  X,
  FileCheck2,
  Trash2,
  HelpCircle,
  Eye,
  Edit2,
  Check,
  AlertTriangle,
  History,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { Discipline, Topic, ExerciseLog, ActivityLog, ExamPriority, LearningPhase } from '../types';
import { buildTopicDiagnostics, PHASE_LABELS } from '../studyStrategy';
import { formatMinutes } from '../utils';

interface DisciplinasListProps {
  disciplines: Discipline[];
  onAddDiscipline: (d: Omit<Discipline, 'id'>) => void;
  onDeleteDiscipline: (id: string) => void;
  onUpdateDiscipline: (d: Discipline) => void;
  exerciseLogs: ExerciseLog[];
  activityLogs?: ActivityLog[];
  onAddExerciseLog: (log: Omit<ExerciseLog, 'id' | 'date'>, shouldCreateTopic?: boolean) => void;
  onDeleteExerciseLog: (id: string) => void;
  autoOpenAddModal?: boolean;
  onResetAutoOpen?: () => void;
}

const ICONS_MAP = {
  gavel: Gavel,
  computer: Laptop,
  calculate: Calculator,
  book: BookOpen,
  shield: Shield,
  scale: Activity
};

export default function DisciplinasList({ 
  disciplines, 
  onAddDiscipline, 
  onDeleteDiscipline, 
  onUpdateDiscipline,
  exerciseLogs,
  activityLogs = [],
  onAddExerciseLog,
  onDeleteExerciseLog,
  autoOpenAddModal,
  onResetAutoOpen
}: DisciplinasListProps) {
  const [filter, setFilter] = useState('Todas');
  const [showAddModal, setShowAddModal] = useState(false);

  React.useEffect(() => {
    if (autoOpenAddModal) {
      setShowAddModal(true);
      if (onResetAutoOpen) {
        onResetAutoOpen();
      }
    }
  }, [autoOpenAddModal, onResetAutoOpen]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);

  // Exercise registration form states
  const [showExerciseFormModal, setShowExerciseFormModal] = useState(false);
  const [exFormDisciplineId, setExFormDisciplineId] = useState('');
  const [exFormTopicId, setExFormTopicId] = useState('');
  const [exFormIsNewTopic, setExFormIsNewTopic] = useState(false);
  const [exFormCustomTopicName, setExFormCustomTopicName] = useState('');
  const [exFormCorrectAnswers, setExFormCorrectAnswers] = useState(8);
  const [exFormWrongAnswers, setExFormWrongAnswers] = useState(2);
  const [exFormNotes, setExFormNotes] = useState('');
  const [exFormDifficulty, setExFormDifficulty] = useState<'Baixa' | 'Média' | 'Alta'>('Média');

  // Exercise log analytics card states
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'logs' | 'difficulties' | 'mostPracticed' | 'evolution'>('logs');

  // New Discipline Form states
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState(0); // minutes
  const [newCorrect, setNewCorrect] = useState(0);
  const [newWrong, setNewWrong] = useState(0);
  const [newIcon, setNewIcon] = useState<'gavel' | 'computer' | 'calculate' | 'book' | 'scale' | 'shield'>('gavel');
  const [newColor, setNewColor] = useState('blue');

  // Temp Topic Management inside the creation modal
  const [tempTopics, setTempTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');

  // Topic editing state in details reports panel
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');
  const [newTopicNameForActiveDiscipline, setNewTopicNameForActiveDiscipline] = useState('');
  
  const [addingSubtopicToTopicId, setAddingSubtopicToTopicId] = useState<string | null>(null);
  const [newSubtopicName, setNewSubtopicName] = useState('');

  // Synchronized active discipline
  const activeDiscipline = disciplines.find((d) => d.id === selectedDiscipline?.id) || null;
  const topicDiagnostics = React.useMemo(
    () => new Map(buildTopicDiagnostics(disciplines, exerciseLogs).map(item => [item.key, item])),
    [disciplines, exerciseLogs]
  );

  // Metadados opcionais: atualizar apenas o tópico correspondente mantém logs e IDs.
  const handleSetTopicPriority = (topicId: string, value: string) => {
    if (!activeDiscipline) return;
    const updatedTopics = activeDiscipline.topics.map(topic => {
      if (topic.id !== topicId) return topic;
      if (value === 'A' || value === 'B' || value === 'C') {
        return { ...topic, examPriority: value as ExamPriority, examPrioritySource: 'Classificação manual' };
      }
      const { examPriority: _priority, examPrioritySource: _source, ...rest } = topic;
      return rest;
    });
    onUpdateDiscipline({ ...activeDiscipline, topics: updatedTopics });
  };

  const handleSetTopicPhase = (topicId: string, value: string) => {
    if (!activeDiscipline) return;
    const updatedTopics = activeDiscipline.topics.map(topic => {
      if (topic.id !== topicId) return topic;
      if (value === 'base' || value === 'consolidacao' || value === 'dominio') {
        return { ...topic, learningPhase: value as LearningPhase };
      }
      const { learningPhase: _phase, ...rest } = topic;
      return rest;
    });
    onUpdateDiscipline({ ...activeDiscipline, topics: updatedTopics });
  };

  const handleAddTempTopic = () => {
    if (topicInput.trim()) {
      setTempTopics([...tempTopics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const handleRemoveTempTopic = (index: number) => {
    setTempTopics(tempTopics.filter((_, idx) => idx !== index));
  };

  const handleToggleTopic = (topicId: string) => {
    if (!activeDiscipline) return;
    const updatedTopics = activeDiscipline.topics.map(t => {
      if (t.id === topicId) {
        const newCompletedStatus = !t.completed;
        const updatedSubtopics = (t.subtopics || []).map(st => ({...st, completed: newCompletedStatus}));
        return { ...t, completed: newCompletedStatus, subtopics: updatedSubtopics };
      }
      return t;
    });
    const updatedDiscipline: Discipline = {
      ...activeDiscipline,
      topics: updatedTopics,
      topicsTotal: updatedTopics.length,
      topicsDone: updatedTopics.filter(t => t.completed).length
    };
    onUpdateDiscipline(updatedDiscipline);
  };

  const handleToggleSubtopic = (topicId: string, subtopicId: string) => {
    if (!activeDiscipline) return;
    const updatedTopics = activeDiscipline.topics.map(t => {
      if (t.id === topicId) {
        const updatedSubtopics = (t.subtopics || []).map(st => 
          st.id === subtopicId ? { ...st, completed: !st.completed } : st
        );
        const allSubtopicsCompleted = updatedSubtopics.length > 0 && updatedSubtopics.every(st => st.completed);
        return { ...t, subtopics: updatedSubtopics, completed: allSubtopicsCompleted };
      }
      return t;
    });
    
    const updatedDiscipline: Discipline = {
      ...activeDiscipline,
      topics: updatedTopics,
      topicsTotal: updatedTopics.length,
      topicsDone: updatedTopics.filter(t => t.completed).length
    };
    onUpdateDiscipline(updatedDiscipline);
  };

  const handleAddSubtopic = (topicId: string) => {
    if (!activeDiscipline || !newSubtopicName.trim()) return;
    const updatedTopics = activeDiscipline.topics.map(t => {
      if (t.id === topicId) {
        const newSubtopic = {
          id: `subtopic_${Date.now()}`,
          name: newSubtopicName.trim(),
          completed: false
        };
        const currentSubtopics = t.subtopics || [];
        return { ...t, subtopics: [...currentSubtopics, newSubtopic], completed: false };
      }
      return t;
    });
    const updatedDiscipline: Discipline = {
      ...activeDiscipline,
      topics: updatedTopics,
      topicsTotal: updatedTopics.length,
      topicsDone: updatedTopics.filter(t => t.completed).length
    };
    onUpdateDiscipline(updatedDiscipline);
    setAddingSubtopicToTopicId(null);
    setNewSubtopicName('');
  };

  const handleDeleteSubtopic = (topicId: string, subtopicId: string) => {
    if (!activeDiscipline) return;
    const updatedTopics = activeDiscipline.topics.map(t => {
      if (t.id === topicId) {
        const updatedSubtopics = (t.subtopics || []).filter(st => st.id !== subtopicId);
        const allSubtopicsCompleted = updatedSubtopics.length > 0 ? updatedSubtopics.every(st => st.completed) : t.completed;
        return { ...t, subtopics: updatedSubtopics, completed: allSubtopicsCompleted };
      }
      return t;
    });
    
    const updatedDiscipline: Discipline = {
      ...activeDiscipline,
      topics: updatedTopics,
      topicsTotal: updatedTopics.length,
      topicsDone: updatedTopics.filter(t => t.completed).length
    };
    onUpdateDiscipline(updatedDiscipline);
  };

  const handleStartEditTopic = (topicId: string, name: string) => {
    setEditingTopicId(topicId);
    setEditingTopicName(name);
  };

  const handleSaveEditTopic = (topicId: string) => {
    if (!activeDiscipline || !editingTopicName.trim()) return;
    const updatedTopics = activeDiscipline.topics.map(t => 
      t.id === topicId ? { ...t, name: editingTopicName.trim() } : t
    );
    const updatedDiscipline: Discipline = {
      ...activeDiscipline,
      topics: updatedTopics
    };
    onUpdateDiscipline(updatedDiscipline);
    setEditingTopicId(null);
    setEditingTopicName('');
  };

  const handleDeleteTopic = (topicId: string) => {
    if (!activeDiscipline) return;
    const updatedTopics = activeDiscipline.topics.filter(t => t.id !== topicId);
    const updatedDiscipline: Discipline = {
      ...activeDiscipline,
      topics: updatedTopics,
      topicsTotal: updatedTopics.length,
      topicsDone: updatedTopics.filter(t => t.completed).length
    };
    onUpdateDiscipline(updatedDiscipline);
  };

  const handleAddNewTopicToActive = () => {
    if (!activeDiscipline || !newTopicNameForActiveDiscipline.trim()) return;
    const newTopic = {
      id: `topic_${Date.now()}`,
      name: newTopicNameForActiveDiscipline.trim(),
      completed: false
    };
    const updatedTopics = [...activeDiscipline.topics, newTopic];
    const updatedDiscipline: Discipline = {
      ...activeDiscipline,
      topics: updatedTopics,
      topicsTotal: updatedTopics.length,
      topicsDone: updatedTopics.filter(t => t.completed).length
    };
    onUpdateDiscipline(updatedDiscipline);
    setNewTopicNameForActiveDiscipline('');
  };

  // Exercise Handlers
  const handleOpenExerciseForm = (prefilledDisciplineId?: string) => {
    const selectedDiscId = prefilledDisciplineId || (disciplines.length > 0 ? disciplines[0].id : '');
    setExFormDisciplineId(selectedDiscId);
    
    const disc = disciplines.find(d => d.id === selectedDiscId);
    if (disc && disc.topics.length > 0) {
      setExFormTopicId(disc.topics[0].id);
      setExFormIsNewTopic(false);
    } else {
      setExFormTopicId('custom');
      setExFormIsNewTopic(true);
    }
    
    setExFormCustomTopicName('');
    setExFormCorrectAnswers(8);
    setExFormWrongAnswers(2);
    setExFormNotes('');
    setExFormDifficulty('Média');
    setShowExerciseFormModal(true);
  };

  const handleDisciplineChange = (discId: string) => {
    setExFormDisciplineId(discId);
    const disc = disciplines.find(d => d.id === discId);
    if (disc && disc.topics.length > 0) {
      setExFormTopicId(disc.topics[0].id);
      setExFormIsNewTopic(false);
    } else {
      setExFormTopicId('custom');
      setExFormIsNewTopic(true);
    }
  };

  const handleTopicChange = (topicId: string) => {
    setExFormTopicId(topicId);
    if (topicId === 'custom') {
      setExFormIsNewTopic(true);
    } else {
      setExFormIsNewTopic(false);
    }
  };

  const handleExerciseFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exFormDisciplineId) return;

    const disc = disciplines.find(d => d.id === exFormDisciplineId);
    if (!disc) return;

    let topicName = '';
    let topicId = exFormTopicId;

    if (exFormIsNewTopic) {
      if (!exFormCustomTopicName.trim()) {
        alert('Por favor, informe o nome do novo assunto.');
        return;
      }
      topicName = exFormCustomTopicName.trim();
      topicId = `topic_${Date.now()}`;
    } else {
      const topicObj = disc.topics.find(t => t.id === exFormTopicId);
      if (topicObj) {
        topicName = topicObj.name;
      } else {
        topicName = 'Geral';
      }
    }

    const totalQuestions = Number(exFormCorrectAnswers) + Number(exFormWrongAnswers);
    const accuracy = totalQuestions > 0 ? Math.round((Number(exFormCorrectAnswers) / totalQuestions) * 100) : 0;

    onAddExerciseLog({
      disciplineId: exFormDisciplineId,
      disciplineName: disc.name,
      topicId,
      topicName,
      questionsCount: totalQuestions,
      accuracyPercent: accuracy,
      correctAnswers: Number(exFormCorrectAnswers),
      wrongAnswers: Number(exFormWrongAnswers),
      notes: exFormNotes.trim(),
      difficulty: exFormDifficulty
    }, exFormIsNewTopic);

    setShowExerciseFormModal(false);
  };

  const topicStats = React.useMemo(() => {
    const statsMap: Record<string, {
      topicId: string;
      topicName: string;
      disciplineId: string;
      disciplineName: string;
      questionsCount: number;
      correctAnswers: number;
      wrongAnswers: number;
      accuracyPercent: number;
      difficulties: ('Baixa' | 'Média' | 'Alta')[];
      notesCount: number;
    }> = {};

    exerciseLogs.forEach(log => {
      const key = `${log.disciplineId}_${log.topicId}`;
      if (!statsMap[key]) {
        statsMap[key] = {
          topicId: log.topicId,
          topicName: log.topicName,
          disciplineId: log.disciplineId,
          disciplineName: log.disciplineName,
          questionsCount: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          accuracyPercent: 0,
          difficulties: [],
          notesCount: 0
        };
      }
      statsMap[key].questionsCount += log.questionsCount;
      statsMap[key].correctAnswers += log.correctAnswers;
      statsMap[key].wrongAnswers += log.wrongAnswers;
      if (log.difficulty) {
        statsMap[key].difficulties.push(log.difficulty);
      }
      if (log.notes && log.notes.trim()) {
        statsMap[key].notesCount += 1;
      }
    });

    return Object.values(statsMap).map(item => {
      const total = item.correctAnswers + item.wrongAnswers;
      return {
        ...item,
        accuracyPercent: total > 0 ? Math.round((item.correctAnswers / total) * 100) : 0
      };
    });
  }, [exerciseLogs]);

  const filteredDisciplines = disciplines.filter((d) => {
    const accuracy = d.correctAnswers + d.wrongAnswers > 0 
      ? (d.correctAnswers / (d.correctAnswers + d.wrongAnswers)) * 100 
      : 0;
    const progress = d.topicsTotal > 0 ? (d.topicsDone / d.topicsTotal) * 100 : 0;
    
    if (filter === 'Concluídas') return progress >= 100;
    if (filter === 'Em Andamento') return progress > 0 && progress < 100;
    if (filter === 'Não Iniciadas') return progress === 0;
    return true;
  });

  const getAccuracyBadgeClass = (correct: number, wrong: number) => {
    const total = correct + wrong;
    if (total === 0) return 'bg-slate-100 text-slate-500';
    const accuracy = (correct / total) * 100;
    if (accuracy >= 85) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (accuracy >= 70) return 'bg-amber-100 text-amber-800 border border-amber-200';
    return 'bg-rose-100 text-rose-800 border border-rose-200';
  };

  const getAccuracyPercent = (correct: number, wrong: number) => {
    const total = correct + wrong;
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const topicObjects = tempTopics.map((name, index) => ({
      id: `topic_${Date.now()}_${index}`,
      name,
      completed: false
    }));

    onAddDiscipline({
      name: newName,
      topicsTotal: topicObjects.length,
      topicsDone: 0,
      topics: topicObjects,
      timeSpentMin: Number(newTime),
      correctAnswers: Number(newCorrect),
      wrongAnswers: Number(newWrong),
      icon: newIcon,
      colorClass: newColor
    });

    // Reset Form
    setNewName('');
    setTempTopics([]);
    setTopicInput('');
    setNewTime(0);
    setNewCorrect(0);
    setNewWrong(0);
    setNewIcon('gavel');
    setNewColor('blue');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-slate-500 font-medium text-xs">Gerencie suas matérias e acompanhe seu progresso detalhado.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shrink-0 cursor-pointer"
          >
            <option value="Todas">Todas as Disciplinas</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluídas">Concluídas (100%)</option>
            <option value="Não Iniciadas">Não Iniciadas</option>
          </select>
          
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer active:scale-98"
          >
            <Plus size={15} />
            Nova Disciplina
          </button>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {filteredDisciplines.map((d) => {
          const IconComponent = ICONS_MAP[d.icon] || BookOpen;
          const progressPercent = d.topicsTotal > 0 ? Math.round((d.topicsDone / d.topicsTotal) * 100) : 0;
          
          return (
            <div 
              key={d.id} 
              className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between min-h-[250px]"
            >
              {/* Card Header utilities */}
              <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  type="button" 
                  onClick={() => onDeleteDiscipline(d.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Deletar Disciplina"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Subject metadata */}
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-emerald-50 text-primary flex items-center justify-center border border-emerald-100 shrink-0`}>
                    <IconComponent size={22} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-[15px] text-slate-800 leading-tight pr-5 line-clamp-1">
                      {d.name}
                    </h3>
                    <p className="font-sans text-[11px] text-slate-400 font-bold mt-1">
                      {d.topicsDone} de {d.topicsTotal} Tópicos Concluídos
                    </p>
                  </div>
                </div>

                {/* Progress elements */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span>Progresso do Edital</span>
                      <span className="text-primary font-black font-mono">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-primary transition-all duration-300`} 
                        style={{ width: `${progressPercent}%` }} 
                      />
                    </div>
                  </div>

                  {/* Info stats row */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">Tempo Total</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-slate-400" />
                        {formatMinutes(d.timeSpentMin)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">Desempenho</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${getAccuracyBadgeClass(d.correctAnswers, d.wrongAnswers)}`}>
                        {getAccuracyPercent(d.correctAnswers, d.wrongAnswers)}% Acertos
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* View details footer CTA */}
              <button 
                type="button"
                onClick={() => setSelectedDiscipline(d)}
                className="w-full mt-4 py-2 text-primary hover:bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Ver Detalhes
                <ArrowRight size={14} />
              </button>

            </div>
          );
        })}

        </div>

      <div className="h-6" />

      {/* SEÇÃO PRINCIPAL DE EXERCÍCIOS PRÁTICOS E ANÁLISE POR TÓPICOS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
        
        {/* Header da Seção */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 text-emerald-700 dark:text-emerald-400 bg-emerald-55/10 dark:bg-emerald-500/10 rounded font-bold text-[9px] uppercase tracking-wider">Análise de Rendimento</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h3 className="font-display font-black text-base text-slate-800 dark:text-white uppercase tracking-wider mt-1.5 flex items-center gap-2">
              <BarChart3 className="text-secondary" size={20} />
              Exercícios Práticos Realizados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Associe blocos de questões resolvidas a tópicos específicos e monitore sua evolução teórica de forma direcionada.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => handleOpenExerciseForm()}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 transition-colors cursor-pointer active:scale-98 shadow-xs shrink-0"
          >
            <Plus size={15} />
            Registrar Questões Resolvidas
          </button>
        </div>

        {/* Tab Switcher & Stats Overview */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Navegação de Abas Analíticas (Left) */}
          <div className="w-full lg:w-1/4 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-150 dark:border-slate-800 pr-0 lg:pr-4 shrink-0 [scrollbar-width:none]">
            <button
              onClick={() => setActiveAnalysisTab('logs')}
              className={`flex items-center gap-2 text-xs font-bold py-2.5 px-3 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap lg:w-full ${activeAnalysisTab === 'logs' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <History size={14} />
              Histórico Recente
            </button>
            <button
              onClick={() => setActiveAnalysisTab('mostPracticed')}
              className={`flex items-center gap-2 text-xs font-bold py-2.5 px-3 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap lg:w-full ${activeAnalysisTab === 'mostPracticed' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <TrendingUp size={14} />
              Taxa por Assunto
            </button>
            <button
              onClick={() => setActiveAnalysisTab('difficulties')}
              className={`flex items-center gap-2 text-xs font-bold py-2.5 px-3 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap lg:w-full ${activeAnalysisTab === 'difficulties' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <AlertTriangle size={14} />
              Assuntos com Maior Dificuldade
            </button>
            <button
              onClick={() => setActiveAnalysisTab('evolution')}
              className={`flex items-center gap-2 text-xs font-bold py-2.5 px-3 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap lg:w-full ${activeAnalysisTab === 'evolution' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <Lightbulb size={14} />
              Evolução Temporal
            </button>
          </div>

          {/* Conteúdo Ativo (Right) */}
          <div className="flex-1 min-w-0">
            {activeAnalysisTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-display font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Sessões de Resolução Recentes</h4>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">{exerciseLogs.length} blocos registrados</span>
                </div>
                
                {exerciseLogs.length > 0 ? (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {exerciseLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100/75 dark:hover:bg-slate-800/75 border border-slate-100 dark:border-slate-800/55 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors relative group"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                              {log.disciplineName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold font-mono">
                              {log.date}
                            </span>
                          </div>
                          
                          <p className="font-sans font-bold text-xs text-slate-800 dark:text-white leading-snug">
                            {log.topicName}
                          </p>

                          {log.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic max-w-xl font-medium leading-relaxed bg-white/75 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/30 mt-1.5">
                              "{log.notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-slate-755 dark:text-slate-200">
                              {log.questionsCount} questões
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              ({log.correctAnswers} acertos / {log.wrongAnswers} erros)
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className={`w-14 text-center font-mono py-1 rounded text-[11px] font-black leading-none ${
                              log.accuracyPercent >= 85 ? 'bg-emerald-100/30 text-emerald-600 dark:text-emerald-450' :
                              log.accuracyPercent >= 70 ? 'bg-amber-100/30 text-amber-600 dark:text-amber-450' :
                              'bg-rose-100/30 text-rose-600 dark:text-rose-450'
                            }`}>
                              {log.accuracyPercent}%
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => onDeleteExerciseLog(log.id)}
                              className="text-slate-450 hover:text-rose-600 p-1 rounded hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-colors cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs text-center py-12 italic bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 leading-relaxed">
                    Nenhum exercício registrado ainda. Clique no botão acima para adicionar!
                  </p>
                )}
              </div>
            )}

            {activeAnalysisTab === 'mostPracticed' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-display font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Taxa de Acertos por Assunto</h4>
                  <span className="text-[10px] text-slate-450 font-bold">Resumos por volume de treino</span>
                </div>

                {topicStats.length > 0 ? (
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {[...topicStats].sort((a,b) => b.questionsCount - a.questionsCount).map((stat, idx) => (
                      <div key={idx} className="bg-slate-50/50 dark:bg-slate-850/50 p-3.5 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                              {stat.disciplineName}
                            </span>
                            <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate leading-snug">{stat.topicName}</h5>
                          </div>
                          
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold shrink-0 self-end sm:self-center font-mono">
                            {stat.questionsCount} questões feitas
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            <span>Taxa de Acertos Ponderada</span>
                            <span className={`${
                              stat.accuracyPercent >= 85 ? 'text-emerald-500' :
                              stat.accuracyPercent >= 70 ? 'text-amber-500' :
                              'text-rose-500'
                            }`}>{stat.accuracyPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                stat.accuracyPercent >= 85 ? 'bg-emerald-500' :
                                stat.accuracyPercent >= 70 ? 'bg-amber-400' :
                                'bg-rose-500'
                              }`}
                              style={{ width: `${stat.accuracyPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs text-center py-12 italic bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhum dado estatístico disponível. Registre questões primeiro!
                  </p>
                )}
              </div>
            )}

            {activeAnalysisTab === 'difficulties' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-display font-extrabold text-[10px] text-slate-400 uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    Pontos de Alerta (Acertos &lt; 70%)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">Foco em Revisão Imediata</span>
                </div>

                {topicStats.some(s => s.accuracyPercent < 70) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
                    {topicStats.filter(s => s.accuracyPercent < 70).sort((a,b) => a.accuracyPercent - b.accuracyPercent).map((stat, idx) => (
                      <div key={idx} className="p-4 bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/40 dark:border-rose-900/20 rounded-xl flex flex-col justify-between space-y-3 hover:shadow-3xs transition-shadow">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-black text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 px-2 rounded-full uppercase tracking-wider">
                              Abaixo da Meta
                            </span>
                            <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400">{stat.accuracyPercent}% acertos</span>
                          </div>
                          
                          <h5 className="font-bold text-xs text-slate-800 dark:text-white leading-snug">{stat.topicName}</h5>
                          <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 font-bold uppercase">{stat.disciplineName}</p>
                        </div>

                        <div className="pt-2 border-t border-rose-150/40 dark:border-rose-900/10 flex justify-between text-[11px] text-slate-500 font-bold font-mono">
                          <span>Total: {stat.questionsCount} q.</span>
                          <span className="text-rose-500 dark:text-rose-400 font-black">Revisão Teórica Necessária</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : topicStats.length > 0 ? (
                  <div className="p-12 text-center bg-emerald-500/5 border border-emerald-100/30 dark:border-emerald-900/10 rounded-xl space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-primary rounded-full flex items-center justify-center mx-auto">
                      <Check size={24} className="stroke-[3]" />
                    </div>
                    <h5 className="font-display font-black text-xs text-slate-800 dark:text-white uppercase tracking-widest">Tudo Excelente!</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-450 max-w-sm mx-auto font-medium leading-relaxed">
                      Atualmente você não possui assuntos com aproveitamento inferior a 70%. Continue mantendo esse padrão de rendimento!
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs text-center py-12 italic bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhum dado de dificuldade estatística gerado ainda. Complete treinos!
                  </p>
                )}
              </div>
            )}

            {activeAnalysisTab === 'evolution' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-display font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Evolução Histórica por Data</h4>
                  <p className="text-[10px] text-slate-450 font-bold">Últimos 6 treinos</p>
                </div>

                {exerciseLogs.length > 0 ? (
                  <div className="space-y-4 mt-2">
                    <div className="relative pl-6 space-y-4 border-l border-slate-200 dark:border-slate-800 ml-2.5">
                      {[...exerciseLogs].slice(0, 6).reverse().map((log) => {
                        const isGood = log.accuracyPercent >= 85;
                        const isMid = log.accuracyPercent >= 70;
                        const accentColor = isGood ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-rose-500';
                        return (
                          <div key={log.id} className="relative group/timeline">
                            <span className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full ${accentColor} border-2 border-white dark:border-slate-900 shadow-xs z-10 transition-transform group-hover/timeline:scale-130`} />
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 bg-slate-50 dark:bg-slate-855 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">{log.date}</span>
                                <h5 className="font-bold text-xs text-slate-800 dark:text-white leading-snug mt-0.5">{log.topicName}</h5>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{log.disciplineName}</p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-450">
                                  {log.questionsCount} q.
                                </span>
                                <span className={`px-2 py-0.5 rounded font-mono font-black text-xs text-white ${accentColor} shadow-3xs`}>
                                  {log.accuracyPercent}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs text-center py-12 italic bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    Sem logs suficientes para consolidar a evolução temporal.
                  </p>
                )}
              </div>
            )}
          </div>
          
        </div>
        
      </div>

      <div className="h-6" />

      {/* REGISTRAR EVENTOS DE EXERCÍCIOS RESOLVIDOS MODAL */}
      {showExerciseFormModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-scale-up space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 size={16} className="text-primary" />
                Registrar Bloco de Questões
              </h3>
              <button 
                type="button" 
                onClick={() => setShowExerciseFormModal(false)}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExerciseFormSubmit} className="space-y-4">
              {/* Disciplina */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">Disciplina Relacionada</label>
                <select
                  value={exFormDisciplineId}
                  onChange={(e) => handleDisciplineChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-semibold text-slate-800"
                  required
                >
                  <option value="" disabled>Escolha uma matéria...</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Tópico Relacionado */}
              {exFormDisciplineId && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Tópico / Assunto do Edital</label>
                    <button
                      type="button"
                      onClick={() => {
                        setExFormIsNewTopic(!exFormIsNewTopic);
                        if (!exFormIsNewTopic) {
                          setExFormTopicId('custom');
                        } else {
                          const disc = disciplines.find(d => d.id === exFormDisciplineId);
                          if (disc && disc.topics.length > 0) {
                            setExFormTopicId(disc.topics[0].id);
                          } else {
                            setExFormTopicId('custom');
                            setExFormIsNewTopic(true);
                          }
                        }
                      }}
                      className="text-[9px] text-primary hover:underline font-extrabold cursor-pointer uppercase"
                    >
                      {exFormIsNewTopic ? "Aproveitar Existente" : "+ Criar Novo Tópico"}
                    </button>
                  </div>

                  {exFormIsNewTopic ? (
                    <input
                      type="text"
                      placeholder="Ex: Teoria de Atos e Atributos"
                      value={exFormCustomTopicName}
                      onChange={(e) => setExFormCustomTopicName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-semibold"
                      required
                    />
                  ) : (
                    <select
                      value={exFormTopicId}
                      onChange={(e) => handleTopicChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-semibold text-slate-800 animate-fade-in"
                      required
                    >
                      {disciplines.find(d => d.id === exFormDisciplineId)?.topics.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                      <option value="custom">+ Cadastrar Novo Tópico...</option>
                    </select>
                  )}
                </div>
              )}

              {/* Acertos e Erros */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">Acertos</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={exFormCorrectAnswers}
                      onChange={(e) => setExFormCorrectAnswers(Math.max(0, Number(e.target.value)))}
                      min={0}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-500 font-mono">OK</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">Erros</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={exFormWrongAnswers}
                      onChange={(e) => setExFormWrongAnswers(Math.max(0, Number(e.target.value)))}
                      min={0}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-black font-mono text-rose-600 dark:text-rose-400 bg-rose-50/20 dark:bg-rose-950/20"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-500 font-mono">FAIL</span>
                  </div>
                </div>
              </div>

              {/* Real-time calculated projection indicator */}
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-150 dark:border-slate-850/60 text-center space-y-1">
                <div className="flex justify-between items-center text-xs font-semibold px-2">
                  <span className="text-slate-500 dark:text-slate-400">Total de Questões:</span>
                  <span className="font-mono font-black text-slate-700 dark:text-slate-200 text-sm">
                    {Number(exFormCorrectAnswers) + Number(exFormWrongAnswers)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold px-2">
                  <span className="text-slate-500 dark:text-slate-400">Taxa de Aproveitamento:</span>
                  <span className={`font-mono font-black text-sm px-1.5 py-0.5 rounded ${
                    (() => {
                      const total = Number(exFormCorrectAnswers) + Number(exFormWrongAnswers);
                      if (total === 0) return 'text-slate-400 bg-slate-100 dark:bg-slate-800/10';
                      const acc = Math.round((Number(exFormCorrectAnswers) / total) * 100);
                      if (acc >= 80) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30';
                      if (acc >= 60) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30';
                      return 'text-rose-600 bg-rose-50 dark:bg-rose-950/30';
                    })()
                  }`}>
                    {(Number(exFormCorrectAnswers) + Number(exFormWrongAnswers)) > 0 
                      ? `${Math.round((Number(exFormCorrectAnswers) / (Number(exFormCorrectAnswers) + Number(exFormWrongAnswers))) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Dificuldade */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider font-semibold">Aproveitamento / Peso</label>
                  <select
                    value={exFormDifficulty}
                    onChange={(e) => setExFormDifficulty(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-semibold text-slate-700"
                  >
                    <option value="Baixa">🟢 Baixa</option>
                    <option value="Média">🟡 Média</option>
                    <option value="Alta">🔴 Alta</option>
                  </select>
                </div>

                {/* Date automatic marker */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider font-semibold">Data</label>
                  <input
                    type="text"
                    disabled
                    value="Hoje mesmo"
                    className="w-full px-3 py-1.5 text-xs border border-slate-100 dark:border-slate-800 bg-slate-55 dark:bg-slate-850 font-black text-slate-400/90 rounded-lg text-center"
                  />
                </div>
              </div>

              {/* Observações / Dificuldades */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">Anotações Relevantes / Dificuldades</label>
                <textarea
                  placeholder="Dificuldades ou dicas importantes sobre pegadinhas e regras..."
                  value={exFormNotes}
                  onChange={(e) => setExFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowExerciseFormModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/95 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW DISCIPLINE MODAL FORM */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full border border-slate-100 shadow-xl animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-extrabold text-lg text-slate-800">Nova Disciplina</h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nome da Matéria</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Direito Constitucional ou Penal"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Tópicos / Assuntos do Edital</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Ex: Teoria de Atos, Agentes Públicos"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTempTopic();
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={handleAddTempTopic}
                    className="bg-emerald-50 text-primary border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                
                {/* Temp topic list view with dynamic removals */}
                {tempTopics.length > 0 ? (
                  <div className="mt-2 p-2 bg-slate-50/75 border border-slate-100 rounded-lg max-h-[120px] overflow-y-auto space-y-1.5">
                    {tempTopics.map((topic, index) => (
                      <div key={index} className="flex justify-between items-center text-xs text-slate-600 bg-white px-2 py-1 rounded border border-slate-100">
                        <span className="truncate pr-2 font-medium">{topic}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTempTopic(index)}
                          className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic mt-1.5">Nenhum tópico adicionado ainda. Cadastre manualmente os tópicos acima.</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Estudo Inicial (m)</label>
                  <input 
                    type="number" 
                    value={newTime}
                    onChange={(e) => setNewTime(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-semibold font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider font-semibold text-emerald-600">Acertos</label>
                  <input 
                    type="number" 
                    value={newCorrect}
                    onChange={(e) => setNewCorrect(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-1.5 text-xs border border-emerald-200 bg-emerald-50/25 rounded-lg focus:outline-none focus:border-emerald-500 font-semibold font-mono focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider font-semibold text-rose-600 font-bold">Erros</label>
                  <input 
                    type="number" 
                    value={newWrong}
                    onChange={(e) => setNewWrong(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-1.5 text-xs border border-rose-220 bg-rose-50/25 rounded-lg focus:outline-none focus:border-rose-500 font-semibold font-mono focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Ícone Representativo</label>
                  <select 
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-primary font-semibold focus:ring-1 focus:ring-primary"
                  >
                    <option value="gavel">Gavel / Direito</option>
                    <option value="computer">Laptop / Tech</option>
                    <option value="calculate">Calculator / Math</option>
                    <option value="book">Book / Geral</option>
                    <option value="shield">Shield / Legislação</option>
                    <option value="scale">Scale / Balança</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Tema Visual</label>
                  <select 
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-primary font-semibold focus:ring-1 focus:ring-primary"
                  >
                    <option value="blue">Blue Corporate</option>
                    <option value="emerald">Emerald Success</option>
                    <option value="purple">Purple Insight</option>
                    <option value="yellow">Yellow Precision</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Salvar Matéria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCIPLINE DETAILS REPORT POPUP */}
      {activeDiscipline && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full border border-slate-100 shadow-xl animate-scale-up space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-extrabold text-lg text-slate-800">Tópicos e Desempenho</h3>
              <button 
                type="button" 
                onClick={() => setSelectedDiscipline(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 bg-emerald-50 text-primary rounded-lg flex items-center justify-center font-bold">
                  <FileCheck2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-display font-bold text-sm text-slate-800 truncate">{activeDiscipline.name}</h4>
                  <p className="text-[11px] text-slate-400 font-bold">Planejamento e progresso do edital</p>
                </div>
              </div>

              {/* Dynamic Visual Progress Indicator */}
              <div className="bg-slate-50/75 p-3 rounded-lg border border-slate-100/50 space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Conclusão de Tópicos</span>
                  <span className="text-primary font-mono">{activeDiscipline.topicsTotal > 0 ? Math.round((activeDiscipline.topicsDone / activeDiscipline.topicsTotal) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300" 
                    style={{ width: `${activeDiscipline.topicsTotal > 0 ? (activeDiscipline.topicsDone / activeDiscipline.topicsTotal) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-medium pt-0.5">
                  {activeDiscipline.topicsDone} concluídos de {activeDiscipline.topicsTotal} tópicos cadastrados
                </div>
              </div>

              {/* Interactive Topics Checklist Section */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lista Customizada de Tópicos</label>
                
                {/* Add dynamic topic form */}
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Adicionar novo tópico/assunto..."
                    value={newTopicNameForActiveDiscipline}
                    onChange={(e) => setNewTopicNameForActiveDiscipline(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewTopicToActive();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewTopicToActive}
                    className="bg-emerald-50 hover:bg-emerald-100 text-primary border border-emerald-100/50 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Topics scroll area */}
                {activeDiscipline.topics && activeDiscipline.topics.length > 0 ? (
                  <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl max-h-[285px] overflow-y-auto space-y-1.5">
                    {activeDiscipline.topics.map((topic) => {
                      const diagnostic = topicDiagnostics.get(`${activeDiscipline.id}::${topic.id}`);
                      const topicExerciseLogs = exerciseLogs.filter(log => log.disciplineId === activeDiscipline.id && log.topicId === topic.id);
                      const totalTopicCorrect = topicExerciseLogs.reduce((acc, curr) => acc + curr.correctAnswers, 0);
                      const totalTopicWrong = topicExerciseLogs.reduce((acc, curr) => acc + curr.wrongAnswers, 0);
                      const totalTopicQuestions = totalTopicCorrect + totalTopicWrong;
                      const topicAccuracy = totalTopicQuestions > 0 ? Math.round((totalTopicCorrect / totalTopicQuestions) * 100) : 0;

                      const topicActivityLogs = activityLogs.filter(log => log.topicId === topic.id && log.disciplineName === activeDiscipline.name);
                      const totalTopicMins = topicActivityLogs.reduce((acc, curr) => acc + curr.timeSpentMin, 0);
                      const studyHoursStr = formatMinutes(totalTopicMins);

                      return (
                        <div 
                          key={topic.id} 
                          className="flex flex-col bg-white border border-slate-105 p-2.5 rounded-lg hover:border-slate-300 transition-all group/topic"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col flex-1 min-w-0 pr-1">
                              {/* Checkbox and Topic Name row */}
                              <div className="flex items-center gap-2.5">
                                <input 
                                  type="checkbox" 
                                  checked={topic.completed} 
                                  onChange={() => handleToggleTopic(topic.id)}
                                  className="w-3.5 h-3.5 rounded text-primary border-slate-300 focus:ring-primary cursor-pointer shrink-0"
                                />
                                {editingTopicId === topic.id ? (
                                  <input 
                                    type="text" 
                                    value={editingTopicName} 
                                    onChange={(e) => setEditingTopicName(e.target.value)}
                                    className="flex-1 px-1.5 py-0.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-primary font-medium"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveEditTopic(topic.id);
                                      } else if (e.key === 'Escape') {
                                        setEditingTopicId(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <span className={`text-xs font-semibold truncate ${topic.completed ? 'text-slate-400 line-through font-normal' : 'text-slate-700'}`}>
                                    {topic.name}
                                  </span>
                                )}
                              </div>

                              {/* A/B/C do edital é independente da urgência pessoal. */}
                              <div className="flex flex-wrap gap-2 mt-2 pl-6">
                                <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  Edital
                                  <select
                                    aria-label={`Prioridade no edital: ${topic.name}`}
                                    title="Classificação manual conforme análise de incidência da Vunesp"
                                    value={topic.examPriority || ''}
                                    onChange={event => handleSetTopicPriority(topic.id, event.target.value)}
                                    className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  >
                                    <option value="">Não classificado</option>
                                    <option value="A">A · Alta incidência</option>
                                    <option value="B">B · Média incidência</option>
                                    <option value="C">C · Baixa incidência</option>
                                  </select>
                                </label>
                                <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  Fase
                                  <select
                                    aria-label={`Fase de aprendizagem: ${topic.name}`}
                                    value={topic.learningPhase || ''}
                                    onChange={event => handleSetTopicPhase(topic.id, event.target.value)}
                                    className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  >
                                    <option value="">Automática</option>
                                    <option value="base">Base teórica</option>
                                    <option value="consolidacao">Consolidação</option>
                                    <option value="dominio">Domínio</option>
                                  </select>
                                </label>
                                {diagnostic && (
                                  <span className="self-center text-[10px] text-slate-500 dark:text-slate-400" title="Urgência calculada com base no desempenho e na prioridade do edital">
                                    Urgência {diagnostic.urgency} · {PHASE_LABELS[diagnostic.phase]}
                                  </span>
                                )}
                              </div>

                              {/* Analytics metadata row */}
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 pl-6 text-[10px] text-slate-400 font-semibold">
                                <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 px-1.5 py-0.5 rounded text-[9px] text-[#0fc2a0] dark:text-[#0fc2a0]">
                                  <Clock size={10} className="text-[#0fc2a0] shrink-0" />
                                  {studyHoursStr}
                                </span>
                                
                                <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 px-1.5 py-0.5 rounded text-[9px]">
                                  <FileCheck2 size={10} className="text-slate-400 shrink-0" />
                                  {totalTopicQuestions > 0 ? (
                                    <span className="font-bold text-slate-600 dark:text-slate-300">
                                      {topicAccuracy}% acertos <span className="font-medium text-slate-400 font-mono">({totalTopicQuestions} q)</span>
                                    </span>
                                  ) : (
                                    <span className="italic text-slate-400">0% acertos (sem q)</span>
                                  )}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0 ml-2 pt-0.5">
                              {editingTopicId === topic.id ? (
                                <>
                                  <button 
                                    type="button" 
                                    onClick={() => handleSaveEditTopic(topic.id)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Salvar Nome"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => setEditingTopicId(null)}
                                    className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <X size={12} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    type="button" 
                                    onClick={() => setAddingSubtopicToTopicId(topic.id)}
                                    className="p-1 text-slate-400 hover:text-primary hover:bg-emerald-50 rounded opacity-0 group-hover/topic:opacity-100 transition-all cursor-pointer"
                                    title="Adicionar Subtópico"
                                  >
                                    <Plus size={11} />
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleStartEditTopic(topic.id, topic.name)}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded opacity-0 group-hover/topic:opacity-100 transition-all cursor-pointer"
                                    title="Editar Tópico"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => handleDeleteTopic(topic.id)}
                                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 rounded opacity-0 group-hover/topic:opacity-100 transition-all cursor-pointer"
                                    title="Excluir Tópico"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Subtopics Rendering */}
                          {topic.subtopics && topic.subtopics.length > 0 && (
                            <div className="mt-2 pl-6 space-y-1.5 border-l-2 border-slate-100 ml-1.5">
                              {topic.subtopics.map(subtopic => (
                                <div key={subtopic.id} className="flex justify-between items-center group/subtopic">
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="checkbox"
                                      checked={subtopic.completed}
                                      onChange={() => handleToggleSubtopic(topic.id, subtopic.id)}
                                      className="w-3 h-3 rounded text-primary border-slate-300 focus:ring-primary cursor-pointer shrink-0"
                                    />
                                    <span className={`text-[11px] truncate ${subtopic.completed ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                      {subtopic.name}
                                    </span>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => handleDeleteSubtopic(topic.id, subtopic.id)}
                                    className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover/subtopic:opacity-100 transition-all cursor-pointer"
                                    title="Excluir Subtópico"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Subtopic Form */}
                          {addingSubtopicToTopicId === topic.id && (
                            <div className="mt-2 pl-6 ml-1.5 flex gap-2">
                              <input
                                type="text"
                                placeholder="Nome do subtópico..."
                                value={newSubtopicName}
                                onChange={(e) => setNewSubtopicName(e.target.value)}
                                className="flex-1 px-2 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:border-primary font-medium"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubtopic(topic.id);
                                  if (e.key === 'Escape') {
                                    setAddingSubtopicToTopicId(null);
                                    setNewSubtopicName('');
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleAddSubtopic(topic.id)}
                                className="px-2 py-1 bg-primary text-white text-[10px] rounded hover:bg-primary-hover transition-colors font-bold"
                              >
                                Adicionar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic text-center py-4">Nenhum tópico cadastrado nesta matéria.</p>
                )}
              </div>

              {/* Statistics & Exercises Summary */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Exercícios Práticos Totais</span>
                  <span className="font-mono font-black text-slate-700 dark:text-slate-200">{activeDiscipline.correctAnswers + activeDiscipline.wrongAnswers} resolvidos</span>
                </div>
                
                <div className="flex gap-2.5">
                  <div className="flex-1 bg-white dark:bg-slate-850 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/50 text-center">
                    <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase block">Acertos</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">{activeDiscipline.correctAnswers}</span>
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-850 p-2 rounded-lg border border-rose-100 dark:border-rose-900/50 text-center">
                    <span className="text-[8px] text-rose-500 dark:text-rose-400 font-black uppercase block">Erros</span>
                    <span className="text-sm font-black text-rose-500 dark:text-rose-400 block">{activeDiscipline.wrongAnswers}</span>
                  </div>
                </div>

                {/* Calculate accuracy */}
                {activeDiscipline.correctAnswers + activeDiscipline.wrongAnswers > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>Aproveitamento Médio</span>
                      <span className="text-primary font-mono">{Math.round((activeDiscipline.correctAnswers / (activeDiscipline.correctAnswers + activeDiscipline.wrongAnswers)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.round((activeDiscipline.correctAnswers / (activeDiscipline.correctAnswers + activeDiscipline.wrongAnswers)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Quick Register CTA button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDiscipline(null); // Close this popup
                    handleOpenExerciseForm(activeDiscipline.id); // Open the exercise form pre-populated
                  }}
                  className="w-full mt-1.5 py-2 px-3 border border-dashed border-emerald-250 dark:border-emerald-900 hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 text-primary dark:text-emerald-400 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} className="stroke-[2.5]" />
                  Registrar Sessão de Questões nesta Matéria
                </button>
              </div>

              {/* Specific Logs List scroll block */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Histórico de Treino desta Matéria</label>
                {exerciseLogs.filter(log => log.disciplineId === activeDiscipline.id).length > 0 ? (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {exerciseLogs.filter(log => log.disciplineId === activeDiscipline.id).map((log) => (
                      <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800 rounded-lg space-y-1 text-[11px]">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-800 dark:text-slate-200 truncate pr-2">{log.topicName}</span>
                          <span className="shrink-0 text-slate-400 font-mono text-[10px]">{log.date}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{log.questionsCount} questões ({log.accuracyPercent}% acertos)</span>
                          <span className={`font-semibold ${
                            log.difficulty === 'Alta' ? 'text-rose-500' :
                            log.difficulty === 'Média' ? 'text-amber-500' :
                            'text-emerald-600'
                          }`}>Peso: {log.difficulty}</span>
                        </div>
                        {log.notes && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-1.5 rounded mt-1">
                            Anotação: "{log.notes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">Nenhuma sessão de questões registrada para esta matéria.</p>
                )}
              </div>

              <div className="text-[10px] text-slate-400 font-bold text-center leading-relaxed italic">
                "O progresso nesta matéria representa {activeDiscipline.topicsTotal > 0 ? Math.round((activeDiscipline.topicsDone / activeDiscipline.topicsTotal) * 100) : 0}% de conclusão do edital teórico para o concurso da Polícia Federal."
              </div>

              <button 
                type="button" 
                onClick={() => setSelectedDiscipline(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
