/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Search, 
  HelpCircle, 
  Bell, 
  Moon, 
  Sun,
  School,
  Sparkles,
  Award,
  BookOpen,
  Calendar,
  GraduationCap,
  Loader2
} from 'lucide-react';

import { Discipline, Reminder, StudyBlock, MockTest, ActivityLog, ExerciseLog, CargoPlan } from './types';
import { 
  INITIAL_DISCIPLINES, 
  INITIAL_REMINDERS, 
  INITIAL_MOCK_TESTS, 
  INITIAL_STUDY_BLOCKS, 
  INITIAL_ACTIVITY_LOGS,
  INITIAL_EXERCISE_LOGS
} from './data';
import { formatMinutes, getLocalDateString, getLogDateKey, sanitizeForFirestore, isDateInCurrentWeek } from './utils';

import Sidebar from './components/Sidebar';
import DashboardHome from './components/DashboardHome';
import PlanosManager from './components/PlanosManager';
import DisciplinasList from './components/DisciplinasList';
import PlanejamentoSchedule from './components/PlanejamentoSchedule';
import SimuladosQuestoes from './components/SimuladosQuestoes';

// Firebase imports
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, limit, query } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import AuthScreen from './components/AuthScreen';
import BackupButton from './components/BackupButton';
import ErrorNotebook from './components/ErrorNotebook';
import { previewOutlineMerge, type OutlineInput } from './outlineImport';
import { previewPriorityAssignments, type PriorityAssignment, type PriorityEvidenceImport } from './priorityEvidence';
import { createSequentialWriter } from './sequentialWriter';
import { captureProfileSnapshot } from './profilePersistence';

