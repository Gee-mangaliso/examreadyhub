import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, Presentation, Lightbulb, HelpCircle, ClipboardList, Clock, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Subject {
  id: string;
  name: string;
  icon: string | null;
  grade_id: string;
  gradeName?: string;
  gradeNum?: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  subject_name?: string;
  gradeNum?: string;
  subjectName?: string;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  result_count: number;
  created_at: string;
}

interface DashboardSearchProps {
  subjects: Subject[];
  contentItems: ContentItem[];
  enrolledSubjectIds: string[];
  grades: { id: string; name: string }[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: Icons.Calculator, Atom: Icons.Atom, Leaf: Icons.Leaf,
  BookText: Icons.BookText, Globe: Icons.Globe, Landmark: Icons.Landmark,
  PiggyBank: Icons.PiggyBank, Briefcase: Icons.Briefcase, TrendingUp: Icons.TrendingUp,
  Monitor: Icons.Monitor,
};

const contentTypeIcons: Record<string, typeof FileText> = {
  note: FileText, slide: Presentation, worked_example: Lightbulb,
  quiz: HelpCircle, exam: ClipboardList,
};

const contentTypeLabels: Record<string, string> = {
  note: "Note", slide: "Slide", worked_example: "Worked Example",
  quiz: "Quiz", exam: "Practice Exam",
};

const DashboardSearch = ({ subjects, contentItems, enrolledSubjectIds, grades }: DashboardSearchProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [liveContent, setLiveContent] = useState<ContentItem[]>([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  // Load search history
  useEffect(() => {
    if (!user) return;
    supabase
      .from("search_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setSearchHistory((data as SearchHistoryItem[]) || []));
  }, [user]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.toLowerCase().trim();

  // Filtered subjects (local, instant)
  const filteredSubjects = q
    ? subjects.filter((s) => s.name.toLowerCase().includes(q) || s.gradeName?.toLowerCase().includes(q)).slice(0, 5)
    : [];

  // Live search content from DB when query changes (debounced)
  useEffect(() => {
    if (!q || enrolledSubjectIds.length === 0) {
      setLiveContent([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const pattern = `%${q}%`;
      const [notesRes, slidesRes, examplesRes, quizzesRes] = await Promise.all([
        supabase.from("notes").select("id, title, subject_id").in("subject_id", enrolledSubjectIds).ilike("title", pattern).limit(5),
        supabase.from("slides").select("id, title, subject_id").in("subject_id", enrolledSubjectIds).ilike("title", pattern).limit(5),
        supabase.from("worked_examples").select("id, title, subject_id").in("subject_id", enrolledSubjectIds).ilike("title", pattern).limit(5),
        supabase.from("quizzes").select("id, title, subject_id, type").in("subject_id", enrolledSubjectIds).ilike("title", pattern).limit(5),
      ]);

      const subjectMap = subjects.reduce<Record<string, Subject>>((acc, s) => { acc[s.id] = s; return acc; }, {});

      const items: ContentItem[] = [
        ...(notesRes.data || []).map((n) => ({ id: n.id, title: n.title, type: "note", subject_name: subjectMap[n.subject_id]?.name, gradeNum: subjectMap[n.subject_id]?.gradeNum, subjectName: subjectMap[n.subject_id]?.name })),
        ...(slidesRes.data || []).map((s) => ({ id: s.id, title: s.title, type: "slide", subject_name: subjectMap[s.subject_id]?.name, gradeNum: subjectMap[s.subject_id]?.gradeNum, subjectName: subjectMap[s.subject_id]?.name })),
        ...(examplesRes.data || []).map((e) => ({ id: e.id, title: e.title, type: "worked_example", subject_name: subjectMap[e.subject_id]?.name, gradeNum: subjectMap[e.subject_id]?.gradeNum, subjectName: subjectMap[e.subject_id]?.name })),
        ...(quizzesRes.data || []).map((q) => ({ id: q.id, title: q.title, type: q.type || "quiz", subject_name: subjectMap[q.subject_id]?.name, gradeNum: subjectMap[q.subject_id]?.gradeNum, subjectName: subjectMap[q.subject_id]?.name })),
      ];
      setLiveContent(items.slice(0, 8));
      setSearching(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, enrolledSubjectIds, subjects]);

  // Save search to history
  const saveSearch = useCallback(async (searchQuery: string, resultCount: number) => {
    if (!user || !searchQuery.trim()) return;
    const trimmed = searchQuery.trim();
    // Don't save duplicates of the most recent search
    if (searchHistory.length > 0 && searchHistory[0].query === trimmed) return;
    const { data } = await supabase
      .from("search_history")
      .insert({ user_id: user.id, query: trimmed, result_count: resultCount })
      .select()
      .single();
    if (data) {
      setSearchHistory((prev) => [data as SearchHistoryItem, ...prev].slice(0, 10));
    }
  }, [user, searchHistory]);

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("search_history").delete().eq("user_id", user.id);
    setSearchHistory([]);
  };

  const deleteHistoryItem = async (id: string) => {
    await supabase.from("search_history").delete().eq("id", id);
    setSearchHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleResultClick = (navigateTo: string) => {
    const totalResults = filteredSubjects.length + liveContent.length;
    saveSearch(query, totalResults);
    navigate(navigateTo);
    setOpen(false);
    setQuery("");
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setOpen(true);
  };

  const hasResults = filteredSubjects.length > 0 || liveContent.length > 0;
  const showHistory = !q && searchHistory.length > 0;

  return (
    <div ref={ref} className="relative mb-6">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search your subjects and content…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="pl-10"
      />
      {open && (showHistory || q) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* Search history (when no query) */}
          {showHistory && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-xs font-medium text-muted-foreground">Recent Searches</p>
                <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>
              {searchHistory.map((h) => (
                <div key={h.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => handleHistoryClick(h.query)}
                    className="flex items-center gap-3 flex-1 p-2 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{h.query}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{h.result_count} results</span>
                  </button>
                  <button
                    onClick={() => deleteHistoryItem(h.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all shrink-0"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search results */}
          {q && (
            <>
              {searching && (
                <div className="p-3 flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
              {!searching && !hasResults && (
                <div className="p-4 text-sm text-muted-foreground text-center">No results found</div>
              )}
              {filteredSubjects.length > 0 && (
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Subjects</p>
                  {filteredSubjects.map((s) => {
                    const Icon = iconMap[s.icon || ""] || Icons.BookOpen;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleResultClick(`/grades/${s.gradeNum}/subjects/${encodeURIComponent(s.name)}`)}
                        className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <span className="text-sm text-foreground">{s.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{s.gradeName}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {liveContent.length > 0 && (
                <div className="p-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Content</p>
                  {liveContent.map((c) => {
                    const Icon = contentTypeIcons[c.type] || FileText;
                    return (
                      <button
                        key={`${c.type}-${c.id}`}
                        onClick={() => {
                          if (c.gradeNum && c.subjectName) {
                            handleResultClick(`/grades/${c.gradeNum}/subjects/${encodeURIComponent(c.subjectName)}`);
                          }
                        }}
                        className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent transition-colors text-left"
                      >
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-foreground truncate block">{c.title}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">{contentTypeLabels[c.type]}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">{c.subject_name}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardSearch;
