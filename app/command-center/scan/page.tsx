import { LocalScanRunner } from "@/app/_components/local-scan-runner";

export const dynamic = "force-dynamic";

export default function CommandCenterScanPage() {
  return <LocalScanRunner mode="console" />;
}
