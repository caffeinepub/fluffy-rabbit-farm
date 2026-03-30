import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import HatchDetailPage from "./pages/HatchDetailPage";
import HomePage from "./pages/HomePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function App() {
  const [selectedHatchId, setSelectedHatchId] = useState<bigint | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        {selectedHatchId === null ? (
          <HomePage onSelectHatch={setSelectedHatchId} />
        ) : (
          <HatchDetailPage
            hatchId={selectedHatchId}
            onBack={() => setSelectedHatchId(null)}
          />
        )}
      </div>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
