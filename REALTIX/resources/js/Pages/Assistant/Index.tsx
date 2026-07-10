// resources/js/Pages/Assistant/Index.tsx
//
// Pagina Inertia publică ce montează asistentul AI. Tema vine din ThemeProvider-ul
// global (clasa `dark` pe <html> + localStorage `rt-theme`); limba e gestionată
// intern de AssistantApp (RO/RU).

import { Head, router, usePage } from '@inertiajs/react';
import AssistantApp from '@/Features/Assistant/AssistantApp';
import { useTheme } from '@/Components/ui/ThemeProvider';

export default function AssistantIndex() {
  const { theme } = useTheme();
  // auth.user e partajat global de HandleInertiaRequests; null = vizitator anonim.
  const authUser = (usePage().props as { auth?: { user?: { id: number } | null } }).auth?.user ?? null;
  return (
    <>
      <Head title="Asistent AI" />
      <AssistantApp
        theme={theme === 'dark' ? 'dark' : 'light'}
        authUser={authUser}
        navigate={(href) => router.visit(href)}
      />
    </>
  );
}
