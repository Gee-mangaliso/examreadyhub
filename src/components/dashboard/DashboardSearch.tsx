import { useState, useEffect, useRef } from "react";
import { Search, FileText, Presentation, Lightbulb, HelpCircle, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";

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

interface DashboardSearchProps {
  subjects: Subject[];
  contentItems: ContentItem[];
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

const DashboardSearch = ({ subjects, contentItems }: DashboardSearchProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.toLowerCase().trim();

  const filteredSubjects = q
    ? subjects.filter((s) => s.name.toLowerCase().includes(q) || s.gradeName?.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const filteredContent = q
    ? contentItems.filter((c) => c.title.toLowerCase().includes(q) || c.subject_name?.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const hasResults = filteredSubjects.length > 0 || filteredContent.length > 0;

  return (
    <div ref={ref} className="relative mb-6">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search subjects and content…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="pl-10"
      />
      {open && q && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {!hasResults && (
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
                    onClick={() => {
                      navigate(`/grades/${s.gradeNum}/subjects/${encodeURIComponent(s.name)}`);
                      setOpen(false);
                      setQuery("");
                    }}
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
          {filteredContent.length > 0 && (
            <div className="p-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Content</p>
              {filteredContent.map((c) => {
                const Icon = contentTypeIcons[c.type] || FileText;
                return (
                  <button
                    key={`${c.type}-${c.id}`}
                    onClick={() => {
                      if (c.gradeNum && c.subjectName) {
                        navigate(`/grades/${c.gradeNum}/subjects/${encodeURIComponent(c.subjectName)}`);
                      }
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm text-foreground truncate block">{c.title}</span>
                      <span className="text-xs text-muted-foreground">{c.subject_name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardSearch;
