import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: "md" | "lg" | "xl" }) {
  if (!open) return null;
  const w = size === "xl" ? "max-w-3xl" : size === "lg" ? "max-w-2xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`bg-card rounded-xl w-full ${w} max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 p-4 sm:p-5 border-b sticky top-0 bg-card z-10">
          <h3 className="font-bold text-base sm:text-lg min-w-0 truncate">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted shrink-0"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export function TextField({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input {...rest} className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}

export function TextArea({ label, ...rest }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <textarea {...rest} className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}

export function SelectField({ label, children, ...rest }: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <select {...rest} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30">{children}</select>
    </label>
  );
}
