"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  LayoutGrid,
  List,
  Filter,
  FileText,
  FileCode,
  FileSpreadsheet,
  MoreHorizontal,
  Eye,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface DocKB {
  name?: string;
  [key: string]: unknown;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: "processing" | "ready" | "error" | "queued";
  knowledgeBase: DocKB | string;
  chunks: number;
  uploadedAt: string;
  uploadedBy: string;
}

interface KnowledgeBaseOption {
  id: string;
  name: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ready":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25">
          Ready
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25">
          Error
        </Badge>
      );
    case "queued":
      return (
        <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/20 hover:bg-slate-500/25">
          Queued
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getFileIcon(type: string) {
  switch (type) {
    case "pdf":
      return (
        <div className="h-10 w-10 rounded-lg bg-red-500/15 flex items-center justify-center">
          <FileText className="h-5 w-5 text-red-400" />
        </div>
      );
    case "docx":
      return (
        <div className="h-10 w-10 rounded-lg bg-sky-500/15 flex items-center justify-center">
          <FileText className="h-5 w-5 text-sky-400" />
        </div>
      );
    case "txt":
    case "md":
      return (
        <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
          <FileCode className="h-5 w-5 text-slate-400" />
        </div>
      );
    case "xlsx":
      return (
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
        </div>
      );
    default:
      return (
        <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
          <FileText className="h-5 w-5 text-slate-400" />
        </div>
      );
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getKBName(doc: Document): string {
  if (typeof doc.knowledgeBase === "object" && doc.knowledgeBase !== null) {
    return (doc.knowledgeBase as DocKB).name ?? "Unknown";
  }
  return String(doc.knowledgeBase);
}

const simulatedFiles = [
  { name: "quarterly-summary.pdf", size: 3200000, type: "pdf" },
  { name: "meeting-notes.docx", size: 145000, type: "docx" },
];

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedKB, setSelectedKB] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(() => {
    api.getDocuments()
      .then((data) => {
        setDocuments((data as Document[]) ?? []);
      })
      .catch((err) => console.error("Failed to fetch documents:", err));
  }, []);

  const fetchKnowledgeBases = useCallback(() => {
    api.getKnowledgeBases()
      .then((data) => {
        setKnowledgeBases((data as KnowledgeBaseOption[]) ?? []);
      })
      .catch((err) => console.error("Failed to fetch knowledge bases:", err));
  }, []);

  useEffect(() => {
    Promise.all([
      api.getDocuments(),
      api.getKnowledgeBases(),
    ])
      .then(([docs, kbs]) => {
        setDocuments((docs as Document[]) ?? []);
        setKnowledgeBases((kbs as KnowledgeBaseOption[]) ?? []);
      })
      .catch((err) => console.error("Failed to fetch data:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = () => {
    if (!selectedKB || simulatedFiles.length === 0) return;
    setUploading(true);
    const file = simulatedFiles[0];
    api.createDocument({
      name: file.name,
      type: file.type,
      size: file.size,
      knowledgeBaseId: selectedKB,
    })
      .then(() => {
        setShowUpload(false);
        fetchDocuments();
        // Poll for status update after 4s (API simulates 3s processing)
        setTimeout(() => fetchDocuments(), 4000);
      })
      .catch((err) => console.error("Failed to upload document:", err))
      .finally(() => setUploading(false));
  };

  const handleDelete = (id: string) => {
    api.deleteDocument(id)
      .then(() => fetchDocuments())
      .catch((err) => console.error("Failed to delete document:", err));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Documents
          </h1>
          <Badge variant="secondary" className="text-xs font-normal">
            {loading ? "—" : documents.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-muted/50 p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Upload className="h-4 w-4" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Drop Zone */}
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-emerald-400" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Drag & drop files here, or click to browse
                  </p>
                  <div className="flex gap-2">
                    {["PDF", "DOCX", "TXT", "MD"].map((fmt) => (
                      <Badge
                        key={fmt}
                        variant="outline"
                        className="text-xs font-normal text-muted-foreground"
                      >
                        {fmt}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/70">
                    Max 50MB per file
                  </p>
                </div>

                {/* Simulated File List */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Selected files ({simulatedFiles.length})
                  </p>
                  {simulatedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Knowledge Base Selector */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Knowledge Base <span className="text-red-400">*</span>
                  </p>
                  <Select value={selectedKB} onValueChange={setSelectedKB}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a knowledge base" />
                    </SelectTrigger>
                    <SelectContent>
                      {knowledgeBases.map((kb) => (
                        <SelectItem key={kb.id} value={kb.id}>
                          {kb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Upload Button */}
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={uploading || !selectedKB}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-px w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="group border-border/50 bg-card/50 backdrop-blur-sm hover:border-border hover:bg-card transition-all duration-200"
            >
              <CardContent className="p-4 space-y-3">
                {/* File icon + name row */}
                <div className="flex items-start gap-3">
                  {getFileIcon(doc.type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(doc.size)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* KB name */}
                <p className="text-xs text-muted-foreground truncate">
                  {getKBName(doc)}
                </p>

                {/* Status */}
                <div className="flex items-center justify-between">
                  {getStatusBadge(doc.status)}
                  {doc.status === "ready" && doc.chunks > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {doc.chunks} chunks
                    </span>
                  )}
                </div>

                <Separator className="opacity-50" />

                {/* Uploaded info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{doc.uploadedBy}</span>
                  <span className="shrink-0 ml-2">
                    {formatRelativeTime(doc.uploadedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[300px]">
                    <button className="flex items-center gap-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      Name
                      <span className="text-muted-foreground/40">↕</span>
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      Type
                      <span className="text-muted-foreground/40">↕</span>
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      Size
                      <span className="text-muted-foreground/40">↕</span>
                    </button>
                  </TableHead>
                  <TableHead>Knowledge Base</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="border-border/30 group">
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(doc.type)}
                        <span className="text-sm font-medium truncate" title={doc.name}>
                          {doc.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase font-normal">
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(doc.size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getKBName(doc)}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.chunks > 0 ? doc.chunks : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm">{doc.uploadedBy}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(doc.uploadedAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-400"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
