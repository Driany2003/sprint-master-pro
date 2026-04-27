import { WorkOSProvider } from "@/store/workos-store";
import { AppShell } from "@/components/workos/AppShell";

const Index = () => (
  <WorkOSProvider>
    <AppShell />
  </WorkOSProvider>
);

export default Index;
