import { WorkOSProvider } from "@/store/workos-store";
import { AuthProvider, useAuth } from "@/store/auth-store";
import { AppShell } from "@/components/workos/AppShell";
import { LoginScreen } from "@/components/workos/LoginScreen";

function Gate() {
  const { user } = useAuth();
  return user ? <AppShell /> : <LoginScreen />;
}

const Index = () => (
  <WorkOSProvider>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </WorkOSProvider>
);

export default Index;
