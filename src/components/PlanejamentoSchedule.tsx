/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  CloudSun, 
  Moon, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Play, 
  Pause, 
  Square,
  AlertTriangle,
  Award,
  Trash2,
  CalendarDays,
  Sparkles,
  Zap,
  X
} from 'lucide-react';
import { StudyBlock, StudyBlockType, Discipline } from '../types';
import { formatMinutes } from '../utils';

interface PlanejamentoScheduleProps {
  studyBlocks: StudyBlock[];
  onAddStudyBlock: (block: Omit<StudyBlock, 'id'>) => void;
  onDeleteStudyBlock: (id: string) => void;
  onToggleStudyBlock: (id: string) => void;
  onSetStudyBlocks: (blocks: StudyBlock[]) => void;
  disciplines: Discipline[];
  onLogStudyTime: (disciplineId: string, minutes: number, details: string) => void;
}

export default function PlanejamentoSchedule({
  studyBlocks,
  onAddStudyBlock,
  onDeleteStudyBlock,
  onToggleStudyBlock,
  onSetStudyBlocks,
  disciplines,
  onLogStudyTime
}: PlanejamentoScheduleProps) {
  // Chronometer / Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [selectedDisciplineForTimer, setSelectedDisciplineForTimer] = useState(disciplines[0]?.id || 'd1');
  const [timerActivityDetails, setTimerActivityDetails] = useState('');
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  // Customizable Study Cycle Generator States
  const [showGenerateCycleModal, setShowGenerateCycleModal] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState(24);
  const [selectedDays, setSelectedDays] = useState<boolean[]>([true, true, true, true, true, true, false]); // Seg-Sáb
  const [selectedShifts, setSelectedShifts] = useState<string[]>(['manha', 'tarde', 'noite']);
  const [considerWeights, setConsiderWeights] = useState(true);
  const [focusOnWeaknesses, setFocusOnWeaknesses] = useState(true);
  const [blockDuration, setBlockDuration] = useState(90); // 90 minutes default
  const [selectedStudyTypes, setSelectedStudyTypes] = useState<StudyBlockType[]>(['Teoria', 'Revisão', 'Exercícios', 'Questões']);
  const [disciplineCustomWeights, setDisciplineCustomWeights] = useState<Record<string, number>>({});

  const incrementRef = useRef<NodeJS.Timeout | null>(null);

  // New Block states
  const [newDay, setNewDay] = useState(3); // Wednesday default
  const [newShift, setNewShift] = useState<'manha' | 'tarde' | 'noite'>('tarde');
  const [newDisciplineName, setNewDisciplineName] = useState(disciplines[0]?.name || 'Direito Administrativo');
  const [newDuration, setNewDuration] = useState(90);
  const [newType, setNewType] = useState<StudyBlockType>('Questões');

  // Today Focus items list
  const [focusTasks, setFocusTasks] = useState([
    { id: 'f1', text: 'Direito Administrativo', desc: '2h • Revisão', completed: false },
    { id: 'f2', text: 'Direito Constitucional', desc: '1h30 • Questões', completed: false, progress: 0 },
    { id: 'f3', text: 'Leitura Lei Seca', desc: '1h • Turno da Noite', completed: false }
  ]);

  const handleToggleFocusTask = (id: string) => {
    setFocusTasks(tasks => tasks.map(t => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        return { 
          ...t, 
          completed: nextCompleted,
          progress: nextCompleted ? 100 : t.id === 'f2' ? 0 : undefined
        };
      }
      return t;
    }));
  };

  const completedFocusCount = focusTasks.filter(t => t.completed).length;

  // Chronometer Logic
  useEffect(() => {
    if (isTimerRunning) {
      incrementRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (incrementRef.current) clearInterval(incrementRef.current);
    }
    return () => {
      if (incrementRef.current) clearInterval(incrementRef.current);
    };
  }, [isTimerRunning]);

  const startStopTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const saveTimerRecord = () => {
    const elapsedMinutes = Math.max(1, Math.round(timerSeconds / 60));
    const targetDiscipline = disciplines.find(d => d.id === selectedDisciplineForTimer);
    
    if (targetDiscipline) {
      const logDetails = timerActivityDetails.trim() || `Estudo focado em ${targetDiscipline.name}`;
      onLogStudyTime(selectedDisciplineForTimer, elapsedMinutes, logDetails);
      alert(`Parabéns! Você registrou ${elapsedMinutes} minutos de estudo focados em "${targetDiscipline.name}"! Seu progresso foi atualizado.`);
    }
    
    resetTimer();
    setShowTimerModal(false);
  };

  const formatTimerValue = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Plot blocks into days (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 7=Dom)
  const getBlockForCell = (day: number, shift: 'manha' | 'tarde' | 'noite') => {
    return studyBlocks.find(b => b.dayOfWeek === day && b.shift === shift);
  };

  const daysLabel = [
    { num: 1, label: 'Seg', date: '23' },
    { num: 2, label: 'Ter', date: '24' },
    { num: 3, label: 'Qua', date: '25', isToday: true },
    { num: 4, label: 'Qui', date: '26' },
    { num: 5, label: 'Sex', date: '27' },
    { num: 6, label: 'Sáb', date: '28' },
    { num: 7, label: 'Dom', date: '29' }
  ];

  const handleAddNewBlock = (e: React.FormEvent) => {
    e.preventDefault();
    onAddStudyBlock({
      dayOfWeek: newDay,
      shift: newShift,
      disciplineName: newDisciplineName,
      durationMin: Number(newDuration),
      type: newType,
      completed: false
    });
    setShowAddBlockModal(false);
  };

  const handleGenerateStudyCycle = () => {
    if (disciplines.length === 0) {
      alert("Nenhuma matéria cadastrada para gerar o ciclo! Adicione matérias primeiro.");
      return;
    }
    if (selectedStudyTypes.length === 0) {
      alert("Selecione pelo menos uma modalidade de estudo para o ciclo.");
      return;
    }

    const activeDays: number[] = [];
    selectedDays.forEach((selected, i) => {
      if (selected) {
        activeDays.push(i + 1); // 1 = Seg, 2 = Ter ...
      }
    });

    if (activeDays.length === 0) {
      alert("Por favor, selecione ao menos um dia da semana para estudar.");
      return;
    }

    if (selectedShifts.length === 0) {
      alert("Por favor, selecione ao menos um turno para os estudos.");
      return;
    }

    // Number of slots
    const totalPotentialSlots = activeDays.length * selectedShifts.length;
    const totalBlocksNeeded = Math.ceil((weeklyHours * 60) / blockDuration);
    const blocksToGenerate = Math.min(totalPotentialSlots, totalBlocksNeeded);

    if (blocksToGenerate <= 0) {
      alert("Ajuste a carga horária semanal ou selecione mais dias/turnos.");
      return;
    }

    // Weights from syllabus / PF edital
    const getHistoricalWeight = (name: string): number => {
      const n = name.toLowerCase();
      if (n.includes('informát')) return 3.5;
      if (n.includes('contabil')) return 3.0;
      if (n.includes('estatíst')) return 2.0;
      if (n.includes('raciocín') || n.includes('lógic')) return 2.0;
      if (n.includes('portug') || n.includes('língua')) return 3.0;
      if (n.includes('human')) return 1.0;
      return 1.5;
    };

    // Personal weights + weight logic
    const weightedDisciplines = disciplines.map(d => {
      let score = disciplineCustomWeights[d.name] !== undefined ? disciplineCustomWeights[d.name] : 2; // range 1-3
      
      if (considerWeights) {
        score *= getHistoricalWeight(d.name);
      }
      
      if (focusOnWeaknesses) {
        const total = d.correctAnswers + d.wrongAnswers;
        if (total > 0) {
          const accuracy = d.correctAnswers / total;
          const errorRate = 1 - accuracy; // 0 to 1
          score *= (1 + errorRate * 1.5);
        }
      }
      return {
        discipline: d,
        score: score
      };
    });

    const sumScores = weightedDisciplines.reduce((sum, item) => sum + item.score, 0);

    // Dynamic distribution of slots
    const allocatedBlocks = weightedDisciplines.map(wd => {
      const ratio = sumScores > 0 ? (wd.score / sumScores) : (1 / weightedDisciplines.length);
      let count = Math.round(ratio * blocksToGenerate);
      return {
        disciplineName: wd.discipline.name,
        count: count
      };
    });

    let currentSum = allocatedBlocks.reduce((sum, item) => sum + item.count, 0);
    
    if (currentSum === 0) {
      allocatedBlocks.forEach((ab, i) => {
        if (i < blocksToGenerate) {
          ab.count = 1;
        }
      });
      currentSum = allocatedBlocks.reduce((sum, item) => sum + item.count, 0);
    }

    while (currentSum !== blocksToGenerate) {
      if (currentSum < blocksToGenerate) {
        const sortedScores = [...weightedDisciplines].sort((a, b) => b.score - a.score);
        const nameToIncrement = sortedScores[0].discipline.name;
        const target = allocatedBlocks.find(ab => ab.disciplineName === nameToIncrement);
        if (target) {
          target.count += 1;
        }
        currentSum++;
      } else {
        const target = [...allocatedBlocks].sort((a, b) => b.count - a.count)[0];
        if (target && target.count > 0) {
          target.count -= 1;
        }
        currentSum--;
      }
    }

    const finalBlocksList: string[] = [];
    allocatedBlocks.forEach(ab => {
      for (let i = 0; i < ab.count; i++) {
        finalBlocksList.push(ab.disciplineName);
      }
    });

    // Shuffle and balance adjacent items
    for (let i = finalBlocksList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalBlocksList[i], finalBlocksList[j]] = [finalBlocksList[j], finalBlocksList[i]];
    }

    for (let i = 0; i < finalBlocksList.length - 1; i++) {
      if (finalBlocksList[i] === finalBlocksList[i + 1]) {
        for (let j = i + 2; j < finalBlocksList.length; j++) {
          if (finalBlocksList[j] !== finalBlocksList[i]) {
            [finalBlocksList[i + 1], finalBlocksList[j]] = [finalBlocksList[j], finalBlocksList[i + 1]];
            break;
          }
        }
      }
    }

    // Cells
    const targetCells: { day: number; shift: 'manha' | 'tarde' | 'noite' }[] = [];
    for (const day of activeDays) {
      for (const shift of selectedShifts as ('manha' | 'tarde' | 'noite')[]) {
        targetCells.push({ day, shift });
      }
    }

    const selectedCells = targetCells.slice(0, blocksToGenerate);
    const subjectTypeHistory: Record<string, number> = {};

    const newStudyBlocks: StudyBlock[] = selectedCells.map((cell, index) => {
      const disciplineName = finalBlocksList[index] || disciplines[0].name;
      
      if (subjectTypeHistory[disciplineName] === undefined) {
        subjectTypeHistory[disciplineName] = 0;
      }
      const typeIndex = subjectTypeHistory[disciplineName] % selectedStudyTypes.length;
      const type = selectedStudyTypes[typeIndex];
      subjectTypeHistory[disciplineName]++;

      return {
        id: `block_${Date.now()}_${index}`,
        dayOfWeek: cell.day,
        shift: cell.shift,
        disciplineName,
        durationMin: blockDuration,
        type,
        completed: false
      };
    });

    onSetStudyBlocks(newStudyBlocks);
    setShowGenerateCycleModal(false);
  };

  // Helper theme classes for study block blocks
  const getBlockStyles = (type: StudyBlockType) => {
    switch (type) {
      case 'Teoria': return 'bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100/50';
      case 'Revisão': return 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/50';
      case 'Exercícios': return 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100/50';
      case 'Questões': return 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100/50';
      case 'Simulado': return 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100/50';
      default: return 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper info card row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/70 border border-slate-200/50 rounded-xl gap-4">
        <div>
          <h2 className="font-display font-extrabold text-lg text-slate-800">Seu Cronograma de Estudos</h2>
          <p className="font-sans text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Organize seus turnos e maximize seu rendimento semanal.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer size={13} />
            Imprimir
          </button>
          
          <button 
            type="button" 
            onClick={() => setShowGenerateCycleModal(true)}
            className="px-3.5 py-1.5 bg-primary text-white hover:bg-emerald-750 active:scale-98 transition-all rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RefreshCw size={13} />
            Gerar Ciclo de Estudos
          </button>
        </div>
      </div>

      {/* Main Grid Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Section: Week Navigation and Study Grid Blocks */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Calendar Header Week control */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-700">
              <button type="button" className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-800 transition-colors cursor-pointer">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold">23 Out - 29 Out, 2023</span>
              <button type="button" className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-800 transition-colors cursor-pointer">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button type="button" className="px-3 py-1 bg-white shadow-xs rounded-md text-[11px] font-bold text-slate-800 shrink-0">Semana</button>
              <button type="button" onClick={() => alert('Visualização mensal indisponível no momento.')} className="px-3 py-1 rounded-md text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer">Mês</button>
            </div>
          </div>

          {/* Detailed Calendar Block Grid board */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            
            {/* Week days titles header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
              {daysLabel.map((day) => (
                <div 
                  key={day.num} 
                  className={`
                    py-3 text-center flex flex-col items-center justify-center relative
                    ${day.num !== 7 ? 'border-r border-slate-100' : ''}
                    ${day.isToday ? 'bg-emerald-500/5' : ''}
                  `}
                >
                  {day.isToday && <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-500" />}
                  <span className={`text-[10px] uppercase font-black tracking-wider ${day.isToday ? 'text-primary' : 'text-slate-400'}`}>
                    {day.label}
                  </span>
                  <span className={`
                    text-xs font-black mt-1 w-7 h-7 flex items-center justify-center rounded-full font-mono
                    ${day.isToday ? 'bg-primary text-white shadow-xs' : 'text-slate-700'}
                  `}>
                    {day.date}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar Grid slots lists */}
            <div className="overflow-x-auto">
              <div className="min-w-[650px] divide-y divide-slate-100">
                
                {/* 1. Shift Morning Row */}
                <div className="flex min-h-[95px]">
                  <div className="w-16 bg-slate-50/70 border-r border-slate-100 p-2 flex flex-col items-center justify-center gap-1 select-none">
                    <Sun size={15} className="text-amber-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Manhã</span>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100">
                    {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                      const block = getBlockForCell(dayNum, 'manha');
                      return (
                        <div key={dayNum} className={`p-2 min-h-[85px] relative group`}>
                          {block ? (
                            <div className={`p-2 rounded-lg h-full text-[10.5px] leading-relaxed relative flex flex-col justify-between ${getBlockStyles(block.type)}`}>
                              <div>
                                <div className="font-bold line-clamp-2">{block.disciplineName}</div>
                                <div className="text-[9px] font-black uppercase mt-1 opacity-70">{block.type}</div>
                              </div>
                              <div className="flex justify-between items-center mt-1 text-[9px] font-mono font-black opacity-80">
                                <span>{formatMinutes(block.durationMin)}</span>
                                <button 
                                  onClick={() => onDeleteStudyBlock(block.id)}
                                  className="opacity-0 group-hover:opacity-100 text-rose-600 hover:bg-rose-100 p-0.5 rounded cursor-pointer transition-opacity"
                                  title="Deletar"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setNewDay(dayNum);
                                setNewShift('manha');
                                setShowAddBlockModal(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 absolute inset-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer transition-opacity"
                            >
                              <Plus size={14} className="pointer-events-none" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Shift Afternoon Row */}
                <div className="flex min-h-[95px]">
                  <div className="w-16 bg-slate-50/70 border-r border-slate-100 p-2 flex flex-col items-center justify-center gap-1 select-none">
                    <CloudSun size={15} className="text-orange-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tarde</span>
                  </div>

                  <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100">
                    {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                      const block = getBlockForCell(dayNum, 'tarde');
                      return (
                        <div key={dayNum} className="p-2 min-h-[85px] relative group">
                          {block ? (
                            <div className={`p-2 rounded-lg h-full text-[10.5px] leading-relaxed relative flex flex-col justify-between ${getBlockStyles(block.type)}`}>
                              <div>
                                <div className="font-bold line-clamp-2">{block.disciplineName}</div>
                                <div className="text-[9px] font-black uppercase mt-1 opacity-70">{block.type}</div>
                              </div>
                              <div className="flex justify-between items-center mt-1 text-[9px] font-mono font-black opacity-80">
                                <span>{formatMinutes(block.durationMin)}</span>
                                <button 
                                  onClick={() => onDeleteStudyBlock(block.id)}
                                  className="opacity-0 group-hover:opacity-100 text-rose-600 hover:bg-rose-100 p-0.5 rounded cursor-pointer transition-opacity"
                                  title="Deletar"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setNewDay(dayNum);
                                setNewShift('tarde');
                                setShowAddBlockModal(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 absolute inset-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer transition-opacity"
                            >
                              <Plus size={14} className="pointer-events-none" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Shift Night Row */}
                <div className="flex min-h-[95px]">
                  <div className="w-16 bg-slate-50/70 border-r border-slate-100 p-2 flex flex-col items-center justify-center gap-1 select-none">
                    <Moon size={15} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Noite</span>
                  </div>

                  <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100">
                    {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                      const block = getBlockForCell(dayNum, 'noite');
                      return (
                        <div key={dayNum} className="p-2 min-h-[85px] relative group">
                          {block ? (
                            <div className={`p-2 rounded-lg h-full text-[10.5px] leading-relaxed relative flex flex-col justify-between ${getBlockStyles(block.type)}`}>
                              <div>
                                <div className="font-bold line-clamp-2">{block.disciplineName}</div>
                                <div className="text-[9px] font-black uppercase mt-1 opacity-70">{block.type}</div>
                              </div>
                              <div className="flex justify-between items-center mt-1 text-[9px] font-mono font-black opacity-80">
                                <span>{formatMinutes(block.durationMin)}</span>
                                <button 
                                  onClick={() => onDeleteStudyBlock(block.id)}
                                  className="opacity-0 group-hover:opacity-100 text-rose-600 hover:bg-rose-100 p-0.5 rounded cursor-pointer transition-opacity"
                                  title="Deletar"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setNewDay(dayNum);
                                setNewShift('noite');
                                setShowAddBlockModal(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 absolute inset-2 bg-slate-50 hover:bg-slate-105 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer transition-opacity"
                            >
                              <Plus size={14} className="pointer-events-none" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* Right Section: Focus items checklist, timers Chronometer & goals */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Today focus card widget */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-primary" />
                    Foco de Hoje
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-1">Quarta-feira, 25 de Outubro</p>
                </div>
                
                <span className="text-[10px] font-black bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded leading-none shrink-0 uppercase tracking-wider">
                  {completedFocusCount}/3 Concluídos
                </span>
              </div>

              {/* Checklist list */}
              <div className="space-y-3 mt-4">
                {focusTasks.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => handleToggleFocusTask(t.id)}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none
                      ${t.completed 
                        ? 'bg-slate-50/50 border-slate-100 opacity-60' 
                        : 'bg-white border-slate-150 hover:border-slate-300 shadow-xs'
                      }
                    `}
                  >
                    <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${t.completed ? 'text-emerald-500 fill-emerald-100' : 'text-slate-300'}`} />
                    <div className="flex-1">
                      <p className={`text-xs font-semibold text-slate-800 ${t.completed ? 'line-through text-slate-400' : ''}`}>{t.text}</p>
                      <p className={`text-[10px] font-bold mt-1 ${t.completed ? 'text-slate-400' : 'text-slate-400'}`}>{t.desc}</p>
                      
                      {t.progress && !t.completed && (
                        <div className="mt-2.5">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full relative overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${t.progress}%` }} />
                          </div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Andamento: {t.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Iniciar Novo Cronômetro action */}
            <button 
              type="button"
              onClick={() => setShowTimerModal(true)}
              className="w-full mt-5 py-2.5 bg-primary hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Clock size={14} />
              Iniciar Cronômetro de Estudo
            </button>
          </div>

          {/* Weekly goals status summary box */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              Metas da Semana
            </h3>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[11px] text-slate-500">Horas de Estudo</span>
                  <span className="font-bold">0h / {weeklyHours}h</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '0%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[11px] text-slate-500">Questões Resolvidas</span>
                  <span className="font-bold">0 / 500</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '0%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1 text-slate-500">
                  <span>Revisões Pendentes</span>
                  <span>0 Atrasadas</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Add quick event block CTA */}
          <div 
            onClick={() => {
              setNewDay(3);
              setNewShift('tarde');
              setShowAddBlockModal(true);
            }} 
            className="p-4 border border-slate-200/85 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 rounded-xl flex items-center gap-3 cursor-pointer group active:scale-98 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
              <Plus size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 leading-tight">Adicionar Tarefa Avulsa</p>
              <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase tracking-wider mt-1">Encaixe no seu planejamento</p>
            </div>
          </div>

        </div>

      </div>

      {/* stopwatch CHRONOMETER POPUP MODAL */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl relative overflow-hidden text-center">
            
            <button 
              type="button" 
              onClick={() => {
                if(isTimerRunning) {
                  alert('Pause o cronômetro primeiro para fechar!');
                  return;
                }
                setShowTimerModal(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X size={20} />
            </button>

            <span className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse mb-3">
              <Clock size={24} />
            </span>

            <h3 className="font-display font-black text-xl text-slate-800 tracking-tight leading-tight">Cronômetro de Estudo</h3>
            <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase mt-1">Foco ativo e controle de horas</p>

            {/* Display digits */}
            <div className="my-6 py-4 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-3xl font-black text-slate-800 tracking-wider">
              {formatTimerValue(timerSeconds)}
            </div>

            {/* Subject Selector dropdown */}
            <div className="text-left space-y-3 mb-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Qual matéria está estudando?</label>
                <select
                  value={selectedDisciplineForTimer}
                  onChange={(e) => setSelectedDisciplineForTimer(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  disabled={isTimerRunning}
                >
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-slate-400">Tópico abordado (detalhes opcionais)</label>
                <input
                  type="text"
                  value={timerActivityDetails}
                  onChange={(e) => setTimerActivityDetails(e.target.value)}
                  placeholder="Ex: Leitura da Lei de Licitações..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none font-semibold focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Chronometer action buttons */}
            <div className="flex justify-center items-center gap-4">
              <button
                type="button"
                onClick={resetTimer}
                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full cursor-pointer transition-colors"
                title="Resetar"
              >
                <Square size={16} />
              </button>

              <button
                type="button"
                onClick={startStopTimer}
                className={`p-4 h-14 w-14 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                  isTimerRunning ? 'bg-amber-500 shadow-amber-500/20' : 'bg-primary shadow-emerald-500/20'
                }`}
              >
                {isTimerRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>

              <button
                type="button"
                onClick={saveTimerRecord}
                className="p-3 bg-emerald-100 hover:bg-emerald-200 text-primary rounded-full cursor-pointer transition-colors"
                disabled={timerSeconds === 0}
                title="Salvar Sessão"
              >
                <CheckCircle2 size={16} />
              </button>
            </div>

            {timerSeconds > 0 && !isTimerRunning && (
              <p className="text-[10px] text-amber-500 font-bold mt-4 flex items-center justify-center gap-1">
                <AlertTriangle size={12} />
                Estudo pausado. Clique em Check para salvar {formatMinutes(Math.max(1, Math.round(timerSeconds / 60)))} no app.
              </p>
            )}

          </div>
        </div>
      )}

      {/* ADD BLOCK SCHEDULER POPUP MODAL */}
      {showAddBlockModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full border border-slate-100 shadow-xl animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-extrabold text-base text-slate-800">Alocar Cronograma</h3>
              <button 
                type="button" 
                onClick={() => setShowAddBlockModal(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewBlock} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Dia da Semana</label>
                  <select 
                    value={newDay} 
                    onChange={(e) => setNewDay(Number(e.target.value))}
                    className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value={1}>Segunda-Feira</option>
                    <option value={2}>Terça-Feira</option>
                    <option value={3}>Quarta-Feira</option>
                    <option value={4}>Quinta-Feira</option>
                    <option value={5}>Sexta-Feira</option>
                    <option value={6}>Sábado</option>
                    <option value={7}>Domingo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Turno</label>
                  <select 
                    value={newShift} 
                    onChange={(e) => setNewShift(e.target.value as any)}
                    className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Selecione a Matéria</label>
                <select 
                  value={newDisciplineName} 
                  onChange={(e) => setNewDisciplineName(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                >
                  {disciplines.map((d, index) => (
                    <option key={index} value={d.name}>{d.name}</option>
                  ))}
                  <option value="Português">Português</option>
                  <option value="Raciocínio Lógico">Raciocínio Lógico</option>
                  <option value="Direito Constitucional">Direito Constitucional</option>
                  <option value="Redação Oficial">Redação Oficial</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Duração (m)</label>
                  <input 
                    type="number" 
                    value={newDuration} 
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full text-xs py-1.5 px-2 border border-slate-200 rounded-lg focus:outline-none" 
                    min={15}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Modalidade</label>
                  <select 
                    value={newType} 
                    onChange={(e) => setNewType(e.target.value as StudyBlockType)}
                    className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-none font-semibold"
                  >
                    <option value="Teoria">Teoria</option>
                    <option value="Revisão">Revisão</option>
                    <option value="Exercícios">Exercícios</option>
                    <option value="Questões">Questões</option>
                    <option value="Simulado">Simulado</option>
                    <option value="Lei Seca">Lei Seca</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddBlockModal(false)}
                  className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer text-center shadow-sm"
                >
                  Agendar Bloco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDY CYCLE GENERATOR POPUP MODAL */}
      {showGenerateCycleModal && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full border border-slate-100 shadow-2xl animate-scale-up my-8 max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-primary rounded-lg">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-800 leading-none">Gerador de Ciclo de Estudos Inteligente</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Configure o seu foco e monte sua rotina ideal no edital</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowGenerateCycleModal(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer p-1 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
              
              {/* Load/Hours/Block setup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-slate-700">Carga Horária Semanal</label>
                    <span className="text-xs font-black text-primary bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono">{weeklyHours} Horas</span>
                  </div>
                  <input 
                    type="range"
                    min={5}
                    max={60}
                    step={2}
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-[9px] text-slate-400 font-bold block">Ajuste o tempo total que você pretende dedicar por semana.</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 block col-span-2">Duração de cada Bloco</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[60, 90, 120].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setBlockDuration(dur)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          blockDuration === dur 
                            ? 'bg-primary border-primary text-white shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {dur} min
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block">Intervalo ideal de foco contínuo por matéria.</span>
                </div>
              </div>

              {/* Day Choices & Shifts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Days selection */}
                <div className="space-y-2.5">
                  <label className="text-xs font-extrabold text-slate-700 block">Dias de Estudo Disponíveis</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, idx) => {
                      const active = selectedDays[idx];
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const updated = [...selectedDays];
                            updated[idx] = !updated[idx];
                            setSelectedDays(updated);
                          }}
                          className={`flex-1 min-w-[36px] py-2 text-xs font-black rounded-lg border text-center transition-all ${
                            active 
                              ? 'bg-primary border-primary text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-350 hover:bg-slate-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block">Marque todos os dias em que deseja alocar blocos de estudo.</span>
                </div>

                {/* Shifts selection */}
                <div className="space-y-2.5">
                  <label className="text-xs font-extrabold text-slate-700 block">Turnos de Estudo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'manha', label: 'Manhã', icon: Sun },
                      { id: 'tarde', label: 'Tarde', icon: CloudSun },
                      { id: 'noite', label: 'Noite', icon: Moon }
                    ].map((shift) => {
                      const active = selectedShifts.includes(shift.id);
                      const Icon = shift.icon;
                      return (
                        <button
                          key={shift.id}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setSelectedShifts(selectedShifts.filter(s => s !== shift.id));
                            } else {
                              setSelectedShifts([...selectedShifts, shift.id]);
                            }
                          }}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-1.5 ${
                            active 
                              ? 'bg-emerald-800 border-emerald-800 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={14} />
                          {shift.label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block">Personalize turnos da sua rotina diária de estudo.</span>
                </div>

              </div>

              {/* Core Smart Tuning Toggles */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-700 block">Pesos e Critérios Inteligentes</label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* weight syllabus toggle */}
                  <div 
                    onClick={() => setConsiderWeights(!considerWeights)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      considerWeights 
                        ? 'bg-emerald-500/5 border-emerald-500/30' 
                        : 'bg-white border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox"
                        checked={considerWeights}
                        onChange={() => {}} // handled by div click
                        className="rounded text-primary focus:ring-primary h-4 w-4 shrink-0 pointer-events-none"
                      />
                      <div>
                        <p className="text-xs font-black text-slate-700 leading-tight">Considerar Peso do Edital PF</p>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                          Calcula relevância de cada conteúdo na prova final da Polícia Federal (Ex: Informática e Contabilidade com 3x mais tempo).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* personal weakness toggle */}
                  <div 
                    onClick={() => setFocusOnWeaknesses(!focusOnWeaknesses)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      focusOnWeaknesses 
                        ? 'bg-emerald-500/5 border-emerald-500/30' 
                        : 'bg-white border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox"
                        checked={focusOnWeaknesses}
                        onChange={() => {}} // handled by div click
                        className="rounded text-primary focus:ring-primary h-4 w-4 shrink-0 pointer-events-none"
                      />
                      <div>
                        <p className="text-xs font-black text-slate-700 leading-tight">Focar em minhas Fraquezas</p>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                          Analisa matérias com maior índice de erros nos seus simulados/questões e aumenta dinamicamente a frequência das revisões nelas.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Study types select */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-700 block">Etapas / Modalidades Inclusas</label>
                <div className="flex flex-wrap gap-2">
                  {(['Teoria', 'Revisão', 'Exercícios', 'Questões', 'Lei Seca', 'Simulado'] as StudyBlockType[]).map((type) => {
                    const active = selectedStudyTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setSelectedStudyTypes(selectedStudyTypes.filter(t => t !== type));
                          } else {
                            setSelectedStudyTypes([...selectedStudyTypes, type]);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all select-none ${
                          active 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-white border-slate-150 text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[9px] text-slate-400 font-bold block">Os blocos agendados irão alternar entre as etapas de forma equilibrada por matéria.</span>
              </div>

              {/* SUBJECT CUSTOM PRIORITY / WEIGHT TUNING */}
              <div className="space-y-3 bg-slate-50/70 p-4 border border-slate-100 rounded-xl">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-700">Prioridade Manual por Matéria</label>
                  <span className="text-[9.5px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider">Ajuste Fino</span>
                </div>
                <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                  Altere livremente a importância de cada matéria para calibrar sua rotina de estudos de acordo com suas necessidades específicas:
                </p>

                <div className="space-y-2.5 mt-3">
                  {disciplines.map((d) => {
                    const currentPri = disciplineCustomWeights[d.name] !== undefined ? disciplineCustomWeights[d.name] : 2;
                    return (
                      <div key={d.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 px-3 bg-white border border-slate-150 rounded-lg shadow-2xs gap-3">
                        <span className="text-xs font-extrabold text-slate-700">{d.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {[
                            { val: 1, label: 'Baixa', class: 'bg-slate-55 text-slate-500 border-slate-150' },
                            { val: 2, label: 'Média', class: 'bg-amber-55 text-amber-600 border-amber-200' },
                            { val: 3, label: 'Alta', class: 'bg-rose-55 text-rose-600 border-rose-200' }
                          ].map((p) => {
                            const isSelected = currentPri === p.val;
                            return (
                              <button
                                key={p.val}
                                type="button"
                                onClick={() => {
                                  setDisciplineCustomWeights({
                                    ...disciplineCustomWeights,
                                    [d.name]: p.val
                                  });
                                }}
                                className={`px-2.5 py-1 text-[10px] font-black rounded border transition-all ${
                                  isSelected 
                                    ? 'bg-slate-800 text-white border-slate-800' 
                                    : 'bg-white hover:bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex gap-4 pt-4 border-t border-slate-100 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowGenerateCycleModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-55 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer text-center"
              >
                Voltar
              </button>
              <button 
                type="button" 
                onClick={handleGenerateStudyCycle}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-primary hover:bg-emerald-700 rounded-lg cursor-pointer text-center shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={13} />
                Gerar Ciclo Inteligente
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
