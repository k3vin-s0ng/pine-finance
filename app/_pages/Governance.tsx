"use client";

import { trpc } from "@/app/lib/trpc";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Shield,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const severityColors: Record<string, string> = {
  critical: "text-red-400 border-red-800 bg-red-950/40",
  high: "text-orange-400 border-orange-800 bg-orange-950/40",
  medium: "text-amber-400 border-amber-800 bg-amber-950/40",
  low: "text-yellow-400 border-yellow-800 bg-yellow-950/40",
};

const statusColors: Record<string, string> = {
  open: "text-red-400 border-red-800",
  investigating: "text-amber-400 border-amber-800",
  resolved: "text-emerald-400 border-emerald-800",
  dismissed: "text-muted-foreground border-border",
};

const typeLabels: Record<string, string> = {
  unapproved_tool: "Unapproved Tool",
  policy_bypass: "Policy Bypass",
  missing_approval: "Missing Approval",
  audit_gap: "Audit Gap",
  data_exposure: "Data Exposure",
  high_risk_no_review: "High-Risk No Review",
  other: "Other",
};

export default function Governance() {
  const [from] = useState(() => new Date(Date.now() - 30 * 86400000));
  const [to] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = trpc.intelligence.governance.list.useQuery({
    from,
    to,
    status: statusFilter === "all" ? undefined : (statusFilter as any),
    severity: severityFilter === "all" ? undefined : (severityFilter as any),
    page,
    pageSize: 15,
  });

  const updateStatus = trpc.intelligence.governance.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const summary = trpc.intelligence.governance.summary.useQuery({ from, to });

  const openCount = summary.data?.find((s) => s.status === "open")?.count ?? 0;
  const investigatingCount = summary.data?.find((s) => s.status === "investigating")?.count ?? 0;
  const resolvedCount = summary.data?.find((s) => s.status === "resolved")?.count ?? 0;

  return (
    <DashboardShell
      title="Governance & Compliance"
      subtitle="Policy violations, audit trail, and compliance alerts — routed to compliance leads"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={16} className="text-red-400" />
            <span className="text-xs text-muted-foreground">Open Violations</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{Number(openCount)}</p>
        </div>
        <div className="bg-amber-950/40 border border-amber-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-amber-400" />
            <span className="text-xs text-muted-foreground">Investigating</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{Number(investigatingCount)}</p>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-xs text-muted-foreground">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{Number(resolvedCount)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-cyan-400" />
            <span className="text-xs text-muted-foreground">Total Events</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">
            {summary.data?.reduce((s, r) => s + Number(r.count), 0) ?? 0}
          </p>
        </div>
      </div>

      {/* Compliance routing notice */}
      <div className="mb-4 p-3 bg-amber-950/30 border border-amber-900/40 rounded-lg flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300">
          <span className="font-medium">Compliance Routing:</span> All critical and high-severity governance events are automatically routed to designated compliance leads, not general administrators. Email notifications are sent when new violations are detected.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={14} className="text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 text-xs h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36 text-xs h-8">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            Policy Events
            {data?.total !== undefined && (
              <span className="text-xs text-muted-foreground font-normal">({data.total} total)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Activity className="text-primary animate-pulse" size={24} />
            </div>
          ) : !data?.events || data.events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-emerald-400">
              <CheckCircle size={20} />
              <p className="text-xs text-muted-foreground">No policy events found for the selected filters</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-xs text-muted-foreground">Type</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Severity</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs text-muted-foreground">User</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Description</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Detected</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.map((event) => (
                    <TableRow key={event.id} className="border-border">
                      <TableCell className="text-xs text-foreground">
                        {typeLabels[event.type] ?? event.type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${severityColors[event.severity] ?? ""}`}
                        >
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${statusColors[event.status] ?? ""}`}
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        User #{event.userId}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                        {event.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(event.detectedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {event.status === "open" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-6 px-2"
                              onClick={() =>
                                updateStatus.mutate({ id: event.id, status: "investigating" })
                              }
                            >
                              Investigate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-6 px-2 text-emerald-400 border-emerald-800"
                              onClick={() =>
                                updateStatus.mutate({ id: event.id, status: "resolved" })
                              }
                            >
                              Resolve
                            </Button>
                          </div>
                        )}
                        {event.status === "investigating" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6 px-2 text-emerald-400 border-emerald-800"
                            onClick={() =>
                              updateStatus.mutate({ id: event.id, status: "resolved" })
                            }
                          >
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
