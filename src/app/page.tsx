import Home from "@/components/Home";
import { AdminEditPanel } from "@/components/AdminEditPanel";
import { SiteConfigProvider } from "@/components/SiteConfigProvider";

export default function Page() {
  return (
    <SiteConfigProvider>
      <Home />
      <AdminEditPanel />
    </SiteConfigProvider>
  );
}