export default function App() {
  // Navigation active state
  const [activeTab, setActiveTab] = useState<string>('inicio');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      return true;
    }
    return false;
  });
  
  // Firebase Tracking states
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 1. Core dataset states matching individual authenticated workspace
  const [profiles, setProfiles] = useState<CargoPlan[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);

  // Notifications drawer control
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Weekly goals states
  const [weeklyHours, setWeeklyHours] = useState({ done: 0, total: 30 });
  const [weeklyQuestions, setWeeklyQuestions] = useState({ done: 0, total: 500 });
  const [weeklyReviews, setWeeklyReviews] = useState({ done: 0, total: 100 });

  // Exam/Test details tracking
  const [examDate, setExamDate] = useState<string>('');
  const [examName, setExamName] = useState<string>('');

  // Cloud Saving Status Indicators
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>('');
  const saveQueueRef = useRef(createSequentialWriter());
  const pendingWritesRef = useRef(0);
  const pendingDebouncesRef = useRef(0);
  // A deleted profile must never be silently recreated by a late autosave.
  const deletedProfileIdsRef = useRef(new Set<string>());
  const profileSwitchInProgressRef = useRef(false);

  const beginSave = () => {
    pendingWritesRef.current++;
    setSaveStatus('saving');
  };

  const finishSave = (failed: boolean) => {
    pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
    if (failed) setSaveStatus('error');
    else if (pendingWritesRef.current === 0 && pendingDebouncesRef.current === 0) {
      setSaveStatus(previous => previous === 'saving' ? 'saved' : previous);
    }
  };

  // Auto open discipline creation modal state
  const [autoOpenAddDiscipline, setAutoOpenAddDiscipline] = useState<boolean>(false);

  // 2. Track Auth state change & Hydrate user details from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setAuthLoading(false);
        setIsLoaded(false);
        setProfiles([]);
        setReminders([]);
        setDisciplines([]);
        setMockTests([]);
        setExerciseLogs([]);
        setActivityLogs([]);
        setStudyBlocks([]);
        setActiveProfileId('');
        setExamDate('');
        setExamName('');
      } else {
        setAuthLoading(true);
        try {
          // A. Map user metadata
          const userDocRef = doc(db, 'users', currentUser.uid);
          let userDocSnap;
          try {
            userDocSnap = await getDoc(userDocRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
            return;
          }
          
          let activeProfile = '';
          let loadedReminders = INITIAL_REMINDERS;

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            activeProfile = userData.activeProfileId || '';
            loadedReminders = userData.reminders || [];
          } else {
            // Initiate default document inside cloud Database
            try {
              await setDoc(userDocRef, sanitizeForFirestore({
                name: currentUser.displayName || 'Estudante',
                email: currentUser.email || '',
                activeProfileId: '',
                reminders: INITIAL_REMINDERS,
                createdAt: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              }));
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
            }
          }

          // B. Get Profile Subcollection
          const profilesColRef = collection(db, 'users', currentUser.uid, 'profiles');
          let profilesSnap;
          try {
            profilesSnap = await getDocs(profilesColRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/profiles`);
            return;
          }
          let loadedProfiles: CargoPlan[] = [];

          if (!profilesSnap.empty) {
            profilesSnap.forEach((d) => {
              loadedProfiles.push(d.data() as CargoPlan);
            });
          }

          // Set active sets
          setProfiles(loadedProfiles);
          setReminders(loadedReminders);
          // Resolve invalid/missing selected ID before allowing autosave.
          // Never create a phantom profile using a stale activeProfileId.
          const targetProfile = loadedProfiles.find(p => p.id === activeProfile) || loadedProfiles[0];
          setActiveProfileId(targetProfile?.id || '');

          // Hydrate dynamic views states
          if (targetProfile) {
            setDisciplines(targetProfile.disciplines || []);
            setMockTests(targetProfile.mockTests || []);
            setExerciseLogs(targetProfile.exerciseLogs || []);
            setActivityLogs(targetProfile.activityLogs || []);
            setStudyBlocks(targetProfile.studyBlocks || []);
            setWeeklyHours(targetProfile.weeklyHours || { done: 18, total: 30 });
            setWeeklyQuestions(targetProfile.weeklyQuestions || { done: 320, total: 500 });
            setWeeklyReviews(targetProfile.weeklyReviews || { done: 65, total: 100 });
            setExamDate(targetProfile.examDate || '');
            setExamName(targetProfile.examName || '');
          } else {
            setDisciplines([]);
            setMockTests([]);
            setExerciseLogs([]);
            setActivityLogs([]);
            setStudyBlocks([]);
            setWeeklyHours({ done: 0, total: 24 });
            setWeeklyQuestions({ done: 0, total: 300 });
            setWeeklyReviews({ done: 0, total: 60 });
            setExamDate('');
            setExamName('');
          }

          setIsLoaded(true);
        } catch (error) {
          console.error("Erro ao carregar dados do Firebase:", error);
        } finally {
          setAuthLoading(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Ticker to trigger weekly goal reset check automatically when midnight on Sunday passes
  const [timeTick, setTimeTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(Date.now());
    }, 60000); // Check every minute
    return () => clearInterval(timer);
  }, []);

  // Synchronize weekly study goals (hours, questions, reviews) with logs from the CURRENT WEEK (Sunday 00:00 to Saturday 23:59)
  useEffect(() => {
    if (!isLoaded) return;

    let currentWeekMinutes = 0;
    let currentWeekQuestions = 0;
    let currentWeekReviews = 0;

    activityLogs.forEach(log => {
      // Exclude rest days from study time calculation
      if (log.disciplineName === 'Dia de Descanso') return;

      const logDateOrMs = log.date || log.createdAtMs;
      if (logDateOrMs && isDateInCurrentWeek(logDateOrMs)) {
        currentWeekMinutes += log.timeSpentMin || 0;

        const qCount = log.questionsSolved !== undefined 
          ? log.questionsSolved 
          : ((log.correctAnswers || 0) + (log.wrongAnswers || 0));
        currentWeekQuestions += qCount;

        if (log.studyType === 'Revisão') {
          currentWeekReviews += 1;
        }
      }
    });

    const calculatedHoursDone = currentWeekMinutes / 60;

    setWeeklyHours(prev => {
      if (Math.abs(prev.done - calculatedHoursDone) > 0.001) {
        return { ...prev, done: calculatedHoursDone };
      }
      return prev;
    });

    setWeeklyQuestions(prev => {
      if (prev.done !== currentWeekQuestions) {
        return { ...prev, done: currentWeekQuestions };
      }
      return prev;
    });

    setWeeklyReviews(prev => {
      if (prev.done !== currentWeekReviews) {
        return { ...prev, done: currentWeekReviews };
      }
      return prev;
    });
  }, [activityLogs, isLoaded, timeTick]);

  // 3. Keep Profiles state synchronized locally on modification
  useEffect(() => {
    if (!isLoaded) return;
    setProfiles(prev => prev.map(p => {
      if (p.id === activeProfileId) {
        return {
          ...p,
          disciplines,
          mockTests,
          exerciseLogs,
          activityLogs,
          studyBlocks,
          weeklyHours,
          weeklyQuestions,
          weeklyReviews,
          examDate,
          examName
        };
      }
      return p;
    }));
  }, [
    disciplines,
    mockTests,
    exerciseLogs,
    activityLogs,
    studyBlocks,
    weeklyHours,
    weeklyQuestions,
    weeklyReviews,
    examDate,
    examName,
    activeProfileId,
    isLoaded
  ]);

  // 4. Firebase Cloud Autosave on State Modifications
  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUserData = async () => {
      beginSave();
      let failed = false;
      try {
        const userRef = doc(db, 'users', user.uid);
        await saveQueueRef.current.enqueue(`user/${user.uid}`, () =>
          setDoc(userRef, sanitizeForFirestore({
            activeProfileId: activeProfileId || '',
            reminders: reminders || [],
            name: user.displayName || 'Estudante',
            email: user.email || ''
          }), { merge: true })
        );
      } catch (error) {
        failed = true;
        setSaveErrorMsg(error instanceof Error ? error.message : String(error));
        console.error("Erro salvando metadados do usuário:", error);
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      } finally {
        finishSave(failed);
      }
    };

    // Mark dirty at edit time, not 600ms later: backups must not export
    // a cloud snapshot before the pending debounce has actually persisted.
    pendingDebouncesRef.current++;
    setSaveStatus('saving');
    let scheduled = true;
    const timeout = setTimeout(() => {
      scheduled = false;
      pendingDebouncesRef.current = Math.max(0, pendingDebouncesRef.current - 1);
      void syncUserData();
    }, 600);
    return () => {
      clearTimeout(timeout);
      if (scheduled) {
        pendingDebouncesRef.current = Math.max(0, pendingDebouncesRef.current - 1);
      }
    };
  }, [activeProfileId, reminders, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user || !activeProfileId || deletedProfileIdsRef.current.has(activeProfileId)) return;

    const syncProfileData = async () => {
      if (deletedProfileIdsRef.current.has(activeProfileId)) return;
      beginSave();
      let failed = false;
      try {
        const profileRef = doc(db, 'users', user.uid, 'profiles', activeProfileId);
        const currentProfile = profiles.find(p => p.id === activeProfileId);
        const name = currentProfile?.name || 'Meu Concurso';
        const createdAt = currentProfile?.createdAt || '25 Mai 2026';
        
        await saveQueueRef.current.enqueue(`profiles/${user.uid}/${activeProfileId}`, () =>
          setDoc(profileRef, sanitizeForFirestore({
            id: activeProfileId,
            name,
            disciplines: disciplines || [],
            mockTests: mockTests || [],
            exerciseLogs: exerciseLogs || [],
            activityLogs: activityLogs || [],
            studyBlocks: studyBlocks || [],
            weeklyHours: weeklyHours || { done: 0, total: 30 },
            weeklyQuestions: weeklyQuestions || { done: 0, total: 500 },
            weeklyReviews: weeklyReviews || { done: 0, total: 100 },
            createdAt,
            examDate: examDate || '',
            examName: examName || ''
          }), { merge: true })
        );
      } catch (error) {
        failed = true;
        setSaveErrorMsg(error instanceof Error ? error.message : String(error));
        console.error("Erro salvando dados do plano:", error);
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/profiles/${activeProfileId}`);
      } finally {
        finishSave(failed);
      }
    };

    pendingDebouncesRef.current++;
    setSaveStatus('saving');
    let scheduled = true;
    const timeout = setTimeout(() => {
      scheduled = false;
      pendingDebouncesRef.current = Math.max(0, pendingDebouncesRef.current - 1);
      void syncProfileData();
    }, 600);
    return () => {
      clearTimeout(timeout);
      if (scheduled) {
        pendingDebouncesRef.current = Math.max(0, pendingDebouncesRef.current - 1);
      }
    };
  }, [
    disciplines,
    mockTests,
    exerciseLogs,
    activityLogs,
    studyBlocks,
    weeklyHours,
    weeklyQuestions,
    weeklyReviews,
    examDate,
    examName,
    activeProfileId,
    isLoaded,
    user
  ]);

  // 5. Logout secure session handler
  const handleLogout = async () => {
    setIsLoaded(false);
    await auth.signOut();
  };

  // 6. Switch study configurations active tab
  const handleSwitchProfile = async (id: string) => {
    if (profileSwitchInProgressRef.current || id === activeProfileId) return;
    const target = profiles.find(p => p.id === id);
    if (!target || !user || deletedProfileIdsRef.current.has(id)) return;
    const previous = profiles.find(p => p.id === activeProfileId);
    if (!previous && activeProfileId) {
      setSaveStatus('error');
      setSaveErrorMsg('O plano atual não foi encontrado. Recarregue os dados antes de trocar.');
      return;
    }

    profileSwitchInProgressRef.current = true;
    if (previous) {
      const snapshot = captureProfileSnapshot(previous, {
        disciplines, mockTests, exerciseLogs, activityLogs, studyBlocks,
        weeklyHours, weeklyQuestions, weeklyReviews, examDate, examName,
      });

      // Keep recent edits even if the debounce timer has not fired yet.
      setProfiles(current => current.map(plan => plan.id === snapshot.id ? snapshot : plan));
      beginSave();
      let failed = false;
      try {
        await saveQueueRef.current.enqueue(`profiles/${user.uid}/${snapshot.id}`, () =>
          setDoc(doc(db, 'users', user.uid, 'profiles', snapshot.id),
            sanitizeForFirestore(snapshot), { merge: true })
        );
      } catch (cause) {
        failed = true;
        setSaveErrorMsg(cause instanceof Error ? cause.message : String(cause));
        console.error('Troca de plano bloqueada: não foi possível persistir a origem.', cause);
      } finally {
        finishSave(failed);
        if (failed) {
          profileSwitchInProgressRef.current = false;
          return;
        }
      }
    }

    // The source plan has finished saving. Hydrate the destination atomically
    // as a React batch to avoid applying source state to the destination ID.
    setDisciplines(target.disciplines || []);
    setMockTests(target.mockTests || []);
    setExerciseLogs(target.exerciseLogs || []);
    setActivityLogs(target.activityLogs || []);
    setStudyBlocks(target.studyBlocks || []);
    setWeeklyHours(target.weeklyHours || { done: 0, total: 24 });
    setWeeklyQuestions(target.weeklyQuestions || { done: 0, total: 300 });
    setWeeklyReviews(target.weeklyReviews || { done: 0, total: 60 });
    setExamDate(target.examDate || '');
    setExamName(target.examName || '');
    setActiveProfileId(id);
    profileSwitchInProgressRef.current = false;
  };

  const handleCreateProfile = async (name: string, templateType: string, initialDisciplines?: Discipline[]): Promise<boolean> => {
    let initialDisc: Discipline[] = initialDisciplines && initialDisciplines.length > 0 
      ? initialDisciplines 
      : [];

    if (initialDisc.length === 0) {
      if (templateType === 'Policial') {
        initialDisc = [
          {
            id: 'd_pol_1',
            name: 'Língua Portuguesa',
            topicsTotal: 4,
            topicsDone: 0,
            topics: [
              { id: 't_pol_1_1', name: 'Compreensão e Interpretação de Textos', completed: false },
              { id: 't_pol_1_2', name: 'Ortografia e Acentuação', completed: false },
              { id: 't_pol_1_3', name: 'Morfosintaxe e Classes de Palavras', completed: false },
              { id: 't_pol_1_4', name: 'Pontuação e Concordância', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'book',
            colorClass: 'blue'
          },
          {
            id: 'd_pol_2',
            name: 'Direito Penal',
            topicsTotal: 4,
            topicsDone: 0,
            topics: [
              { id: 't_pol_2_1', name: 'Princípios Básicos e Infração Penal', completed: false },
              { id: 't_pol_2_2', name: 'Teoria do Crime', completed: false },
              { id: 't_pol_2_3', name: 'Crimes contra a Pessoa', completed: false },
              { id: 't_pol_2_4', name: 'Crimes contra o Patrimônio', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'shield',
            colorClass: 'emerald'
          },
          {
            id: 'd_pol_3',
            name: 'Direito Processual Penal',
            topicsTotal: 3,
            topicsDone: 0,
            topics: [
              { id: 't_pol_3_1', name: 'Inquérito Policial', completed: false },
              { id: 't_pol_3_2', name: 'Ação Penal', completed: false },
              { id: 't_pol_3_3', name: 'Prisão e Liberdade Provisória', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'gavel',
            colorClass: 'indigo'
          },
          {
            id: 'd_pol_4',
            name: 'Direito Constitucional',
            topicsTotal: 3,
            topicsDone: 0,
            topics: [
              { id: 't_pol_4_1', name: 'Direitos e Garantias Fundamentais', completed: false },
              { id: 't_pol_4_2', name: 'Organização do Estado', completed: false },
              { id: 't_pol_4_3', name: 'Segurança Pública (Art. 144)', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'book',
            colorClass: 'purple'
          },
          {
            id: 'd_pol_5',
            name: 'Informática',
            topicsTotal: 3,
            topicsDone: 0,
            topics: [
              { id: 't_pol_5_1', name: 'Segurança da Informação e Criptografia', completed: false },
              { id: 't_pol_5_2', name: 'Redes de Computadores e Internet', completed: false },
              { id: 't_pol_5_3', name: 'Sistemas Operacionais (Windows/Linux)', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'computer',
            colorClass: 'rose'
          }
        ];
      } else if (templateType === 'Fiscal') {
        initialDisc = [
          {
            id: 'd_fisc_1',
            name: 'Língua Portuguesa',
            topicsTotal: 4,
            topicsDone: 0,
            topics: [
              { id: 't_fisc_1_1', name: 'Compreensão de Textos', completed: false },
              { id: 't_fisc_1_2', name: 'Sintaxe da Oração e Período', completed: false },
              { id: 't_fisc_1_3', name: 'Morfologia e Classes Gramaticais', completed: false },
              { id: 't_fisc_1_4', name: 'Regência e Crase', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'book',
            colorClass: 'blue'
          },
          {
            id: 'd_fisc_2',
            name: 'Direito Tributário',
            topicsTotal: 4,
            topicsDone: 0,
            topics: [
              { id: 't_fisc_2_1', name: 'Sistema Tributário Nacional da CF', completed: false },
              { id: 't_fisc_2_2', name: 'Limitações do Poder de Tributar', completed: false },
              { id: 't_fisc_2_3', name: 'Competência e Impostos', completed: false },
              { id: 't_fisc_2_4', name: 'Crédito e Obrigação Tributária', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'gavel',
            colorClass: 'emerald'
          },
          {
            id: 'd_fisc_3',
            name: 'Contabilidade Geral',
            topicsTotal: 4,
            topicsDone: 0,
            topics: [
              { id: 't_fisc_3_1', name: 'Noções de Contas e Plano de Contas', completed: false },
              { id: 't_fisc_3_2', name: 'Escrituração e Lançamentos Livres', completed: false },
              { id: 't_fisc_3_3', name: 'Estruturação do Balanço Patrimonial', completed: false },
              { id: 't_fisc_3_4', name: 'Demonstração de Resultado (DRE)', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'scale',
            colorClass: 'indigo'
          },
          {
            id: 'd_fisc_4',
            name: 'Direito Administrativo',
            topicsTotal: 3,
            topicsDone: 0,
            topics: [
              { id: 't_fisc_4_1', name: 'Atos e Poderes Administrativos', completed: false },
              { id: 't_fisc_4_2', name: 'Agentes Públicos e Regime Jurídico', completed: false },
              { id: 't_fisc_4_3', name: 'Licitações e Contratos (Lei 14.133)', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'book',
            colorClass: 'purple'
          }
        ];
      } else if (templateType === 'Judiciário') {
        initialDisc = [
          {
            id: 'd_jud_1',
            name: 'Língua Portuguesa',
            topicsTotal: 4,
            topicsDone: 0,
            topics: [
              { id: 't_jud_1_1', name: 'Compreensão de Textos', completed: false },
              { id: 't_jud_1_2', name: 'Ortografia e Morfossintaxe', completed: false },
              { id: 't_jud_1_3', name: 'Sintaxe e Pontuação', completed: false },
              { id: 't_jud_1_4', name: 'Concordância e Crase', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'book',
            colorClass: 'blue'
          },
          {
            id: 'd_jud_2',
            name: 'Direito Constitucional',
            topicsTotal: 3,
            topicsDone: 0,
            topics: [
              { id: 't_jud_2_1', name: 'Direitos fundamentais individuais', completed: false },
              { id: 't_jud_2_2', name: 'Organização dos Três Poderes', completed: false },
              { id: 't_jud_2_3', name: 'Estatuto do Poder Judiciário', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'gavel',
            colorClass: 'emerald'
          },
          {
            id: 'd_jud_3',
            name: 'Direito Processual Civil',
            topicsTotal: 4,
            topicsDone: 0,
            topics: [
              { id: 't_jud_3_1', name: 'Atos e Prazos Processuais', completed: false },
              { id: 't_jud_3_2', name: 'Petição Inicial e Contestação', completed: false },
              { id: 't_jud_3_3', name: 'Teoria Geral dos Recursos civis', completed: false },
              { id: 't_jud_3_4', name: 'Cumprimento de Sentença e Execução', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'scale',
            colorClass: 'indigo'
          }
        ];
      } else if (templateType === 'Administrativo') {
        initialDisc = [
          {
            id: 'd_adm_1',
            name: 'Língua Portuguesa',
            topicsTotal: 4,
            topicsDone: 0,
            topics: [
              { id: 't_adm_1_1', name: 'Compreensão e Interpretação', completed: false },
              { id: 't_adm_1_2', name: 'Pontuação e Concordância', completed: false },
              { id: 't_adm_1_3', name: 'Classes de palavras', completed: false },
              { id: 't_adm_1_4', name: 'Regência e Crase', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'book',
            colorClass: 'blue'
          },
          {
            id: 'd_adm_2',
            name: 'Direito Administrativo',
            topicsTotal: 3,
            topicsDone: 0,
            topics: [
              { id: 't_adm_2_1', name: 'Atos Administrativos e Poderes', completed: false },
              { id: 't_adm_2_2', name: 'Agentes Públicos federais', completed: false },
              { id: 't_adm_2_3', name: 'Licitações Públicas', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'scale',
            colorClass: 'emerald'
          },
          {
            id: 'd_adm_3',
            name: 'Noções de Administração',
            topicsTotal: 3,
            topicsDone: 0,
            topics: [
              { id: 't_adm_3_1', name: 'Gestão de Pessoas e Organização', completed: false },
              { id: 't_adm_3_2', name: 'Processo de Planejamento e Controle', completed: false },
              { id: 't_adm_3_3', name: 'Atendimento ao Cidadão e Ética', completed: false }
            ],
            timeSpentMin: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            icon: 'shield',
            colorClass: 'purple'
          }
        ];
      }
    }

    const newProfile: CargoPlan = {
      id: auth.currentUser ? doc(collection(db, 'users', auth.currentUser.uid, 'profiles')).id : `profile_${Date.now()}`,
      name,
      disciplines: initialDisc,
      mockTests: [],
      exerciseLogs: [],
      activityLogs: [],
      studyBlocks: [],
      weeklyHours: { done: 0, total: 24 },
      weeklyQuestions: { done: 0, total: 300 },
      weeklyReviews: { done: 0, total: 60 },
      createdAt: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      examDate: '',
      examName: ''
    };

    // Save before switching: the legacy implementation hydrated the new
    // profile immediately, cancelling the 600ms autosave of the old one.
    const currentUser = auth.currentUser;
    if (!isLoaded || !currentUser || profileSwitchInProgressRef.current) {
      alert('Aguarde o carregamento e o salvamento do plano anterior.');
      return false;
    }
    if (!name.trim() || name.length > 100 || profiles.some(p => p.id === newProfile.id)) {
      alert('Nome ou identificador do novo plano inválido.');
      return false;
    }

    const previous = profiles.find(p => p.id === activeProfileId);
    if (activeProfileId && !previous) {
      alert('O plano atual não foi encontrado. Atualize a página antes de criar outro.');
      return false;
    }
    profileSwitchInProgressRef.current = true;
    beginSave();
    let failed = false;
    try {
      if (previous) {
        const snapshot = captureProfileSnapshot(previous, {
          disciplines, mockTests, exerciseLogs, activityLogs, studyBlocks,
          weeklyHours, weeklyQuestions, weeklyReviews, examDate, examName,
        });
        await saveQueueRef.current.enqueue(`profiles/${currentUser.uid}/${snapshot.id}`, () =>
          setDoc(doc(db, 'users', currentUser.uid, 'profiles', snapshot.id),
            sanitizeForFirestore(snapshot), { merge: true })
        );
      }

      await saveQueueRef.current.enqueue(`profiles/${currentUser.uid}/${newProfile.id}`, () =>
        setDoc(doc(db, 'users', currentUser.uid, 'profiles', newProfile.id),
          sanitizeForFirestore(newProfile))
      );

      if (auth.currentUser?.uid !== currentUser.uid) {
        throw new Error('A sessão mudou durante a criação do plano.');
      }
      setProfiles(current => [
        ...current.map(p => p.id === previous?.id
          ? captureProfileSnapshot(p, {
            disciplines, mockTests, exerciseLogs, activityLogs, studyBlocks,
            weeklyHours, weeklyQuestions, weeklyReviews, examDate, examName,
          }) : p),
        newProfile,
      ]);
      setDisciplines(newProfile.disciplines);
      setMockTests(newProfile.mockTests);
      setExerciseLogs(newProfile.exerciseLogs);
      setActivityLogs(newProfile.activityLogs);
      setStudyBlocks(newProfile.studyBlocks);
      setWeeklyHours(newProfile.weeklyHours);
      setWeeklyQuestions(newProfile.weeklyQuestions);
      setWeeklyReviews(newProfile.weeklyReviews);
      setExamDate('');
      setExamName('');
      setActiveProfileId(newProfile.id);
      setActiveTab('disciplinas');
      setAutoOpenAddDiscipline(true);
      return true;
    } catch (cause) {
      failed = true;
      setSaveErrorMsg(cause instanceof Error ? cause.message : String(cause));
      alert('Não foi possível criar o plano com segurança. Seu plano atual foi preservado.');
      return false;
    } finally {
      finishSave(failed);
      profileSwitchInProgressRef.current = false;
    }
  };

  const handleDeleteProfile = async (id: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !profiles.some(p => p.id === id)) return;
    if (deletedProfileIdsRef.current.has(id)) return;

    try {
      // Firestore does not cascade deletions to nested error notebooks.
      const errorsRef = collection(db, 'users', userId, 'profiles', id, 'errors');
      const existingErrors = await getDocs(query(errorsRef, limit(1)));
      if (!existingErrors.empty) {
        alert('Este plano possui erros individuais. Exporte e exclua os registros do caderno antes de remover o plano.');
        return;
      }
    } catch (cause) {
      console.error('Erro conferindo o caderno do plano:', cause);
      alert('Não foi possível verificar os erros do plano. Exclusão cancelada por segurança.');
      return;
    }

    deletedProfileIdsRef.current.add(id);
    try {
      // Wait for all pending writes BEFORE deleting. Future autosaves for
      // this ID are blocked, so they cannot re-create the removed document.
      await saveQueueRef.current.whenIdle(`profiles/${userId}/${id}`);
      await deleteDoc(doc(db, 'users', userId, 'profiles', id));
    } catch (cause) {
      deletedProfileIdsRef.current.delete(id);
      console.error('Erro ao remover o perfil da nuvem:', cause);
      alert('Não foi possível excluir o plano do Firebase. Nenhum dado local foi removido.');
      return;
    }

    const filtered = profiles.filter(p => p.id !== id);
    setProfiles(current => current.filter(p => p.id !== id));

    if (activeProfileId === id) {
      const next = filtered[0];
      setDisciplines(next?.disciplines || []);
      setMockTests(next?.mockTests || []);
      setExerciseLogs(next?.exerciseLogs || []);
      setActivityLogs(next?.activityLogs || []);
      setStudyBlocks(next?.studyBlocks || []);
      setWeeklyHours(next?.weeklyHours || { done: 0, total: 24 });
      setWeeklyQuestions(next?.weeklyQuestions || { done: 0, total: 300 });
      setWeeklyReviews(next?.weeklyReviews || { done: 0, total: 60 });
      setExamDate(next?.examDate || '');
      setExamName(next?.examName || '');
      setActiveProfileId(next?.id || '');
    }
  };

  const handleUpdateProfileName = async (id: string, newName: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser || !isLoaded || profileSwitchInProgressRef.current ||
        !profiles.some(p => p.id === id) ||
        !newName.trim() || newName.length > 100 ||
        deletedProfileIdsRef.current.has(id)) return false;
    profileSwitchInProgressRef.current = true;
    beginSave();
    let failed = false;
    try {
      const ref = doc(db, 'users', currentUser.uid, 'profiles', id);
      // Serializes rename behind pending autosaves, even for inactive plans.
      await saveQueueRef.current.enqueue(`profiles/${currentUser.uid}/${id}`, () =>
        setDoc(ref, {name: newName.trim()}, {merge: true})
      );
      if (auth.currentUser?.uid !== currentUser.uid) {
        throw new Error('A sessão mudou durante a edição.');
      }
      setProfiles(prev => prev.map(p => p.id === id ? {...p, name: newName.trim()} : p));
      return true;
    } catch (cause) {
      failed = true;
      setSaveErrorMsg(cause instanceof Error ? cause.message : String(cause));
      alert('Não foi possível salvar o novo nome. O nome anterior foi preservado.');
      return false;
    } finally {
      finishSave(failed);
      profileSwitchInProgressRef.current = false;
    }
  };

  const handleUpdateExamInfo = (name: string, date: string) => {
    setExamName(name);
    setExamDate(date);
    // Force immediate local profiles update just to prevent any latency
    setProfiles(prev => prev.map(p => {
      if (p.id === activeProfileId) {
        return { ...p, examName: name, examDate: date };
      }
      return p;
    }));
  };

  const handleToggleStudyDay = (dateKey: string, newStatus: 'completed' | 'rest' | 'none') => {
    // First, remove any existing artificial logs for this date (so we don't duplicate or leave old ones)
    // Actually, when removing, we should remove ANY log for this date if it's 'none', OR just the artificial ones?
    // The previous logic removed ALL logs for that dateKey. Let's keep it simple:
    
    // Always clear the existing logs for that day if we are toggling, because we are overriding its state.
    // Wait, if a user studied organically, they might have real logs. 
    // Previous logic: `prev.filter(log => getLogDateKey(log) !== dateKey);` which deletes ALL real logs too! That's destructive.
    // Let's only remove 'manual' or 'rest' logs.
    setActivityLogs(prev => {
      const filtered = prev.filter(log => {
        const isSameDate = getLogDateKey(log) === dateKey;
        const isArtificial = log.disciplineName === 'Presença nos Estudos' || log.disciplineName === 'Dia de Descanso';
        // If we are setting to 'none', remove all artificial logs for that day.
        // If they had real logs, setting to 'none' will NOT remove them. (They shouldn't be able to remove real logs via the streak button anyway).
        return !(isSameDate && isArtificial);
      });

      if (newStatus === 'none') {
        return filtered;
      }

      const parts = dateKey.split('-');
      const logYear = parseInt(parts[0], 10);
      const logMonth = parseInt(parts[1], 10) - 1;
      const logDay = parseInt(parts[2], 10);
      const logDateObj = new Date(logYear, logMonth, logDay, 12, 0, 0);
      const nowMs = logDateObj.getTime();

      const newLog: ActivityLog = {
        id: `manual_log_${dateKey}_${Date.now()}`,
        disciplineName: newStatus === 'completed' ? 'Presença nos Estudos' : 'Dia de Descanso',
        timeSpentMin: newStatus === 'completed' ? 60 : 0,
        timestamp: 'Marcado Manualmente',
        details: newStatus === 'completed' ? 'Presença confirmada manualmente.' : 'Dia de descanso merecido.',
        colorClass: newStatus === 'completed' ? 'emerald' : 'blue',
        createdAtMs: nowMs,
        date: dateKey,
        questionsSolved: 0
      };

      return [newLog, ...filtered];
    });
  };

  // Handle Dark Mode toggle
  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // 1. Reminder interactions
  const handleAddReminder = (text: string, type: 'INSCRIÇÕES' | 'PROVAS' | 'GERAL', date: string) => {
    const newRem: Reminder = {
      id: `rem_${Date.now()}`,
      text,
      type,
      date,
      completed: false
    };
    setReminders([newRem, ...reminders]);
  };

  const handleToggleReminder = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  // 2. Discipline interactions
  const handleAddDiscipline = (newD: Omit<Discipline, 'id'>) => {
    const created: Discipline = {
      ...newD,
      id: `discipline_${Date.now()}`
    };
    setDisciplines([...disciplines, created]);
  };

  const handleUpdateDiscipline = (updated: Discipline) => {
    setDisciplines(discs => discs.map(d => d.id === updated.id ? updated : d));
  };

  const handleImportOutline = (outline: OutlineInput) => {
    // Merge against CURRENT state, not a stale snapshot from the importer preview.
    // Previously registered discipline/topic IDs, logs and progress are preserved.
    setDisciplines(current => previewOutlineMerge(current, outline).disciplines);
  };

  const handleApplyPriorityEvidence = (evidence: PriorityEvidenceImport,
    assignments: PriorityAssignment[]) => {
    // Functional state update preserves unrelated discipline/topic metadata,
    // sessions, logs and progress even when another change is pending.
    setDisciplines(current => previewPriorityAssignments(current, evidence, assignments).disciplines);
  };

  const handleDeleteDiscipline = (id: string) => {
    setDisciplines(disciplines.filter(d => d.id !== id));
  };

  // 3. Calendar Study Block interactions
  const handleAddStudyBlock = (newB: Omit<StudyBlock, 'id'>) => {
    const created: StudyBlock = {
      ...newB,
      id: `block_${Date.now()}`
    };
    setStudyBlocks([...studyBlocks, created]);
  };

  const handleDeleteStudyBlock = (id: string) => {
    setStudyBlocks(studyBlocks.filter(b => b.id !== id));
  };

  const handleToggleStudyBlock = (id: string) => {
    setStudyBlocks(studyBlocks.map(b => b.id === id ? { ...b, completed: !b.completed } : b));
  };

  const handleImportDiscipline = (disc: Discipline) => {
    const exists = disciplines.some(d => d.name.toLowerCase().trim() === disc.name.toLowerCase().trim());
    if (exists) return;
    setDisciplines([...disciplines, disc]);
  };

  const handleImportBatchDisciplines = (discs: Discipline[]) => {
    const absentDiscs = discs.filter(
      newD => !disciplines.some(d => d.name.toLowerCase().trim() === newD.name.toLowerCase().trim())
    );
    if (absentDiscs.length === 0) return;
    setDisciplines([...disciplines, ...absentDiscs]);
  };

  // 4. Mock test score log interactions
  const handleAddMockTest = (newT: Omit<MockTest, 'id'>) => {
    const created: MockTest = {
      ...newT,
      id: `test_${Date.now()}`
    };
    setMockTests([created, ...mockTests]);
    
    // Auto-create ActivityLog so current week questions progress is calculated cleanly
    const nowMs = Date.now();
    const logDate = getLocalDateString(new Date(nowMs));
    const newActivity: ActivityLog = {
      id: `log_mock_${nowMs}`,
      disciplineName: `Simulado: ${newT.name}`,
      timeSpentMin: 0,
      timestamp: 'Agora mesmo',
      details: `Simulado concluído (${newT.correctAnswers}/${newT.totalQuestions} acertos)`,
      colorClass: 'rose',
      createdAtMs: nowMs,
      date: logDate,
      questionsSolved: newT.totalQuestions || newT.correctAnswers,
      correctAnswers: newT.correctAnswers,
      wrongAnswers: (newT.totalQuestions || 0) - (newT.correctAnswers || 0),
      studyType: 'Simulado'
    };
    setActivityLogs(prev => [newActivity, ...prev]);
  };

  const handleDeleteMockTest = (id: string) => {
    setMockTests(mockTests.filter(t => t.id !== id));
  };

  const handleAddExerciseLog = (newLog: Omit<ExerciseLog, 'id' | 'date'>, shouldCreateTopic?: boolean) => {
    const nowMs = Date.now();
    const today = new Date(nowMs);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const formattedDate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    // Resolve the ID BEFORE updating React state. The old implementation
    // mutated finalTopicId inside a state setter; that updater may run later,
    // creating an exercise log with a stale topic reference.
    const currentDiscipline = disciplines.find(d => d.id === newLog.disciplineId);
    const existingTopic = shouldCreateTopic
      ? currentDiscipline?.topics.find(t =>
          t.name.trim().toLocaleLowerCase('pt-BR') === newLog.topicName.trim().toLocaleLowerCase('pt-BR'))
      : undefined;
    const finalTopicId = existingTopic?.id || newLog.topicId;

    setDisciplines(current => current.map(d => {
      if (d.id !== newLog.disciplineId) return d;
      const hasTopic = d.topics.some(t => t.id === finalTopicId ||
        (shouldCreateTopic && t.name.trim().toLocaleLowerCase('pt-BR') === newLog.topicName.trim().toLocaleLowerCase('pt-BR')));
      const updatedTopics = shouldCreateTopic && !hasTopic
        ? [...d.topics, { id: finalTopicId, name: newLog.topicName, completed: false }]
        : d.topics;
      return {
        ...d,
        topics: updatedTopics,
        topicsTotal: updatedTopics.length,
        correctAnswers: d.correctAnswers + newLog.correctAnswers,
        wrongAnswers: d.wrongAnswers + newLog.wrongAnswers
      };
    }));

    const created: ExerciseLog = {
      ...newLog,
      id: `exlog_${nowMs}_${Math.random().toString(36).slice(2, 8)}`,
      topicId: finalTopicId,
      createdAtMs: nowMs,
      date: formattedDate
    };
    setExerciseLogs(current => [created, ...current]);

    const newActivity: ActivityLog = {
      id: `log_ex_${nowMs}_${Math.random().toString(36).slice(2, 8)}`,
      disciplineName: newLog.disciplineName,
      timeSpentMin: 0,
      timestamp: 'Agora mesmo',
      details: `Resolveu ${newLog.questionsCount} questões (${newLog.correctAnswers} acertos / ${newLog.wrongAnswers} erros) - Tópico: ${newLog.topicName}`,
      colorClass: 'purple',
      createdAtMs: nowMs,
      date: getLocalDateString(today),
      questionsSolved: newLog.questionsCount,
      topicId: finalTopicId,
      correctAnswers: newLog.correctAnswers,
      wrongAnswers: newLog.wrongAnswers,
      studyType: 'Questões'
    };
    setActivityLogs(current => [newActivity, ...current]);
  };

  const handleDeleteExerciseLog = (logId: string) => {
    const targetLog = exerciseLogs.find(l => l.id === logId);
    if (!targetLog) return;
    
    setExerciseLogs(prev => prev.filter(l => l.id !== logId));
    
    setDisciplines(discs => discs.map(d => {
      if (d.id === targetLog.disciplineId) {
        return {
          ...d,
          correctAnswers: Math.max(0, d.correctAnswers - targetLog.correctAnswers),
          wrongAnswers: Math.max(0, d.wrongAnswers - targetLog.wrongAnswers)
        };
      }
      return d;
    }));

    setWeeklyQuestions(prev => ({
      ...prev,
      done: Math.max(0, prev.done - targetLog.questionsCount)
    }));
  };

  const handleDeleteActivityLog = (logId: string) => {
    const targetLog = activityLogs.find(l => l.id === logId);
    if (!targetLog) return;

    // 1) Filter out the activity log
    setActivityLogs(prev => prev.filter(l => l.id !== logId));

    // 2) Update discipline totals (time spent, correct/wrong answers)
    setDisciplines(discs => discs.map(d => {
      if (d.name.trim().toLowerCase() === targetLog.disciplineName.trim().toLowerCase()) {
        return {
          ...d,
          timeSpentMin: Math.max(0, d.timeSpentMin - targetLog.timeSpentMin),
          correctAnswers: Math.max(0, d.correctAnswers - (targetLog.correctAnswers || 0)),
          wrongAnswers: Math.max(0, d.wrongAnswers - (targetLog.wrongAnswers || 0))
        };
      }
      return d;
    }));

    // 3) Deduct from weekly goals
    if (targetLog.studyType === 'Revisão') {
      setWeeklyReviews(prev => ({
        ...prev,
        done: Math.max(0, prev.done - 1)
      }));
    }
    
    const questionsSolved = targetLog.questionsSolved || ((targetLog.correctAnswers || 0) + (targetLog.wrongAnswers || 0));
    if (questionsSolved > 0) {
      setWeeklyQuestions(prev => ({
        ...prev,
        done: Math.max(0, prev.done - questionsSolved)
      }));
    }
  };

  const handleUpdateDisciplineTime = (disciplineId: string, newTimeMin: number) => {
    let diffMin = 0;
    let targetDiscName = 'Estudo Geral';

    setDisciplines(discs => discs.map(d => {
      if (d.id === disciplineId) {
        diffMin = newTimeMin - d.timeSpentMin;
        targetDiscName = d.name;
        return {
          ...d,
          timeSpentMin: Math.max(0, newTimeMin)
        };
      }
      return d;
    }));

    // Sync activity logs if time was manually increased
    if (diffMin > 0) {
      const nowMs = Date.now();
      const logDate = getLocalDateString(new Date(nowMs));
      const newLog: ActivityLog = {
        id: `log_adjust_${nowMs}`,
        disciplineName: targetDiscName,
        timeSpentMin: diffMin,
        timestamp: 'Agora mesmo',
        details: `Ajuste de horas (+${formatMinutes(diffMin)})`,
        colorClass: 'emerald',
        createdAtMs: nowMs,
        date: logDate,
        studyType: 'Teoria',
        correctAnswers: 0,
        wrongAnswers: 0,
        questionsSolved: 0
      };
      setActivityLogs(prev => [newLog, ...prev]);
    }
  };

  const handleUpdateWeeklyGoals = (hoursTotal: number, questionsTotal: number, hoursDone?: number, questionsDone?: number) => {
    // Calculate current week totals from activity logs
    let currentWeekMinutes = 0;
    let currentWeekQuestions = 0;
    activityLogs.forEach(log => {
      if (log.disciplineName === 'Dia de Descanso') return;
      const logDateOrMs = log.date || log.createdAtMs;
      if (logDateOrMs && isDateInCurrentWeek(logDateOrMs)) {
        currentWeekMinutes += log.timeSpentMin || 0;
        const qCount = log.questionsSolved !== undefined 
          ? log.questionsSolved 
          : ((log.correctAnswers || 0) + (log.wrongAnswers || 0));
        currentWeekQuestions += qCount;
      }
    });

    const targetMinutes = typeof hoursDone === 'number' ? hoursDone * 60 : currentWeekMinutes;
    const targetQuestions = typeof questionsDone === 'number' ? questionsDone : currentWeekQuestions;

    const diffMinutes = targetMinutes - currentWeekMinutes;
    const diffQuestions = targetQuestions - currentWeekQuestions;

    if (Math.abs(diffMinutes) > 0.1 || diffQuestions !== 0) {
      const nowMs = Date.now();
      const logDate = getLocalDateString(new Date(nowMs));
      const adjustLog: ActivityLog = {
        id: `log_adjust_goals_${nowMs}`,
        disciplineName: 'Ajuste de Metas',
        timeSpentMin: Math.max(0, diffMinutes),
        timestamp: 'Agora mesmo',
        details: 'Ajuste manual das metas de estudo da semana',
        colorClass: 'emerald',
        createdAtMs: nowMs,
        date: logDate,
        questionsSolved: Math.max(0, diffQuestions),
        studyType: 'Teoria'
      };
      setActivityLogs(prev => [adjustLog, ...prev]);
    }

    setWeeklyHours({
      done: typeof hoursDone === 'number' ? hoursDone : weeklyHours.done,
      total: hoursTotal
    });
    setWeeklyQuestions({
      done: typeof questionsDone === 'number' ? questionsDone : weeklyQuestions.done,
      total: questionsTotal
    });
  };

  // 5. stopwatch STUDY CHRONOMETER SESSION LOGGING INTERACTION callback
  const handleLogStudyTime = (disciplineId: string, minutes: number, details: string) => {
    // 1) Update target discipline timeSpentMin
    setDisciplines(discs => discs.map(d => {
      if (d.id === disciplineId) {
        return {
          ...d,
          timeSpentMin: d.timeSpentMin + minutes
        };
      }
      return d;
    }));

    // 2) Update weekly hours completed
    setWeeklyHours(hours => ({
      ...hours,
      done: Math.min(hours.total, hours.done + (minutes / 60))
    }));

    // 3) Create a fresh Activity Log timeline feed
    const targetDiscName = disciplines.find(d => d.id === disciplineId)?.name || 'Estudo Geral';
    const nowMs = Date.now();
    const logDate = getLocalDateString(new Date(nowMs));
    const newLog: ActivityLog = {
      id: `log_${nowMs}`,
      disciplineName: targetDiscName,
      timeSpentMin: minutes,
      timestamp: 'Agora mesmo',
      details: details,
      colorClass: 'emerald',
      createdAtMs: nowMs,
      date: logDate,
      studyType: 'Teoria',
      correctAnswers: 0,
      wrongAnswers: 0,
      questionsSolved: 0
    };
    setActivityLogs(current => [newLog, ...current]);
  };

  const handleLogStudySession = (session: {
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
  }) => {
    const totalMin = (session.hours * 60) + session.minutes;

    // 1. Update studied hours, topics & optionally question scores on the target discipline
    setDisciplines(discs => discs.map(d => {
      if (d.id === session.disciplineId) {
        let updatedTopics = d.topics;
        if (session.topicId && session.concludeTopic) {
          updatedTopics = d.topics.map(t =>
            t.id === session.topicId ? { ...t, completed: true } : t
          );
        }
        return {
          ...d,
          topics: updatedTopics,
          topicsTotal: updatedTopics.length,
          topicsDone: updatedTopics.filter(t => t.completed).length,
          timeSpentMin: d.timeSpentMin + totalMin,
          correctAnswers: d.correctAnswers + (session.correct || 0),
          wrongAnswers: d.wrongAnswers + (session.wrong || 0)
        };
      }
      return d;
    }));

    // 2. Update weekly hours done
    setWeeklyHours(hours => ({
      ...hours,
      done: Math.min(hours.total, hours.done + (totalMin / 60))
    }));

    // 3. Create a Timeline Activity Log
    const targetDisc = disciplines.find(d => d.id === session.disciplineId);
    const targetDiscName = targetDisc?.name || 'Estudo Geral';
    
    let descriptionText = `Estudou ${session.type} por ${formatMinutes(totalMin)} usando ${session.material}.`;
    if (session.correct !== undefined || session.wrong !== undefined) {
      const qTotal = (session.correct || 0) + (session.wrong || 0);
      if (qTotal > 0) {
        descriptionText += ` Resolveu ${qTotal} questões (${session.correct} acertos / ${session.wrong} erros).`;
      }
    }
    if (session.notes) {
      descriptionText += ` Obs: "${session.notes}"`;
    }

    const activityColorMap = {
      'Teoria': 'blue',
      'Questões': 'emerald',
      'Revisão': 'purple',
      'Simulado': 'rose'
    };

    const nowMs = Date.now();
    let logDate = getLocalDateString(new Date(nowMs));
    let logCreatedAtMs = nowMs;
    let timestampText = 'Agora mesmo';

    if (session.date) {
      logDate = session.date;
      const parsedDate = new Date(session.date + 'T12:00:00');
      logCreatedAtMs = parsedDate.getTime();
      
      const todayDate = new Date();
      const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
      
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

      if (session.date === todayStr) {
        timestampText = 'Agora mesmo';
      } else if (session.date === yesterdayStr) {
        timestampText = 'Ontem';
      } else {
        const parts = session.date.split('-');
        if (parts.length === 3) {
          timestampText = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          timestampText = session.date;
        }
      }
    }

    const newActivity: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      disciplineName: targetDiscName,
      timeSpentMin: totalMin,
      timestamp: timestampText,
      details: descriptionText,
      colorClass: activityColorMap[session.type] || 'emerald',
      createdAtMs: logCreatedAtMs,
      date: logDate,
      questionsSolved: (session.correct || 0) + (session.wrong || 0),
      topicId: session.topicId,
      studyType: session.type,
      correctAnswers: session.correct || 0,
      wrongAnswers: session.wrong || 0
    };
    setActivityLogs(prev => [newActivity, ...prev].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)));

    // Update weekly goals count if revision is completed
    if (session.type === 'Revisão') {
      setWeeklyReviews(prev => ({
        ...prev,
        done: Math.min(prev.total, prev.done + 1)
      }));
    }

    // 4. Create an ExerciseLog entry if questions were solved
    const totalQuestions = (session.correct || 0) + (session.wrong || 0);
    if (totalQuestions > 0) {
      const today = new Date();
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const formattedDate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

      // Pick a topic from the discipline, or use a default one like "Estudo Geral" or the first topic
      let topicId = session.topicId || 'generic';
      let topicName = 'Geral';
      if (targetDisc) {
        if (session.topicId) {
          const matchedTopic = targetDisc.topics.find(t => t.id === session.topicId);
          if (matchedTopic) {
            topicName = matchedTopic.name;
          }
        } else if (targetDisc.topics.length > 0) {
          topicId = targetDisc.topics[0].id;
          topicName = targetDisc.topics[0].name;
        }
      }

      const calculatedPct = Math.round(((session.correct || 0) / totalQuestions) * 100);

      const newExLog: ExerciseLog = {
        id: `exlog_${Date.now()}`,
        disciplineId: session.disciplineId,
        disciplineName: targetDiscName,
        topicId: topicId,
        topicName: topicName,
        questionsCount: totalQuestions,
        accuracyPercent: calculatedPct,
        correctAnswers: session.correct || 0,
        wrongAnswers: session.wrong || 0,
        notes: session.notes || '',
        difficulty: calculatedPct >= 85 ? 'Baixa' : calculatedPct >= 70 ? 'Média' : 'Alta',
        date: formattedDate
      };

      setExerciseLogs(prev => [newExLog, ...prev]);

      // Update weekly questions done count
      setWeeklyQuestions(prev => ({
        ...prev,
        done: Math.min(prev.total, prev.done + totalQuestions)
      }));
    }
  };

  // Mock global header search response
  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    if (searchTerm.toLowerCase().includes('simulado')) {
      setActiveTab('simulados');
    } else if (searchTerm.toLowerCase().includes('materia') || searchTerm.toLowerCase().includes('disciplina')) {
      setActiveTab('disciplinas');
    } else if (searchTerm.toLowerCase().includes('plano') || searchTerm.toLowerCase().includes('agenda') || searchTerm.toLowerCase().includes('cronograma')) {
      setActiveTab('planejamento');
    } else {
      setActiveTab('inicio');
      alert(`Buscando por "${searchTerm}"...`);
    }
  };

  // Simple Page Title Selector
  const getPageTitle = () => {
    switch (activeTab) {
      case 'inicio': return 'Início';
      case 'planos': return 'Planos';
      case 'disciplinas': return 'Disciplinas';
      case 'planejamento': return 'Planejamento';
      case 'simulados': return 'Simulados e Questões';
      default: return 'Estudei';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 size={40} className="text-primary animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Carregando painel de estudos...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  const pendingReminders = reminders.filter(r => !r.completed);
  const hasActiveNotifications = pendingReminders.length > 0 || (!!examDate && !!examName);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      
      {/* 240px Fixed Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onLogout={handleLogout}
      />

      {/* Main Content Area flow pane */}
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen relative">
        
        {/* Top bar Header */}
        <header className="h-16 w-full sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200/65 dark:border-slate-800 flex justify-between items-center px-6">
          
          <div className="flex items-center gap-4">
            {/* Hamburger menu for small devices */}
            <button 
              type="button" 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            
            {/* Display title badge */}
            <div className="md:hidden flex items-center gap-2">
              <School size={20} className="text-primary fill-primary/10" />
              <span className="font-display font-black text-slate-800 dark:text-white text-base tracking-tight leading-none">Estudei</span>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <h2 className="font-display font-black text-lg text-slate-800 dark:text-white leading-none mr-2">
                {getPageTitle()}
              </h2>
              <span className="text-slate-200 dark:text-slate-800 font-light">|</span>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-855 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Objetivo:</span>
                <select
                  value={activeProfileId}
                  onChange={(e) => handleSwitchProfile(e.target.value)}
                  className="bg-transparent border-none text-[11px] font-black uppercase text-primary dark:text-indigo-400 focus:outline-none cursor-pointer tracking-wider mr-1 pr-6"
                >
                  {profiles.length === 0 ? (
                    <option value="" className="dark:bg-slate-900 dark:text-white">Sem Plano</option>
                  ) : (
                    profiles.map(p => (
                      <option key={p.id} value={p.id} className="dark:bg-slate-900 dark:text-white">
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Search Bar Input */}
            <form onSubmit={handleGlobalSearchSubmit} className="hidden sm:flex relative mr-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={15} />
              </span>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar simulados, matérias..." 
                className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-full text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-52 focus:w-64 transition-all"
              />
            </form>

            {/* Live Cloud Save Status Indicator */}
            {user && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-colors"
                title={saveStatus === 'error' ? saveErrorMsg : 'Seu progresso é salvo automaticamente na nuvem Firebase'}
              >
                {saveStatus === 'saving' && (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">Salvando...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-emerald-600 dark:text-emerald-400">Nuvem Ativa</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-rose-600 dark:text-rose-450 hover:underline cursor-help">Erro de Conexão</span>
                  </>
                )}
              </div>
            )}

            <BackupButton canExport={isLoaded && saveStatus === 'saved'} />

            {/* Help Quick Reference button */}
            <button 
              type="button" 
              onClick={() => alert('Dúvidas na plataforma? Fale com nossa equipe pelo suporte. Seu progresso do edital é sincronizado em tempo real!')}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Ajuda"
            >
              <HelpCircle size={18} />
            </button>

            {/* Notification triggers bell badge */}
            <div className="relative">
              <button 
                type="button" 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer relative"
                title="Notificações"
              >
                <Bell size={18} />
                {hasActiveNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                )}
              </button>

              {/* Notifications Dropdown panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-72 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-4">
                  <h4 className="font-display font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2">Alertas & Lembretes</h4>
                  
                  {!hasActiveNotifications ? (
                    <div className="py-4 text-center text-slate-400 dark:text-slate-500">
                      <p className="text-xs">✨ Tudo em dia!</p>
                      <span className="text-[10px] mt-1 block">Nenhuma notificação pendente.</span>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                      {examDate && examName && (
                        <div className="pt-2 text-xs leading-relaxed">
                          <p className="font-bold text-slate-700 dark:text-slate-200">📅 Prova Agendada</p>
                          <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                            {examName} — <span className="font-semibold text-primary">{examDate}</span>
                          </p>
                        </div>
                      )}
                      {pendingReminders.map((rem) => (
                        <div key={rem.id} className="pt-2 text-xs leading-relaxed">
                          <p className="font-bold text-slate-700 dark:text-slate-200">
                            🔔 {rem.text}
                          </p>
                          <p className="text-slate-400 text-[10px] mt-0.5 flex justify-between">
                            <span>{rem.type}</span>
                            <span className="font-medium">{rem.date}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* HTML Class dark theme controller */}
            <button 
              type="button" 
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title={isDarkMode ? 'Tema Claro' : 'Tema Escuro'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Dynamic User Initials & Logout */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-display font-black text-xs text-primary dark:text-emerald-400 capitalize">
                {user?.displayName ? user.displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('') : 'ES'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 max-w-[120px] truncate">{user?.displayName || 'Estudante'}</span>
                <span className="text-[9px] text-slate-400 font-mono font-medium max-w-[120px] truncate">{user?.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-wider px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                title="Sair da conta com segurança"
              >
                Sair
              </button>
            </div>

          </div>

        </header>

        {/* Dynamic Canvas switcher based on activeTab */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'inicio' && (
            <DashboardHome 
              disciplines={disciplines}
              reminders={reminders}
              onAddReminder={handleAddReminder}
              onToggleReminder={handleToggleReminder}
              onDeleteReminder={handleDeleteReminder}
              activityLogs={activityLogs}
              exerciseLogs={exerciseLogs}
              onDeleteActivityLog={handleDeleteActivityLog}
              onUpdateDisciplineTime={handleUpdateDisciplineTime}
              onUpdateWeeklyGoals={handleUpdateWeeklyGoals}
              weeklyGoalsHours={weeklyHours}
              weeklyGoalsQuestions={weeklyQuestions}
              weeklyGoalsReviews={weeklyReviews}
              onAddStudySession={handleLogStudySession}
              activeProfileName={profiles.find(p => p.id === activeProfileId)?.name || ''}
              profilesCount={profiles.length}
              onCreateProfile={handleCreateProfile}
              examDate={examDate}
              examName={examName}
              onUpdateExamInfo={handleUpdateExamInfo}
              onToggleStudyDay={handleToggleStudyDay}
              activeProfileCreatedAt={profiles.find(p => p.id === activeProfileId)?.createdAt || ''}
              userCreatedAt={user?.metadata?.creationTime || ''}
            />
          )}

          {activeTab === 'planos' && (
            <PlanosManager 
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSwitchProfile={handleSwitchProfile}
              onCreateProfile={handleCreateProfile}
              onDeleteProfile={handleDeleteProfile}
              onUpdateProfileName={handleUpdateProfileName}
            />
          )}

          {activeTab === 'disciplinas' && (
            <DisciplinasList 
              disciplines={disciplines}
              onAddDiscipline={handleAddDiscipline}
              onDeleteDiscipline={handleDeleteDiscipline}
              onUpdateDiscipline={handleUpdateDiscipline}
              onImportOutline={handleImportOutline}
              onPriorityEvidence={handleApplyPriorityEvidence}
              exerciseLogs={exerciseLogs}
              activityLogs={activityLogs}
              onAddExerciseLog={handleAddExerciseLog}
              onDeleteExerciseLog={handleDeleteExerciseLog}
              autoOpenAddModal={autoOpenAddDiscipline}
              onResetAutoOpen={() => setAutoOpenAddDiscipline(false)}
            />
          )}

          {activeTab === 'erros' && (
            activeProfileId ? (
              <ErrorNotebook profileId={activeProfileId} disciplines={disciplines} />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                Crie ou selecione um plano de estudos para utilizar o caderno de erros.
              </div>
            )
          )}

          {activeTab === 'planejamento' && (
            <PlanejamentoSchedule 
              studyBlocks={studyBlocks}
              onAddStudyBlock={handleAddStudyBlock}
              onDeleteStudyBlock={handleDeleteStudyBlock}
              onToggleStudyBlock={handleToggleStudyBlock}
              onSetStudyBlocks={setStudyBlocks}
              disciplines={disciplines}
              onLogStudyTime={handleLogStudyTime}
            />
          )}

          {activeTab === 'simulados' && (
            <SimuladosQuestoes 
              mockTests={mockTests}
              onAddMockTest={handleAddMockTest}
              onDeleteMockTest={handleDeleteMockTest}
            />
          )}

          {/* Backup static placeholders for secondary menu links */}
          {!['inicio', 'planos', 'disciplinas', 'planejamento', 'simulados'].includes(activeTab) && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto mt-12 shadow-xs">
              <span className="mx-auto w-14 h-14 bg-emerald-500/5 text-primary rounded-full flex items-center justify-center">
                <Sparkles size={28} />
              </span>
              <h3 className="font-display font-black text-lg text-slate-800 dark:text-white uppercase tracking-wider">Módulo em Desenvolvimento</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                As telas Início, Disciplinas, Planejamento e Simulados estão 100% ativas! Este link de apoio ({activeTab.toUpperCase()}) está planejado para ser integrado na próxima versão da trilha de sucesso Estudei.
              </p>
              <button 
                type="button" 
                onClick={() => setActiveTab('inicio')}
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer inline-block"
              >
                Voltar ao Início
              </button>
            </div>
          )}
        </main>

      </div>

    </div>
  );
}
