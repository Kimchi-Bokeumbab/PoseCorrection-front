import React from "react";

export default function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) {
    return (
      <div className="flex items-start gap-3">
        <div className="rounded-2xl p-2 bg-emerald-100 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {desc ? <p className="text-sm text-muted-foreground mt-1">{desc}</p> : null}
        </div>
      </div>
    );
  }