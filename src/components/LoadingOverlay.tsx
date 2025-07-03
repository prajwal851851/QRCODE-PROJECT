import { RefreshCw } from "lucide-react";

export default function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      <RefreshCw className="h-12 w-12 text-orange-500 animate-spin mb-4" />
      <p className="text-xl font-semibold text-white">Please wait…</p>
      <p className="text-sm text-gray-200">Loading section, this may take a few seconds.</p>
    </div>
  );
} 