import React, { useState } from 'react';
import { 
  Award, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  Target, 
  ArrowRight,
  BookOpen,
  FolderMinus,
  Sparkles,
  X 
} from 'lucide-react';
import { CargoPlan, Discipline, Topic } from '../types';
import { formatMinutes, formatTopicName } from '../utils';
import { getStudyTopics } from '../studyOrder';

interface PlanosManagerProps {
  profiles: CargoPlan[];
  activeProfileId: string;
  onSwitchProfile: (id: string) => void;
  onCreateProfile: (name: string, templateType: string, initialDisciplines?: Discipline[]) => void;
  onDeleteProfile: (id: string) => void;
  onUpdateProfileName: (id: string, newName: string) => void;
}

export default function PlanosManager({
  profiles,
  activeProfileId,
  onSwitchProfile,
  onCreateProfile,
  onDeleteProfile,
  onUpdateProfileName
}: PlanosManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanTemplate, setNewPlanTemplate] = useState('Policial');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // Form state for enqueuing initial subjects & topics
  const [enqueuedDisciplines, setEnqueuedDisciplines] = useState<Discipline[]>([]);
  const [currDisciplineName, setCurrDisciplineName] = useState('');
  const [currTopicsText, setCurrTopicsText] = useState('');
  const [currIcon, setCurrIcon] = useState<'gavel' | 'computer' | 'calculate' | 'book' | 'scale' | 'shield'>('book');
  const [currColor, setCurrColor] = useState('blue');

  // Enqueue a subject/discipline with its initial topics
  const handleEnqueueDiscipline = () => {
    if (!currDisciplineName.trim()) return;

    // Parse topics from comma-separated or newline-separated text
    const topicNames = currTopicsText
      .split(/[,\n;]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const topics: Topic[] = topicNames.map((name, idx) => ({
      id: `init_topic_${Date.now()}_${idx}`,
      name,
      completed: false
    }));

    const newDisc: Discipline = {
      id: `init_disc_${Date.now()}`,
      name: currDisciplineName.trim(),
      topicsTotal: topics.length,
      topicsDone: 0,
      topics,
      timeSpentMin: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      icon: currIcon,
      colorClass: currColor
    };

    setEnqueuedDisciplines(prev => [...prev, newDisc]);
    setCurrDisciplineName('');
    setCurrTopicsText('');
    setCurrIcon('book');
    setCurrColor('blue');
  };

  const handleRemoveEnqueuedDiscipline = (discId: string) => {
    setEnqueuedDisciplines(prev => prev.filter(d => d.id !== discId));
  };

  // Handle submit new cargo plan
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    onCreateProfile(newPlanName.trim(), newPlanTemplate, enqueuedDisciplines);
    setNewPlanName('');
    setEnqueuedDisciplines([]);
    setShowAddModal(false);
  };

  // Start editing cargo name
  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditNameValue(currentName);
  };

  // Save edited name
  const handleSaveEdit = (id: string) => {
    if (!editNameValue.trim()) return;
    onUpdateProfileName(id, editNameValue.trim());
    setEditingId(null);
  };

  // Helper to calculate statistics for a profile
  const getProfileStats = (p: CargoPlan) => {
    let totalSpentMin = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalTopics = 0;
    let completedTopics = 0;

    p.disciplines.forEach(d => {
      totalSpentMin += d.timeSpentMin;
      totalCorrect += d.correctAnswers;
      totalWrong += d.wrongAnswers;
      totalTopics += d.topicsTotal || d.topics.length;
      completedTopics += d.topicsDone || d.topics.filter(t => t.completed).length;
    });

    const totalQuestions = totalCorrect + totalWrong;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const totalHours = Math.round((totalSpentMin / 60) * 10) / 10;
    const completionPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return {
      totalSpentMin,
      totalHours,
      totalQuestions,
      accuracy,
      completionPercent,
      completedTopics,
      totalTopics,
      disciplinesCount: p.disciplines.length
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-850 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 text-primary bg-primary/10 rounded font-bold text-[9px] uppercase tracking-wider">Mapeamento de Metas</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          </div>
          <h1 className="font-display font-black text-lg text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 mt-1">
            <Award className="text-secondary" size={18} />
            Estratégias e Planos de Estudos
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Crie perfis de estudos independentes para múltiplos concursos e estude simultaneamente sem misturar seu progresso.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewPlanName('');
            setNewPlanTemplate('Policial');
            setShowAddModal(true);
          }}
          className="bg-primary hover:bg-primary/95 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-101 active:scale-98"
        >
          <Plus size={15} />
          Novo Cargo / Concurso
        </button>
      </div>

      {/* Grid of study goals (Cargos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          const stats = getProfileStats(profile);

          return (
            <div 
              key={profile.id}
              className={`rounded-xl border transition-all flex flex-col justify-between ${
                isActive 
                  ? 'bg-white dark:bg-slate-900 border-primary shadow-md ring-2 ring-primary/15' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:shadow-xs hover:border-slate-350 dark:hover:border-slate-700'
              }`}
            >
              <div className="p-5 space-y-4">
                
                {/* Header card info */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        isActive 
                          ? 'bg-primary text-white' 
                          : 'bg-slate-100 dark:bg-slate-805 text-slate-500 dark:text-slate-400'
                      }`}>
                        {isActive ? 'Ativo Agora' : 'Inativo'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">Criado em {profile.createdAt}</span>
                    </div>

                    {editingId === profile.id ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 dark:text-white rounded-md font-bold focus:outline-none focus:border-primary flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(profile.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded-md transition-colors"
                          title="Confirmar Nome"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 p-1 rounded-md transition-colors"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/title">
                        <h3 className="font-display font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider truncate">
                          {profile.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(profile.id, profile.name)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => onDeleteProfile(profile.id)}
                      className="text-slate-420 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                      title="Excluir Concurso"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-50 dark:bg-slate-855/50 p-2 rounded-lg text-center space-y-1 border border-slate-100 dark:border-slate-800/50">
                    <Clock className="text-primary size-3.5 mx-auto opacity-75" />
                    <div>
                      <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Estudado</span>
                      <span className="font-mono text-[11px] font-black text-slate-700 dark:text-slate-100">{formatMinutes(stats.totalSpentMin)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-855/50 p-2 rounded-lg text-center space-y-1 border border-slate-100 dark:border-slate-800/50">
                    <Target className="text-secondary size-3.5 mx-auto opacity-75" />
                    <div>
                      <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Acertos</span>
                      <span className="font-mono text-[11px] font-black text-slate-700 dark:text-slate-100">{stats.accuracy}%</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-855/50 p-2 rounded-lg text-center space-y-1 border border-slate-100 dark:border-slate-800/50">
                    <BookOpen className="text-purple-500 size-3.5 mx-auto opacity-75" />
                    <div>
                      <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Matérias</span>
                      <span className="font-mono text-[11px] font-black text-slate-700 dark:text-slate-100">{stats.disciplinesCount}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-855/50 p-2 rounded-lg text-center space-y-1 border border-slate-100 dark:border-slate-800/50">
                    <CheckCircle2 className="text-emerald-500 size-3.5 mx-auto opacity-75" />
                    <div>
                      <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Progresso</span>
                      <span className="font-mono text-[11px] font-black text-slate-700 dark:text-slate-100">{stats.completionPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Advanced progress indicator bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span>Tópicos Estudados</span>
                    <span>{stats.completedTopics} de {stats.totalTopics} cadastrados ({stats.completionPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-150 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isActive ? 'bg-primary' : 'bg-slate-400'
                      }`}
                      style={{ width: `${stats.completionPercent}%` }}
                    />
                  </div>
                </div>

                {/* Mini disciplines summary bullet track */}
                <div className="pt-2">
                  <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Distribuição Teórica Geral</span>
                  <div className="flex flex-wrap gap-1">
                    {profile.disciplines.length > 0 ? (
                      profile.disciplines.map(d => (
                        <span 
                          key={d.id} 
                          className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] font-semibold text-slate-600 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/55"
                        >
                          {d.name.split(' ')[0]} {d.name.split(' ')[1] || ''}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sem disciplinas adicionadas</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Action active footer panel */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 border-t border-slate-150 dark:border-slate-800 rounded-b-xl flex justify-between items-center">
                {isActive ? (
                  <div className="flex items-center gap-1.5 text-xs text-primary dark:text-indigo-400 font-extrabold">
                    <CheckCircle2 size={14} className="stroke-[2.5]" />
                    Perfil Ativo no Sistema
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSwitchProfile(profile.id)}
                    className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer active:scale-98 shadow-2xs"
                  >
                    Acessar e Estudar
                    <ArrowRight size={13} />
                  </button>
                )}

                <div className="text-[10px] font-mono font-bold text-slate-400">
                  {profile.activityLogs.length} sessões registradas
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL CO-CREATION FORM */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-scale-up space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-display font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                Novo Objetivo de Estudo
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddModal(false);
                  setEnqueuedDisciplines([]);
                }}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Name input */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Nome do Concurso / Cargo</label>
                <input
                  type="text"
                  placeholder="Ex: Analista Judiciário (TRE)"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-100"
                  required
                />
              </div>

              {/* Template selection */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Grade de Disciplinas Sugerida</label>
                <select
                  value={newPlanTemplate}
                  onChange={(e) => setNewPlanTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 dark:text-white rounded-lg focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-100"
                  required
                >
                  <option value="Policial">👮 Carreira Policial (PF, PC, PRF)</option>
                  <option value="Fiscal">📊 Carreira Fiscal (Receita, SEFAZ, ISS)</option>
                  <option value="Judiciário">⚖️ Magistratura & Judiciários (TRT, TRE, TJ)</option>
                  <option value="Administrativo">🏢 Área Administrativa (INSS, Bancos)</option>
                  <option value="Em Branco">🗂️ Grade em Branco (Adicionar Manualmente)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                  Sugerimos um conjunto de matérias base para começar o edital de forma imediata. É possível editar e excluir disciplinas a qualquer momento.
                </p>
              </div>

              {/* Seção de Cadastro de Matérias/Tópicos de Estudo */}
              <div className="pt-3 border-t border-slate-150 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                  <BookOpen size={14} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-wider font-semibold">
                    Adicionar Matérias e Tópicos de Estudo (Opcional)
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-855 p-3.5 rounded-lg border border-slate-150 dark:border-slate-800/85 space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Nome da matéria / disciplina</label>
                    <input
                      type="text"
                      placeholder="Ex: Direito Administrativo"
                      value={currDisciplineName}
                      onChange={(e) => setCurrDisciplineName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-900 dark:text-white rounded-md focus:outline-none focus:border-primary font-bold text-slate-700 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Tópicos de estudo (separe por vírgula)</label>
                    <textarea
                      placeholder="Ex: Princípios, Ato Administrativo, Agentes Públicos, Licitação"
                      value={currTopicsText}
                      onChange={(e) => setCurrTopicsText(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-900 dark:text-white rounded-md focus:outline-none focus:border-primary font-medium text-slate-705 dark:text-slate-200 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Ícone</span>
                      <div className="flex flex-wrap gap-1">
                        {(['book', 'gavel', 'shield', 'computer', 'calculate', 'scale'] as const).map(ic => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setCurrIcon(ic)}
                            className={`p-1 px-1.5 text-[10px] rounded border transition-all uppercase font-semibold ${
                              currIcon === ic
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-350'
                            }`}
                          >
                            {ic === 'book' && '📚'}
                            {ic === 'gavel' && '⚖️'}
                            {ic === 'shield' && '👮'}
                            {ic === 'computer' && '💻'}
                            {ic === 'calculate' && '🧮'}
                            {ic === 'scale' && '⚖️'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Cor da Matéria</span>
                      <div className="flex gap-1.5 items-center pt-0.5">
                        {['blue', 'emerald', 'yellow', 'purple', 'red', 'indigo'].map(col => {
                          const bgMap: Record<string, string> = {
                            blue: 'bg-blue-500',
                            emerald: 'bg-emerald-500',
                            yellow: 'bg-amber-400',
                            purple: 'bg-purple-500',
                            red: 'bg-rose-500',
                            indigo: 'bg-indigo-500'
                          };
                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setCurrColor(col)}
                              className={`w-4 h-4 rounded-full ${bgMap[col]} transition-all active:scale-90 ${
                                currColor === col 
                                  ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 border border-white' 
                                  : 'opacity-75 hover:opacity-100'
                              }`}
                              title={col}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnqueueDiscipline}
                    disabled={!currDisciplineName.trim()}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-[10px] font-extrabold uppercase tracking-wider rounded border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    + Adicionar Matéria e Tópicos na Fila
                  </button>
                </div>
              </div>

              {/* List of enqueued subjects/topics */}
              {enqueuedDisciplines.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest font-semibold">
                    Matérias Prontas para Criação ({enqueuedDisciplines.length})
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {enqueuedDisciplines.map((d) => (
                      <div 
                        key={d.id} 
                        className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-855 border border-slate-150 dark:border-slate-800/60"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-extrabold text-slate-750 dark:text-slate-100 flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {d.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            Tópicos ({d.topics.length}): {getStudyTopics(d).map(t => formatTopicName(t.name)).join(', ') || 'Nenhum'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEnqueuedDiscipline(d.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer transition-colors"
                          title="Remover matéria da fila"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel or Submit */}
              <div className="flex gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddModal(false);
                    setEnqueuedDisciplines([]);
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/95 rounded-lg cursor-pointer transition-all shadow-sm uppercase tracking-wider"
                >
                  Criar Cargo
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
