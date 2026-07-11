import { Shell } from "@/app/command-center/_components/shell";
import { ScanTool } from "@/app/command-center/_components/scan-tool";

export const dynamic = "force-dynamic";

export default function CommandCenterScanPage() {
  return (
    <Shell
      eyebrow="Tools"
      title="Scan tool"
      subtitle="Run the OWASP engine against a public target you own or are authorized to test."
    >
      <ScanTool />
    </Shell>
  );
}
