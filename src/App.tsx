import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { HomePage } from '@/pages/HomePage';
import { CataloguePage } from '@/pages/CataloguePage';
import { CategoryPage } from '@/pages/CategoryPage';
import { ProductPage } from '@/pages/ProductPage';
import { OffersPage } from '@/pages/OffersPage';
import { QuotePage } from '@/pages/QuotePage';
import { QuoteConfirmationPage } from '@/pages/QuoteConfirmationPage';
import { ContactPage } from '@/pages/ContactPage';
import { CmsPage } from '@/pages/CmsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminApp } from '@/pages/admin/AdminApp';

/**
 * Routage applicatif.
 *
 * Le back-office (`/admin`) est un arbre isolé : il n'hérite ni de l'en-tête
 * ni du pied de page publics, et toutes ses routes sont protégées.
 */
export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />

      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="categorie/:slug" element={<CategoryPage />} />
        <Route path="produit/:slug" element={<ProductPage />} />
        <Route path="offres" element={<OffersPage />} />
        <Route path="devis" element={<QuotePage />} />
        <Route path="devis/confirmation" element={<QuoteConfirmationPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="a-propos" element={<CmsPage slug="a-propos" />} />
        <Route path="mentions-legales" element={<CmsPage slug="mentions-legales" />} />
        <Route path="confidentialite" element={<CmsPage slug="confidentialite" />} />
        <Route path="cgv" element={<CmsPage slug="cgv" />} />
        <Route path="livraison-garantie" element={<CmsPage slug="livraison-garantie" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
