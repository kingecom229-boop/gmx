/**
 * Version applicative.
 *
 * Affichée discrètement dans le pied de page et renvoyée par `/api/health`.
 * Raison d'être : sans marqueur de version, il est impossible de distinguer
 * un correctif non déployé d'un correctif déployé mais contourné par un
 * cache ou par un dossier de travail resté sur une ancienne copie.
 */
export const APP_VERSION = '1.1.0';
export const APP_RELEASE_LABEL = 'identité visuelle GMX Motors';
