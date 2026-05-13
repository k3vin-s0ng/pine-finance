import { trpc } from "@/lib/trpc";
import {
  Activity,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const typeColors: Record<string, string> = {
  nudge: "text-cyan-400 border-cyan-800 bg-cyan-950/40",
  personal_summary: "text-emerald-400 border-emerald-800 bg-emerald-950/40",
  team_coaching: "text-purple-400 border-purple-800 bg-purple-950/40",
  executive_loop: "text-amber-400 border-amber-800 bg-amber-950/40",
};

const typeLabels: Record<string, string> = {
  nudge: "Nudge",
  personal_summary: "Personal Summary",
  team_coaching: "Team Coaching",
  executive_loop: "Executive Loop",
};

export default function Feedback() {
  const [tab, setTab] = useState("inbox");

  const { data: feedbackItems, isLoading, refetch } = trpc.intelligence.feedback.list.useQuery({});
  const { data: playbooks, isLoading: playbooksLoading } = trpc.intelligence.feedback.playbooks.useQuery({});

  const markRead = trpc.intelligence.feedback.markRead.useMutation({ onSuccess: () => refetch() });
  const createNudge = trpc.intelligence.feedback.createNudge.useMutation({
    onSuccess: () => { toast.success("Personalised nudge generated"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const unreadCount = feedbackItems?.filter((f) => !f.isRead).length ?? 0;

  return (
    <DashboardShell
      title="Feedback & Enablement"
      subtitle="In-product nudges, coaching summaries, and best-practice playbook library"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="inbox" className="text-xs">
              Inbox
              {unreadCount > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="playbooks" className="text-xs">Playbooks</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => refetch()}>
              <RefreshCw size={12} /> Refresh
            </Button>
            <Button
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => createNudge.mutate({ userId: 0, workflowType: "general", title: "AI Usage Tip", content: "Review your recent AI sessions and identify one workflow where you can increase verification depth this week." })}
              disabled={createNudge.isPending}
            >
              <Sparkles size={12} />
              {createNudge.isPending ? "Generating..." : "Generate Nudge"}
            </Button>
          </div>
        </div>

        {/* Inbox */}
        <TabsContent value="inbox">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Activity className="text-primary animate-pulse" size={24} />
            </div>
          ) : !feedbackItems || feedbackItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              <MessageSquare size={24} className="opacity-40" />
              <p className="text-xs">No feedback items yet. Generate a nudge to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackItems.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  onMarkRead={() => markRead.mutate({ id: item.id })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Playbooks */}
        <TabsContent value="playbooks">
          {playbooksLoading ? (
            <div className="flex items-center justify-center h-40">
              <Activity className="text-primary animate-pulse" size={24} />
            </div>
          ) : !playbooks || playbooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              <BookOpen size={24} className="opacity-40" />
              <p className="text-xs">No playbooks available. Seed demo data to populate the playbook library.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playbooks.map((pb) => (
                <PlaybookCard key={pb.id} playbook={pb} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function FeedbackCard({ item, onMarkRead }: { item: any; onMarkRead: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        item.isRead ? "bg-muted/10 border-border opacity-70" : "bg-card border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`text-[10px] ${typeColors[item.type] ?? ""}`}>
              {typeLabels[item.type] ?? item.type}
            </Badge>
            {!item.isRead && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!item.isRead && (
            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={onMarkRead}>
              <CheckCircle size={10} className="mr-1" /> Mark Read
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] h-6 px-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <Streamdown>{item.content}</Streamdown>
          </div>
          {item.llmNarrative && (
            <div className="mt-3 p-3 bg-muted/20 rounded-md border border-border">
              <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                AI-Generated Coaching
              </p>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <Streamdown>{item.llmNarrative}</Streamdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlaybookCard({ playbook }: { playbook: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">{playbook.title}</CardTitle>
            {playbook.workflowType && (
              <Badge variant="outline" className="text-[10px] mt-1 text-cyan-400 border-cyan-800">
                {playbook.workflowType.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <BookOpen size={16} className="text-primary shrink-0 mt-0.5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground leading-relaxed">{playbook.description}</p>
        {playbook.whenToUse && (
          <div className="mt-2 p-2 bg-muted/20 rounded-md">
            <p className="text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground">When to use:</span> {playbook.whenToUse}
            </p>
          </div>
        )}
        {playbook.steps && (
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] h-6 mt-2 px-0 gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? "Hide steps" : "View steps"}
          </Button>
        )}
        {expanded && playbook.steps && (
          <div className="mt-2 space-y-1">
            {(Array.isArray(playbook.steps) ? playbook.steps : []).map((step: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}