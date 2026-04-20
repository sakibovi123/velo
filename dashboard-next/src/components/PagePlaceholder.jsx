import { Construction } from "lucide-react";

export default function PagePlaceholder({ title, description }) {
  return (
    <div className="h-full flex flex-col">
      <header className="h-[60px] flex items-center px-6 border-b border-zinc-200">
        <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight">{title}</h1>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Construction className="w-5 h-5 text-zinc-500" />
          </div>
          <h2 className="text-[15px] font-semibold text-zinc-900 mb-1.5">{title}</h2>
          <p className="text-[13px] text-zinc-500 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
