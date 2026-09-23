import AppShell from '@/components/app-shell';
import AuthGate from '@/components/auth-gate';
import StoreProvider from '@/store/StoreProvider';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <StoreProvider>
        <AppShell>{children}</AppShell>
      </StoreProvider>
    </AuthGate>
  );
}
