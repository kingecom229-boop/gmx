import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Logo } from '@/components/Icon';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';

export function LoginPage(): JSX.Element {
  const { user, role, signIn, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordState, setPasswordState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const isRecoveryLink = hash.includes('type=recovery');

  useEffect(() => {
    if (isRecoveryLink) setRecoveryMode(true);
  }, [isRecoveryLink]);

  useSeo({ title: 'Connexion administration', description: 'Accès réservé.', path: '/admin/login', noindex: true });

  if (!configured) {
    return (
      <Shell>
        <Alert tone="warning" title="Configuration manquante">
          Renseignez <code className="font-mono text-xs">VITE_SUPABASE_URL</code> et{' '}
          <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> dans le fichier <code>.env</code>, puis
          relancez le serveur de développement.
        </Alert>
      </Shell>
    );
  }

  // Un utilisateur sans rôle administrateur ne doit pas rester sur la page de connexion.
  if (user && role !== 'admin' && role !== 'commercial' && !recoveryMode) {
    return (
      <Shell>
        <Alert tone="danger" title="Compte sans droits d'administration">
          Ce compte existe mais ne dispose d'aucun rôle d'administration. Le rôle est attribué côté serveur lors de la
          création du compte (script <code className="font-mono text-xs">npm run admin:create</code>) : il ne peut pas
          être obtenu depuis le site.
        </Alert>
      </Shell>
    );
  }

  if (user && !recoveryMode) {
    return <Navigate to={from} replace />;
  }

  const submitLogin = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? 'Connexion impossible.');
      return;
    }
    navigate(from, { replace: true });
  };

  const submitRecovery = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (!supabase) return;
    setSubmitting(true);
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/admin/login`,
    });
    setSubmitting(false);
    if (recoveryError) {
      setError("Impossible d'envoyer le lien de réinitialisation. Vérifiez la configuration e-mail de Supabase.");
      return;
    }
    setRecoverySent(true);
  };

  const submitNewPassword = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);
    if (!supabase) return;

    if (newPassword.length < 12) {
      setPasswordError('Le mot de passe doit contenir au moins 12 caractères.');
      return;
    }

    setPasswordState('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPasswordState('error');
      setPasswordError(updateError.message);
      return;
    }
    setPasswordState('done');
    window.setTimeout(() => navigate('/admin', { replace: true }), 1200);
  };

  if (recoveryMode) {
    return (
      <Shell>
        <h1 className="text-2xl">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-ink-600">
          Choisissez un mot de passe d'au moins 12 caractères. Il sera demandé à chaque connexion.
        </p>

        {passwordState === 'done' ? (
          <div className="mt-6">
            <Alert tone="success" title="Mot de passe modifié">
              Redirection vers l'administration…
            </Alert>
          </div>
        ) : (
          <form onSubmit={submitNewPassword} className="mt-6 space-y-4" noValidate>
            {passwordError ? <Alert tone="danger">{passwordError}</Alert> : null}
            <Field label="Nouveau mot de passe" htmlFor="new-password" required>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
            <Button block size="lg" type="submit" loading={passwordState === 'saving'}>
              Enregistrer le mot de passe
            </Button>
          </form>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl">{recoverySent ? 'Lien envoyé' : 'Connexion administration'}</h1>

      {recoverySent ? (
        <>
          <p className="mt-2 text-sm text-ink-600">
            Si un compte administrateur existe pour cette adresse, un lien de réinitialisation vient de lui être
            envoyé. Vérifiez votre boîte de réception ainsi que vos indésirables.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setRecoverySent(false)}>
            Revenir à la connexion
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-600">
            Espace réservé aux personnes habilitées. Les accès sont créés par un administrateur.
          </p>

          {error ? (
            <div className="mt-5">
              <Alert tone="danger">{error}</Alert>
            </div>
          ) : null}

          <form onSubmit={submitLogin} className="mt-6 space-y-4" noValidate>
            <Field label="Adresse e-mail" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Mot de passe" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Button block size="lg" type="submit" loading={submitting} iconRight="arrow-right">
              Se connecter
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setRecoveryMode(true)}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
          >
            <Icon name="lock" size={14} />
            Mot de passe oublié ?
          </button>
        </>
      )}

      {recoveryMode && !recoverySent ? (
        <form onSubmit={submitRecovery} className="mt-6 space-y-4 border-t border-ink-200 pt-5" noValidate>
          <p className="text-sm text-ink-600">
            Saisissez l'adresse e-mail du compte : un lien de réinitialisation lui sera envoyé.
          </p>
          <Field label="Adresse e-mail du compte" htmlFor="recovery-email" required>
            <Input
              id="recovery-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Button block type="submit" loading={submitting} variant="outline">
            Envoyer le lien
          </Button>
        </form>
      ) : null}

      <p className="mt-8 border-t border-ink-200 pt-5 text-xs leading-relaxed text-ink-500">
        Première installation ? Le compte administrateur initial se crée avec la commande{' '}
        <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono">npm run admin:create</code> — voir la section
        « Création du premier administrateur » du README.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo variant="light" />
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-7 shadow-lift">{children}</div>
        <p className="mt-6 text-center text-xs text-ink-400">
          Accès protégé. Les tentatives sont limitées et journalisées.
        </p>
      </div>
    </div>
  );
}
