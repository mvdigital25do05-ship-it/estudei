/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle, 
  Trophy, 
  Clock, 
  TrendingUp, 
  Trash2, 
  X,
  FileSpreadsheet,
  Gauge
} from 'lucide-react';
import { MockTest } from '../types';

interface SimuladosQuestoesProps {
  mockTests: MockTest[];
  onAddMockTest: (test: Omit<MockTest, 'id'>) => void;
  onDeleteMockTest: (id: string) => void;
}

export default function SimuladosQuestoes({ mockTests, onAddMockTest, onDeleteMockTest }: SimuladosQuestoesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [testName, setTestName] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState<number | ''>('');
  const [totalQuestions, setTotalQuestions] = useState<number | ''>('');
  const [testDate, setTestDate] = useState('');

  // Interactive metrics simulator
  const [simulatedPacing, setSimulatedPacing] = useState(0); // 0 seconds initially placeholder

  const getPacingMinutesSecs = (seconds: number) => {
    if (seconds === 0) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPacingComparisonText = (seconds: number) => {
    if (seconds === 0) return 'Arraste a barra abaixo para calcular seu ritmo médio ideal por questão!';
    const averageAprovados = 120; // 2 minutes average
    const diff = averageAprovados - seconds;
    if (diff > 0) {
      return `Seu tempo simulado está ${diff} segundos mais rápido que a média recomendada.`;
    } else {
      return `Seu tempo simulado está ${Math.abs(diff)} segundos mais lento que a média recomendada.`;
    }
  };

  const scoreBadgeStyles = (percent: number) => {
    if (percent >= 85) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (percent >= 70) return 'bg-blue-50 text-blue-800 border border-blue-200';
    return 'bg-rose-100 text-rose-800 border border-rose-200';
  };

  const handleSubmitNewTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) return;

    const correct = Number(correctAnswers) || 0;
    const total = Number(totalQuestions) || 1;
    const percent = Math.round((correct / total) * 1000) / 10;
    const today = new Date();
    const formattedDate = testDate || `${today.getDate().toString().padStart(2, '0')} Out 2023`;

    onAddMockTest({
      name: testName,
      correctAnswers: correct,
      totalQuestions: total,
      scorePercent: percent,
      date: formattedDate,
      status: 'Concluído'
    });

    setTestName('');
    setCorrectAnswers('');
    setTotalQuestions('');
    setTestDate('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header Block to Start simulados */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-white border border-slate-200/80 shadow-xs rounded-xl gap-4">
        <div>
          <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Acompanhe seu desempenho em provas simuladas</p>
        </div>
        
        <button 
          type="button"
          onClick={() => setShowAddForm(true)}
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full font-bold text-xs hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-98 shadow-sm"
        >
          <Plus size={15} />
          Iniciar Novo Simulado
        </button>
      </div>

      {/* Main Double Column Page Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column (Main): List of mock tests & chart */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Recent mock history table card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-widest mb-4">Histórico Recente de Simulados</h3>
            
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 font-semibold text-slate-400">
                    <th className="pb-3 text-left">Simulado</th>
                    <th className="pb-3 text-center">Data</th>
                    <th className="pb-3 text-center">Acertos</th>
                    <th className="pb-3 text-center">Nota</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="font-semibold divide-y divide-slate-50 text-slate-700">
                  {mockTests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 text-slate-800 font-bold">{t.name}</td>
                      <td className="py-3.5 text-center text-slate-450">{t.date}</td>
                      <td className="py-3.5 text-center text-slate-600 font-mono font-bold">{t.correctAnswers}/{t.totalQuestions}</td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black font-mono leading-none ${scoreBadgeStyles(t.scorePercent)}`}>
                          {t.scorePercent}%
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="text-emerald-600 inline-flex items-center gap-1.5 leading-none">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          Concluído
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <button 
                          type="button" 
                          onClick={() => onDeleteMockTest(t.id)}
                          className="hover:text-rose-500 hover:bg-rose-50 rounded p-1 text-slate-400 transition-colors cursor-pointer"
                          title="Deletar Simulado"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-50 text-center">
              <button 
                type="button" 
                onClick={() => alert('Parabéns pela dedicação! Seu histórico de simulados completo foi carregado.')}
                className="text-primary hover:text-emerald-700 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 hover:underline"
              >
                Ver Histórico Completo
              </button>
            </div>
          </div>

          {/* Performance chart (dynamic) */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-widest mb-4">Evolução Geral em Simulados</h3>
            
            {mockTests.length === 0 ? (
              <div className="h-48 w-full bg-slate-55 rounded-lg border border-slate-100 flex flex-col items-center justify-center p-6 text-center">
                <Gauge className="text-slate-300 mb-2" size={28} />
                <p className="text-xs text-slate-400 font-bold max-w-xs leading-relaxed">Nenhum simulado registrado no histórico. Suas notas e gráficos de evolução aparecerão aqui!</p>
              </div>
            ) : (
              <>
                <div className="h-48 w-full bg-slate-50 rounded-lg border border-slate-100 flex items-end p-4 gap-4 relative justify-between overflow-hidden">
                  {/* Overlay lines */}
                  <div className="absolute inset-x-0 top-1/4 border-b border-slate-200/50 w-full" />
                  <div className="absolute inset-x-0 top-2/4 border-b border-slate-200/50 w-full" />
                  <div className="absolute inset-x-0 top-3/4 border-b border-slate-200/50 w-full" />

                  {/* Chart Bars */}
                  {(() => {
                    const lastSixTests = [...mockTests].slice(0, 6).reverse(); // chronological order
                    const totalBars = lastSixTests.length;
                    return lastSixTests.map((t, idx) => {
                      const percent = t.scorePercent;
                      const heightStr = `${Math.min(Math.max(percent, 5), 90)}%`;
                      const isActive = idx === totalBars - 1;

                      return (
                        <div 
                          key={t.id} 
                          className={`w-1/6 rounded-t-sm flex justify-center text-[10px] items-end font-bold pb-2 z-10 transition-all ${
                            isActive 
                              ? 'bg-primary text-white shadow-md shadow-emerald-500/10 h-full' 
                              : 'bg-slate-250/70 hover:bg-slate-300 text-slate-400'
                          }`}
                          style={{ height: heightStr }}
                          title={`${t.name}: ${percent}%`}
                        >
                          {percent}%
                          {isActive && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-850 text-white text-[9px] px-1.5 py-0.5 rounded leading-none shrink-0 font-bold whitespace-nowrap shadow-md z-20">
                              Último
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider mt-3 px-3">
                  {[...mockTests].slice(0, 6).reverse().map((t) => (
                    <span key={t.id} className="truncate max-w-[60px]" title={t.name}>
                      {t.name.replace('Simulado ', '').replace('Geral ', '')}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

                 {/* Right Column (Sidebar): Stats and warns */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Warning high error/misconception areas */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <h3 className="font-semibold text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-500" />
              Pontos de Atenção
            </h3>
            <p className="text-xs text-slate-500 leading-normal font-medium">
              Matérias com maior taxa de erro nos simulados realizados.
            </p>

            <div className="space-y-3 font-semibold text-xs text-slate-700">
              {/* 1 */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Raciocínio Lógico</span>
                  <span className="text-rose-600 font-bold">0% Erros</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '0%' }} />
                </div>
              </div>

              {/* 2 */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Contabilidade Geral</span>
                  <span className="text-amber-600 font-bold">0% Erros</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '0%' }} />
                </div>
              </div>

              {/* 3 */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Direito Administrativo</span>
                  <span className="text-slate-500 font-bold">0% Erros</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => alert('Parabéns! Nenhuma questão errada no histórico recente para gerar caderno de erros.')}
              className="w-full mt-2 py-2 border border-primary text-primary hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
            >
              Gerar Caderno de Erros
            </button>
          </div>

          {/* Time speed pacing simulator card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col items-center justify-between min-h-[220px]">
            <h3 className="font-semibold text-[10px] text-slate-500 text-left w-full uppercase tracking-widest">Métricas de Tempo</h3>
            
            {/* Circular pace meter indicator */}
            <div className="relative w-28 h-28 my-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                <circle 
                  cx="18" 
                  cy="18" 
                  r="14" 
                  fill="none" 
                  stroke="#006e2f" 
                  strokeWidth="2.5" 
                  strokeDasharray={`${simulatedPacing > 0 ? (simulatedPacing / 180) * 100 : 0} 100`} 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-sans font-extrabold text-[15px] text-primary leading-tight">{getPacingMinutesSecs(simulatedPacing)}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 mt-0.5 tracking-wider">/ questão</span>
              </div>
            </div>

            <div className="space-y-3 w-full text-center">
              <p className="text-slate-600 text-[11.5px] font-medium leading-relaxed">
                {getPacingComparisonText(simulatedPacing)}
              </p>
              
              {/* Slider for interactive simulation */}
              <div className="pt-2">
                <input 
                  type="range"
                  min={0}
                  max={180}
                  step={5}
                  value={simulatedPacing}
                  onChange={(e) => setSimulatedPacing(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1 block">Ajustar Simulação de Ritmo</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* RECORD NEW MOCK TEST RESULT MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full border border-slate-100 shadow-xl animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-extrabold text-base text-slate-800">Registrar Notas do Simulado</h3>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewTest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Identificação / Nome</label>
                <input 
                  type="text" 
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Ex: Simulado Geral PF 05 ou Específico"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Acertos</label>
                  <input 
                    type="number" 
                    value={correctAnswers}
                    onChange={(e) => setCorrectAnswers(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Questões Totais</label>
                  <input 
                    type="number" 
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data de Realização (opcional)</label>
                <input 
                  type="text" 
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  placeholder="Ex: 25 Out 2023"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer text-center shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
