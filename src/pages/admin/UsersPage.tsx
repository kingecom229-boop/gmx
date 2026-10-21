import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Field, Input, Modal } from '@/components/ui';
import { PageHeader } from './_shared';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { relativeTime } from '@/lib/format';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'admin' | 'commercial' | 'client';
  is_active: boolean;
  last_sign_in: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  commercial: 'Commercial',
  client: 'Client',
};

export function UsersPage(): JSX.Element {
  const toast = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.admin
      .list('profiles', new URLSearchParams({ per_page: '100' }))
      .then((response) => {
        if (!cancelled) setRows(response.items as Profile[]);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const changeRole = async (profile: Profile, role: string): Promise<void> => {
    try {
      await api.admin.changeRole(profile.id, role);
      toast.success('Rôle mis à jour', 'Le compte doit se reconnecter pour que le nouveau rôle soit pris en compte.');
      setNonce((value) => value + 1);
    } catch (caught) {
      toast.error('Modification impossible', caught instanceof ApiError ? caught.message : undefined);
    }
  };

  const toggleActive = async (profile: Profile): Promise<void> => {
    const next = !profile.is_active;
    const confirmed = next
      ? true
      : window.confirm(`Désactiver le compte ${profile.email} ? Ses sessions en cours perdront l'accès au back-office.`);
    if (!confirmed) return;

    try {
      await api.admin.setActive(profile.id, next);
      toast.success(next ? 'Compte activé' : 'Compte désactivé');
      setNonce((value) => value + 1);
    } catch (caught) {
      toast.error('Modification impossible', caught instanceof ApiError ? caught.message : undefined);
    }
  };

  return (
    <>
      <PageHeader
        title="Utilisateurs & rôles"
        description="Le rôle est vérifié côté base de données à chaque requête. Il ne peut jamais être obtenu en modifiant son propre profil."
        actions={
          <Button icon="plus" onClick={() => setInviteOpen(true)}>
            Créer un compte
          </Button>
        }
      />

      <div className="mb-6">
        <Alert tone="info" title="Comment les privilèges sont contrôlés">
          L'accès administrateur exige la concordance de deux éléments : le rôle dans les métadonnées d'authentification
          (JWT) et le rôle du profil en base. Un utilisateur qui modifierait son propre profil n'obtiendrait aucun droit
          supplémentaire, car son jeton ne changerait pas.
        </Alert>
      </div>

      {error ? (
        <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-800">{error}</div>
      ) : loading ? (
        <div className="card divide-y divide-ink-100">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton mx-5 my-4 h-4 w-2/3" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50">
                  {['Compte', 'Rôle', 'État', 'Créé le', 'Actions'].map((header) => (
                    <th key={header} scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-600">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((profile) => {
                  const isSelf = profile.id === user?.id;
                  return (
                    <tr key={profile.id} className="transition-colors hover:bg-ink-50">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-ink-900">{profile.email}</p>
                        {profile.full_name ? <p className="text-xs text-ink-500">{profile.full_name}</p> : null}
                        {isSelf ? <Badge tone="brand" className="mt-1">Votre compte</Badge> : null}
                      </td>
                      <td className="px-5 py-3.5">
                        {isSelf ? (
                          <Badge tone="brand">{ROLE_LABELS[profile.role]}</Badge>
                        ) : (
                          <label className="sr-only" htmlFor={`role-${profile.id}`}>
                            Rôle de {profile.email}
                          </label>
                        )}
                        {!isSelf ? (
                          <select
                            id={`role-${profile.id}`}
                            value={profile.role}
                            onChange={(event) => void changeRole(profile, event.target.value)}
                            className="h-9 rounded-lg border border-ink-300 bg-white px-2 text-sm focus:border-brand-600 focus:outline-none"
                          >
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={profile.is_active ? 'success' : 'neutral'}>{profile.is_active ? 'Actif' : 'Désactivé'}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-600">{relativeTime(profile.created_at)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Button size="sm" variant="outline" disabled={isSelf} onClick={() => void toggleActive(profile)}>
                          {profile.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inviteOpen ? (
        <InviteModal onClose={() => setInviteOpen(false)} onDone={() => setNonce((value) => value + 1)} />
      ) : null}
    </>
  );
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }): JSX.Element {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('commercial');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    setError(null);
    if (password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères.');
      return;
    }
    setSaving(true);
    try {
      await api.admin.inviteUser({ email, role, full_name: fullName, password });
      toast.success('Compte créé', 'Communiquez le mot de passe par un canal sécurisé et demandez de le changer.');
      onDone();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Créer un compte"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} loading={saving} icon="check">
            Créer le compte
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <Alert tone="warning" className="mb-5">
        Cette opération utilise l'API d'administration Supabase : la variable <code>SUPABASE_SECRET_KEY</code> doit être
        renseignée sur le serveur. Le mot de passe n'est jamais journalisé ni renvoyé par l'API.
      </Alert>

      <div className="grid gap-4">
        <Field label="Adresse e-mail" htmlFor="inv-email" required>
          <Input id="inv-email" type="email" value={email} maxLength={254} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Nom complet" htmlFor="inv-name">
          <Input id="inv-name" value={fullName} maxLength={120} onChange={(event) => setFullName(event.target.value)} />
        </Field>
        <Field label="Rôle" htmlFor="inv-role" required>
          <select
            id="inv-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-11 w-full rounded-xl border border-ink-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Mot de passe temporaire"
          htmlFor="inv-password"
          required
          hint="12 caractères minimum. Communiquez-le par un canal sécurisé et demandez un changement immédiat."
        >
          <Input
            id="inv-password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
