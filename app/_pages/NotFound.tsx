"use client";

import { Link } from "@/app/lib/wouter";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8fbf8] flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #168a4a 0%, transparent 70%)" }}
      />
      <div className="relative z-10 text-center px-4">
        <div className="text-[160px] font-black leading-none text-chiaroscuro mb-4 select-none">
          404
        </div>
        <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-3">
          Page Not Found
        </h1>
        <p className="text-[#6f8274] text-sm mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase px-6 py-3">
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
