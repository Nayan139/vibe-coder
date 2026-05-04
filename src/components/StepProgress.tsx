import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Connect Git" },
  { id: 2, label: "Select Repo" },
  { id: 3, label: "Choose Branch" },
  { id: 4, label: "AI Edit" },
  { id: 5, label: "Preview" },
  { id: 6, label: "Push & PR" },
];

export function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                currentStep > step.id
                  ? "bg-violet-600 border-violet-600 text-white"
                  : currentStep === step.id
                  ? "bg-white border-violet-600 text-violet-600"
                  : "bg-white border-gray-300 text-gray-400"
              )}
            >
              {currentStep > step.id ? <Check className="w-3.5 h-3.5" /> : step.id}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden sm:block",
                currentStep >= step.id ? "text-violet-600" : "text-gray-400"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "w-6 h-0.5 mx-1",
                currentStep > step.id ? "bg-violet-600" : "bg-gray-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
