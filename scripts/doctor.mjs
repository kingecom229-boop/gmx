#!/usr/bin/env node
/**
 * Diagnostic local — `npm run doctor`
 *
 * Vérifie, dans l'ordre où les pannes arrivent réellement :
 *   1. version de Node ;
 *   2. présence et contenu utile du fichier .env ;
 *   3. joignabilité de Supabase depuis CE poste ;
 *   4. état de l'API locale (et de son accès à Supabase) ;
 *   5. cohérence de l'installation des dépendances.
 *
 * Aucune clé n'est affichée : seules la présence et la forme sont contrôlées.
 * Sortie volontairement sans caractères exotiques (console Windows).
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const results = [];
let blocking = 0;

function ok(label, detail = '') {
  results.push({ level: 'OK', label, detail });
}
function warn(label, detail = '') {
  results.push({ level: 'ATTENTION', label, detail });
}
function fail(label, detail = '') {
  blocking += 1;
  results.push({ level: 'ECHEC', label, detail });
}

function readEnvFile() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return null;
  const values = {};
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return values;
}

function mask(value) {
  if (!value) return '(vide)';
  if (value.length <= 12) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, 10)}...(${value.length} caracteres)`;
}

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`delai depasse (${ms} ms)`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  // 1. Node -----------------------------------------------------------------
  const major = Number(process.versions.node.split('.')[0]);
  const minor = Number(process.versions.node.split('.')[1]);
  if (major > 20 || (major === 20 && minor >= 11)) {
    ok('Node.js', `v${process.versions.node}`);
  } else {
    fail('Node.js', `v${process.versions.node} — version 20.11 minimum requise`);
  }

  // 2. Dépendances ----------------------------------------------------------
  const bin = path.join(root, 'node_modules', '.bin');
  if (fs.existsSync(path.join(bin, 'vite.cmd')) || fs.existsSync(path.join(bin, 'vite'))) {
    ok('Dependances', 'node_modules installe');
  } else {
    fail('Dependances', 'node_modules absent ou incomplet — executez: npm install');
  }

  // 3. Fichier .env ---------------------------------------------------------
  const env = readEnvFile();
  if (!env) {
    fail('.env', 'fichier absent — copiez .env.example vers .env et renseignez-le (copy .env.example .env)');
  } else {
    ok('.env', 'fichier present');
    const url = env.VITE_SUPABASE_URL ?? '';
    const key = env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

    if (!url || /VOTRE-PROJET|xxxx/i.test(url)) {
      fail('VITE_SUPABASE_URL', `absent ou valeur d'exemple (${mask(url)})`);
    } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
      warn('VITE_SUPABASE_URL', `forme inattendue (${mask(url)})`);
    } else {
      ok('VITE_SUPABASE_URL', url.replace(/^https:\/\//, '').replace(/\/$/, ''));
    }

    if (!key || /VOTRE_CLE/i.test(key)) {
      fail('VITE_SUPABASE_ANON_KEY', `absent ou valeur d'exemple (${mask(key)})`);
    } else {
      ok('VITE_SUPABASE_ANON_KEY', mask(key));
    }

    // 4. Joignabilité de Supabase depuis ce poste ---------------------------
    if (url && key && !/VOTRE-PROJET/i.test(url)) {
      const endpoint = `${url.replace(/\/$/, '')}/rest/v1/products?select=id&limit=1`;
      try {
        const response = await withTimeout(
          fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } }),
          8000,
        );
        if (response.ok) {
          const rows = await response.json();
          ok('Supabase (REST)', `joignable — ${Array.isArray(rows) ? rows.length : 0} ligne(s) de test`);
        } else if (response.status === 401 || response.status === 403) {
          fail('Supabase (REST)', `acces refuse (HTTP ${response.status}) — cle publique incorrecte`);
        } else if (response.status === 404) {
          fail('Supabase (REST)', 'table absente (HTTP 404) — migrations non appliquees');
        } else {
          fail('Supabase (REST)', `reponse inattendue (HTTP ${response.status})`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // La cause sous-jacente distingue un DNS casse d'un TLS bloque
        // ou d'un simple refus de connexion.
        const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null;
        const code =
          cause && typeof cause === 'object' && 'code' in cause && cause.code
            ? String(cause.code)
            : cause
              ? String(cause)
              : '';
        fail(
          'Supabase (REST)',
          `injoignable depuis ce poste (${message}${code ? ` / ${code}` : ''}) — reseau, pare-feu, proxy ou projet en pause`,
        );
      }
    }
  }

  // 5. API locale -----------------------------------------------------------
  try {
    const response = await withTimeout(fetch('http://localhost:8787/api/health'), 4000);
    if (response.ok) {
      const health = await response.json();
      ok('API locale', `http://localhost:8787 — version ${health.version ?? '?'}, env ${health.env ?? '?'}`);
      try {
        const probe = await withTimeout(fetch('http://localhost:8787/api/products?per_page=1'), 8000);
        if (probe.ok) {
          const body = await probe.json();
          ok('Catalogue via API', `${body.total ?? 0} produit(s) publie(s)`);
        } else {
          fail(
            'Catalogue via API',
            `HTTP ${probe.status} — l'API ne parvient pas a lire Supabase (voir .env ci-dessus)`,
          );
        }
      } catch (error) {
        fail('Catalogue via API', `aucune reponse (${error instanceof Error ? error.message : error})`);
      }
    } else {
      warn('API locale', `repond avec HTTP ${response.status}`);
    }
  } catch {
    warn(
      'API locale',
      'aucune reponse sur le port 8787 — normal si « npm run dev » ne tourne pas dans ce terminal',
    );
  }

  // Rapport ----------------------------------------------------------------
  const width = Math.max(...results.map((r) => r.label.length));
  console.log('\nDiagnostic GMX Motors\n' + '='.repeat(width + 46) + '\n');
  for (const r of results) {
    const tag = r.level === 'OK' ? '[ OK ]     ' : r.level === 'ATTENTION' ? '[ATTENTION] ' : '[ ECHEC ]  ';
    console.log(`${tag}${r.label.padEnd(width)}  ${r.detail}`);
  }
  console.log('\n' + '='.repeat(width + 46));
  if (blocking === 0) {
    console.log('Aucun point bloquant detecte.\n');
  } else {
    console.log(`${blocking} point(s) bloquant(s). Corrigez les lignes [ ECHEC ] ci-dessus.\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Diagnostic interrompu :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
