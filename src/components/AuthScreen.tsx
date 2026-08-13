import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { sanitizeForFirestore } from '../utils';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CornerDownLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { 
  INITIAL_DISCIPLINES, 
  INITIAL_MOCK_TESTS, 
  INITIAL_EXERCISE_LOGS, 
  INITIAL_ACTIVITY_LOGS, 
  INITIAL_STUDY_BLOCKS 
} from '../data';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper to translate Firebase errors to friendly Portuguese words
  const getFriendlyErrorMessage = (err: any) => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'E-mail ou senha incorretos. Por favor, verifique seus dados.';
      case 'auth/email-already-in-use':
        return 'Este endereço de e-mail já está sendo utilizado por outra conta.';
      case 'auth/invalid-email':
        return 'O endereço de e-mail inserido não é válido.';
      case 'auth/weak-password':
        return 'A senha digitada é muito fraca. Digite pelo menos 6 caracteres.';
      case 'auth/missing-password':
        return 'Por favor, digite sua senha.';
      case 'auth/user-disabled':
        return 'Esta conta de usuário foi desativada por um administrador.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas malsucedidas. Tente novamente mais tarde.';
      case 'auth/operation-not-allowed':
        return 'O provedor de autenticação "E-mail e Senha" está desativado no console do Firebase para este projeto.';
      default:
        return err?.message || 'Ocorreu um erro inesperado. Tente novamente.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onAuthSuccess();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Create auth user credentials
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Set profile display name
      await updateProfile(user, { displayName: name.trim() });

      // 3. Create user document in Firestore `/users/{userId}`
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userDocRef, sanitizeForFirestore({
          name: name.trim(),
          email: email.trim(),
          activeProfileId: '',
          reminders: [],
          createdAt: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        }));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, `users/${user.uid}`);
      }

      setSuccessMessage('Conta cadastrada com sucesso!');
      setTimeout(() => {
        onAuthSuccess();
      }, 800);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Insira seu endereço de e-mail cadastrado.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage('E-mail de recuperação de senha enviado! Verifique sua caixa de entrada.');
      setEmail('');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row items-stretch overflow-hidden">
      
      {/* Decorative branding sidebar - Desktop only */}
      <div className="hidden lg:flex lg:w-5/12 bg-primary relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-primary/50 to-primary-hover opacity-90 z-0"></div>
        
        {/* Subtle glowing graphics */}
        <div className="absolute top-1/4 -left-12 w-64 h-64 bg-primary-light/20 rounded-full blur-2xl z-0"></div>
        <div className="absolute bottom-1/4 -right-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl z-0"></div>
        
        <div className="z-10 flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 backdrop-blur-md shadow-inner">
            <GraduationCap size={28} className="text-white fill-white/10" />
          </div>
          <span className="font-display font-black text-2xl tracking-tight leading-none text-white">Estudei</span>
        </div>

        <div className="z-10 space-y-6 max-w-md">
          <div className="bg-white/10 border border-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 text-[11px] font-black tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-primary-light animate-pulseUnified"></span>
            Plataforma Inteligente de Concursos
          </div>
          <h1 className="font-display font-extrabold text-3xl xl:text-4xl leading-tight uppercase tracking-wide">
            Organize seu edital e domine seus estudos.
          </h1>
          <p className="text-emerald-100 font-medium text-sm leading-relaxed">
            Plataforma individual com cronogramas, métricas em tempo real, resoluções de questões, simulados estruturados e múltiplos perfis de concursos para maximizar seus acertos.
          </p>
        </div>

        <div className="z-10 border-t border-white/10 pt-6 text-[10px] text-emerald-200/70 font-mono tracking-wider uppercase flex justify-between">
          <span>Segurança Ponta a Ponta</span>
          <span>Início Imediato</span>
        </div>
      </div>

      {/* Main card box section */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 relative z-10">
        
        {/* Small header logo for mobile screens */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
            <GraduationCap size={22} className="text-primary" />
          </div>
          <span className="font-display font-black text-xl tracking-tight text-slate-800 dark:text-white">Estudei</span>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
          
          {/* Form titles */}
          <div className="space-y-1.5">
            {activeTab === 'login' && (
              <>
                <h2 className="font-display font-black text-lg text-slate-800 dark:text-white uppercase tracking-wider">Acesse sua Conta</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Insira suas credenciais para continuar sua jornada de estudos.</p>
              </>
            )}
            {activeTab === 'register' && (
              <>
                <h2 className="font-display font-black text-lg text-slate-800 dark:text-white uppercase tracking-wider">Crie seu Perfil</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Faça seu cadastro para organizar e salvar seu progresso individual de forma segura.</p>
              </>
            )}
            {activeTab === 'forgot' && (
              <>
                <h2 className="font-display font-black text-lg text-slate-800 dark:text-white uppercase tracking-wider">Recuperação de Senha</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Informe seu e-mail cadastrado para redefinir as credenciais de acesso.</p>
              </>
            )}
          </div>

          {/* Form Selector Tabs (Only on Login/Register) */}
          {activeTab !== 'forgot' && (
            <div className="flex bg-slate-100 dark:bg-slate-855 rounded-xl p-1 border border-slate-200/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg uppercase tracking-wider cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Iniciar Sessão
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg uppercase tracking-wider cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Cadastrar-se
              </button>
            </div>
          )}

          {/* Alerts / Error feedback panels */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-medium p-3 rounded-lg border border-rose-300/30 flex flex-col gap-2 animate-shake">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
              {error.includes('E-mail e Senha') || error.includes('operation-not-allowed') ? (
                <div className="mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-normal leading-relaxed space-y-1.5 shadow-sm">
                  <p className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[9px]">Como ativar em 1 minuto:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Acesse o seu <strong className="font-semibold text-slate-900 dark:text-white text-[11px]">Firebase Console</strong> do projeto correspondente.</li>
                    <li>No menu lateral esquerdo, clique na aba <strong className="font-semibold text-slate-900 dark:text-white text-[11px]">Authentication</strong>.</li>
                    <li>Acesse a segunda aba superior chamada <strong className="font-semibold text-slate-900 dark:text-white text-[11px]">Sign-in method</strong>.</li>
                    <li>Clique no botão azul <strong className="font-semibold text-slate-900 dark:text-white text-[11px]">Add new provider</strong> (ou clique direto sobre <strong className="font-semibold text-slate-900 dark:text-white text-[11px]">E-mail/senha</strong> se estiver listado).</li>
                    <li>Marque como <strong className="font-semibold text-slate-900 dark:text-white text-[11px]">Enable / Ativo</strong> no primeiro interruptor para habilitar o login e cadastro por e-mail e clique em <strong className="font-semibold text-slate-900 dark:text-white text-[11px]">Save / Salvar</strong>.</li>
                  </ol>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">Pronto! Depois de salvar no Firebase, recarregue esta janela e tente se cadastrar novamente.</p>
                </div>
              ) : null}
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium p-3 rounded-lg border border-emerald-300/30 flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-transparent dark:text-white rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('forgot');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[10px] font-bold text-primary dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Sua senha secreta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-transparent dark:text-white rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/60 text-white font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm shadow-primary/20 outline-none"
              >
                {loading ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  <>
                    Entrar no Painel
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-transparent dark:text-white rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="exemplo@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-transparent dark:text-white rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Senha (Mínimo 6 dígitos)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Crie sua senha de estudos"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-transparent dark:text-white rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha de estudos"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-transparent dark:text-white rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/60 text-white font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm shadow-primary/20 outline-none"
              >
                {loading ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  <>
                    Registrar e Começar
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="informe@seuemail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-transparent dark:text-white rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/60 text-white font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm outline-none"
              >
                {loading ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="w-full text-slate-500 hover:text-slate-850 dark:hover:text-white text-xs font-semibold py-1 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CornerDownLeft size={13} />
                Voltar para o Login
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
