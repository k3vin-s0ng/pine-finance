"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { trpc } from "@/app/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type DeleteCandidateAssessmentTarget = {
  assessmentId: number;
  name: string;
  email?: string | null;
  campaignTitle?: string | null;
};

export function DeleteCandidateAssessmentDialog({
  target,
  onOpenChange,
  onDeleted,
}: {
  target: DeleteCandidateAssessmentTarget | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void | Promise<void>;
}) {
  const deleteCandidate = trpc.campaigns.deleteCandidate.useMutation({
    onSuccess: async () => {
      toast.success("Candidate deleted");
      await onDeleted?.();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && deleteCandidate.isPending) return;
        onOpenChange(open);
      }}
    >
      <AlertDialogContent className="bg-[#fff] border-[#d9e7db] text-slate-950">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-950 font-black uppercase tracking-tight">
            Permanently delete candidate?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#52665a] leading-relaxed">
            This will permanently delete{" "}
            <span className="font-semibold text-slate-950">
              {target?.name ?? "this candidate"}
            </span>
            {target?.email ? ` (${target.email})` : ""} from{" "}
            <span className="font-semibold text-slate-950">
              {target?.campaignTitle ?? "this campaign"}
            </span>
            , including assessment ID #{target?.assessmentId ?? "..."}, the invitation, submission, score, generated report, report file, and behavior events. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteCandidate.isPending}
            className="border-[#d9e7db] text-[#3f5847] hover:text-slate-950"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteCandidate.isPending || target === null}
            onClick={(event) => {
              event.preventDefault();
              if (!target) return;
              deleteCandidate.mutate({ assessmentId: target.assessmentId });
            }}
            className="bg-red-600 text-white hover:bg-red-700 font-bold uppercase tracking-widest text-xs"
          >
            {deleteCandidate.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Permanently"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
