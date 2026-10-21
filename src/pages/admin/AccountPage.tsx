import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Field, Input } from '@/components/ui';
import { PageHeader } from './_shared';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export function AccountPage(): JSX.Element {
  const { user, role, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setDone(false);

    if (!supabase) {
      setError("Supabase n'est pas configuré.");
      return;
    }
    if (password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setPassword('');
    setConfirm('');
    toast.success('Mot de passe modifié');
  };

  const logout = async (): Promise<void> => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Mon compte"
        description="Identité connectée, changement de mot de passe et fermeture de session."
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="card p-6">
          <h2 className="text-lg">Session en cours</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-600">Adresse e-mail</dt>
              <dd className="font-semibold text-ink-900">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-600">Rôle</dt>
              <dd className="font-semibold capitalize text-ink-900">{role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-600">Identifiant technique</dt>
              <dd className="font-mono text-xs text-ink-500">{user?.id.slice(0, 13)}…</dd>
            </div>
          </dl>

          <Alert tone="info" className="mt-5">
            Le rôle est attribué côté serveur lors de la création du compte. Il est vérifié par la base de données à
            chaque opération : il ne peut pas être modifié depuis le navigateur.
          </Alert>

          <Button variant="outline" className="mt-5" icon="logout" onClick={() => void logout()}>
            Fermer la session
          </Button>
        </section>

        <section className="card p-6">
          <h2 className="text-lg">Changer le mot de passe</h2>
          <p className="mt-1 text-sm text-ink-600">
            Utilisez un mot de passe long et unique. Le changement prend effet immédiatement sur cette session.
          </p>

          {error ? (
            <div className="mt-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          ) : null}
          {done ? (
            <div className="mt-4">
              <Alert tone="success" title="Mot de passe modifié">
                Conservez-le en lieu sûr. En cas d'oubli, utilisez « Mot de passe oublié ? » sur la page de connexion.
              </Alert>
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field label="Nouveau mot de passe" htmlFor="acc-password" required hint="12 caractères minimum.">
              <Input
                id="acc-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field label="Confirmer le mot de passe" htmlFor="acc-confirm" required>
              <Input
                id="acc-confirm"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </Field>
            <Button type="submit" loading={saving} icon="check">
              Enregistrer
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
