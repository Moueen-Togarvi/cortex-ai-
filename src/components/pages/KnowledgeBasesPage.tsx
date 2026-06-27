"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Database,
  FileText,
  Search,
  Settings,
  ExternalLink,
  MoreHorizontal,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";

interface SearchResult {
  document: string;
  chunk: number;
  score: number;
  preview: string;
}

interface KBCount {
  documents?: number;
  conversations?: number;
  [key: string]: unknown;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  _count?: KBCount;
  documentCount?: number;
  totalChunks?: number;
  embeddingModel: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "building" | "error";
}

function getKBBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25">
          Active
        </Badge>
      );
    case "building":
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25">
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          Building
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25">
          Error
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getGradientForIndex(i: number): string {
  const gradients = [
    "bg-gradient-to-br from-emerald-500/20 to-teal-600/10",
    "bg-gradient-to-br from-amber-500/20 to-orange-600/10",
    "bg-gradient-to-br from-rose-500/20 to-pink-600/10",
    "bg-gradient-to-br from-cyan-500/20 to-teal-500/10",
    "bg-gradient-to-br from-violet-500/20 to-fuchsia-600/10",
    "bg-gradient-to-br from-lime-500/20 to-green-600/10",
  ];
  return gradients[i % gradients.length];
}

function getIconColor(i: number): string {
  const colors = [
    "text-emerald-400",
    "text-amber-400",
    "text-rose-400",
    "text-cyan-400",
    "text-violet-400",
    "text-lime-400",
  ];
  return colors[i % colors.length];
}

export default function KnowledgeBasesPage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKBName, setNewKBName] = useState("");
  const [newKBDesc, setNewKBDesc] = useState("");
  const [newKBModel, setNewKBModel] = useState("");
  const [creating, setCreating] = useState(false);

  // RAG Test Search
  const [searchKB, setSearchKB] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showTestSearch, setShowTestSearch] = useState(false);

  const fetchKnowledgeBases = useCallback(() => {
    api.getKnowledgeBases()
      .then((data) => setKnowledgeBases((data as KnowledgeBase[]) ?? []))
      .catch((err) => console.error("Failed to fetch knowledge bases:", err));
  }, []);

  useEffect(() => {
    api.getKnowledgeBases()
      .then((data) => setKnowledgeBases((data as KnowledgeBase[]) ?? []))
      .catch((err) => console.error("Failed to fetch knowledge bases:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = () => {
    if (!newKBName.trim()) return;
    setCreating(true);
    api.createKnowledgeBase({
      name: newKBName,
      description: newKBDesc,
      embeddingModel: newKBModel,
    })
      .then(() => {
        setShowCreate(false);
        setNewKBName("");
        setNewKBDesc("");
        setNewKBModel("");
        fetchKnowledgeBases();
      })
      .catch((err) => console.error("Failed to create knowledge base:", err))
      .finally(() => setCreating(false));
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !searchKB) return;
    setIsSearching(true);
    setShowTestSearch(true);
    setSearchResults([]);

    api.searchKnowledgeBase(searchKB, searchQuery)
      .then((data) => {
        const res = data as { results?: SearchResult[] };
        setSearchResults(res.results ?? []);
      })
      .catch((err) => {
        console.error("Search failed:", err);
        setSearchResults([]);
      })
      .finally(() => setIsSearching(false));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Knowledge Bases
          </h1>
          <Badge variant="secondary" className="text-xs font-normal">
            {loading ? "—" : knowledgeBases.length}
          </Badge>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" />
              Create Knowledge Base
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Knowledge Base</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="kb-name">Name</Label>
                <Input
                  id="kb-name"
                  placeholder="e.g., Finance KB"
                  value={newKBName}
                  onChange={(e) => setNewKBName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-desc">Description</Label>
                <Textarea
                  id="kb-desc"
                  placeholder="Describe the purpose and content of this knowledge base..."
                  rows={3}
                  value={newKBDesc}
                  onChange={(e) => setNewKBDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Embedding Model</Label>
                <Select value={newKBModel} onValueChange={setNewKBModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an embedding model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-embedding-3-small">
                      text-embedding-3-small
                    </SelectItem>
                    <SelectItem value="text-embedding-3-large">
                      text-embedding-3-large
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={creating || !newKBName.trim()}
                onClick={handleCreate}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KB Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBases.map((kb, index) => {
            const docCount = kb._count?.documents ?? kb.documentCount ?? 0;
            const chunkCount = kb._count?.conversations ?? kb.totalChunks ?? 0;
            return (
              <Card
                key={kb.id}
                className="group border-border/50 bg-card/50 backdrop-blur-sm hover:border-border hover:bg-card transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${getGradientForIndex(index)}`}
                      >
                        <Database className={`h-5 w-5 ${getIconColor(index)}`} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base leading-tight truncate">
                          {kb.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {kb.description}
                        </p>
                      </div>
                    </div>
                    {getKBBadge(kb.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{docCount} docs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" />
                      <span>{chunkCount.toLocaleString()} chunks</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal text-muted-foreground h-5"
                    >
                      {kb.embeddingModel}
                    </Badge>
                  </div>

                  <Separator className="opacity-50" />

                  {/* Last Updated */}
                  <p className="text-xs text-muted-foreground">
                    Updated{" "}
                    {new Date(kb.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View Documents
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5"
                      onClick={() => {
                        setSearchKB(kb.id);
                        setShowTestSearch(true);
                      }}
                    >
                      <Search className="h-3.5 w-3.5" />
                      Test Search
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* RAG Test Search Section */}
      {showTestSearch && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Search className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">RAG Test Search</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Test your knowledge base with a query
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowTestSearch(false);
                  setSearchResults([]);
                }}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter a test query..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Select value={searchKB} onValueChange={setSearchKB}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select knowledge base" />
                </SelectTrigger>
                <SelectContent>
                  {knowledgeBases.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim() || !searchKB}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>

            {/* Loading State */}
            {isSearching && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <p className="text-sm text-muted-foreground">
                  Searching across knowledge base...
                </p>
              </div>
            )}

            {/* Search Results */}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {searchResults.length} results found
                </p>
                {searchResults.map((result, i) => (
                  <Card
                    key={i}
                    className="border-border/50 bg-background/50 hover:bg-background transition-colors"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {result.document}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal shrink-0"
                          >
                            Chunk #{result.chunk}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                result.score >= 0.9
                                  ? "bg-emerald-500"
                                  : result.score >= 0.8
                                    ? "bg-amber-500"
                                    : "bg-orange-500"
                              }`}
                              style={{ width: `${result.score * 100}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              result.score >= 0.9
                                ? "text-emerald-400"
                                : result.score >= 0.8
                                  ? "text-amber-400"
                                  : "text-orange-400"
                            }`}
                          >
                            {Math.round(result.score * 100)}% match
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        &ldquo;{result.preview}&rdquo;
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-emerald-400 hover:text-emerald-300 text-xs gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Full Document
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isSearching && showTestSearch && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <Search className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Enter a query and select a knowledge base to test
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
