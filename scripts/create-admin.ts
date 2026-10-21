/**
 * Création du PREMIER ADMINISTRATEUR — GMX Motors
 * ============================================================================
 *
 * Ce script est la SEULE voie d'attribution du rôle administrateur.
 *
 * Pourquoi un script et non une route publique ?
 *   - aucune URL du site ne peut accorder de privilèges ;
 *   - le rôle est écrit dans `app_metadata` côté Supabase Auth, donc dans le
 *     JWT vérifié par la fonction SQL `public.is_admin()` ;
 *   - un utilisateur qui modifierait son propre profil n'obtiendrait rien,
 *     car son JWT ne contiendrait toujours pas le rôle.
 *
 * Prérequis
 *   1. `.env` renseigné avec VITE_SUPABASE_URL et SUPABASE_SECRET_KEY
 *      (Dashboard Supabase > Settings > API Keys > Secret keys).
 *      Cette clé est équivalente à l'ancienne `service_role` : elle ne doit
 *      jamais quitter le serveur ni être versionnée.
 *   2. Les migrations appliquées (supabase/migrations).
 *
 * Utilisation
 *   npm run admin:create -- --email admin@exemple.fr --password "mot-de-passe-long"
 *
 * Options
 *   --email      (obligatoire) adresse e-mail du compte
 *   --password   (obligatoire) 12 caractères minimum
 *   --role       admin | commercial   (défaut : admin)
 *   --name       nom complet affiché
 *
 * Le mot de passe n'est jamais écrit dans un fichier, un journal ou le dépôt.
 */

import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next;
      index += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (hidden) process.stdout.write(question);
  const answer = await rl.question(hidden ? '' : question);
  rl.close();
  if (hidden) process.stdout.write('\n');
  return answer.trim();
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  console.log('\n  GMX Motors — création du premier administrateur\n');

  if (!SUPABASE_URL) {
    fail('SUPABASE_URL (ou VITE_SUPABASE_URL) est absente. Renseignez le fichier .env.');
  }
  if (!SECRET_KEY) {
    fail(
      'SUPABASE_SECRET_KEY est absente.\n' +
        '  Copiez .env.example vers .env puis renseignez la clé secrète :\n' +
        '  Dashboard Supabase > Settings > API Keys > Secret keys.\n' +
        '  Sans elle, aucune attribution de rôle administrateur n\'est possible.',
    );
  }

  const args = parseArgs(process.argv.slice(2));

  const email = (args.email ?? (await prompt('Adresse e-mail du compte : '))).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) fail('Adresse e-mail invalide.');

  const password = args.password ?? (await prompt('Mot de passe (12 caractères minimum) : ', true));
  if (password.length < 12) fail('Le mot de passe doit contenir au moins 12 caractères.');

  const role = args.role ?? 'admin';
  if (role !== 'admin' && role !== 'commercial') fail('Rôle invalide : utilisez « admin » ou « commercial ».');

  const fullName = args.name ?? '';

  const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`\n  Création du compte ${email} avec le rôle « ${role} »…`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
    app_metadata: { role },
  });

  if (error) {
    if (/already been registered|already exists/i.test(error.message)) {
      console.log('\n  Un compte existe déjà pour cette adresse.');
      console.log('  Mise à jour du rôle…');

      const { data: existing } = await supabase.auth.admin.listUsers();
      const user = existing.users.find((candidate) => candidate.email?.toLowerCase() === email);
      if (!user) fail('Compte introuvable dans la liste Auth.');

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: { role },
      });
      if (updateError) fail(`Mise à jour impossible : ${updateError.message}`);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role, full_name: fullName || null })
        .eq('id', user.id);
      if (profileError) fail(`Profil non mis à jour : ${profileError.message}`);

      console.log(`\n  ✔ Rôle mis à jour pour ${email}.\n`);
      process.exit(0);
    }
    fail(`Création impossible : ${error.message}`);
  }

  // Le trigger `handle_new_user` crée le profil ; on force le rôle par sécurité.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      { id: data.user.id, email, full_name: fullName || null, role, is_active: true },
      { onConflict: 'id' },
    );

  if (profileError) {
    fail(`Compte Auth créé mais profil non enregistré : ${profileError.message}`);
  }

  const { data: verify } = await supabase.from('profiles').select('id, email, role, is_active').eq('id', data.user.id).single();

  console.log('\n  ✔ Compte administrateur créé et vérifié :');
  console.log(`      e-mail : ${verify?.email ?? email}`);
  console.log(`      rôle   : ${verify?.role ?? role}`);
  console.log(`      actif  : ${verify?.is_active ? 'oui' : 'non'}`);
  console.log('\n  Connexion : http://localhost:5173/admin/login');
  console.log('  Changez le mot de passe dès la première connexion (Mon compte).\n');
  console.log('  ⚠ Le mot de passe n’est pas conservé par ce script : conservez-le en lieu sûr.\n');
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
