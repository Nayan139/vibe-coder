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

function getLabelColor(currentStep: number, stepId: number) {
  if (currentStep > stepId) return "text-amber-500";
  if (currentStep === stepId) return "text-rose-600";
  return "text-slate-400";
}

function getStepCircleClass(currentStep: number, stepId: number) {
  if (currentStep > stepId) return "bg-linear-to-br from-rose-500 to-amber-400 text-white shadow-sm shadow-rose-200";
  if (currentStep === stepId) return "border-2 border-rose-500 bg-white text-rose-600 shadow-sm shadow-rose-100";
  return "border-2 border-slate-200 bg-white text-slate-400";
}

export function StepProgress({ currentStep }: Readonly<{ currentStep: number }>) {
  return (
    <div className="flex w-full items-start">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex min-w-0 items-start" style={{ flex: i < STEPS.length - 1 ? "1 1 0%" : "0 0 auto" }}>
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
                getStepCircleClass(currentStep, step.id)
              )}
            >
              {currentStep > step.id ? <Check className="h-3.5 w-3.5" /> : step.id}
            </div>
            <span
              className={cn(
                "hidden text-[10px] font-medium leading-none lg:block",
                getLabelColor(currentStep, step.id)
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mt-3.5 -translate-y-1/2 mx-1.5 h-0.5 flex-1 rounded-full transition-all duration-300",
                currentStep > step.id
                  ? "bg-linear-to-r from-rose-400 to-amber-400"
                  : "bg-slate-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
