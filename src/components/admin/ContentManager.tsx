import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Save, X,
  BookOpen, Presentation, Lightbulb, HelpCircle, ClipboardList,
  FileText, Upload, GraduationCap, Link as LinkIcon,
} from "lucide-react";
import FileDropZone from "@/components/admin/FileDropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Grade { id: string; name: string; description: string | null; sort_order: number }
interface Subject { id: string; name: string; description: string | null; grade_id: string; icon: string | null }

const ContentManager = () => {
  const { toast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  // Subject form
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: "", description: "", icon: "" });
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [g, s] = await Promise.all([
        supabase.from("grades").select("*").order("sort_order"),
        supabase.from("subjects").select("*"),
      ]);
      setGrades(g.data || []);
      setSubjects(s.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const gradeSubjects = selectedGrade
    ? subjects.filter((s) => s.grade_id === selectedGrade.id)
    : [];

  const openNewSubject = () => {
    setEditingSubject(null);
    setSubjectForm({ name: "", description: "", icon: "" });
    setSubjectDialog(true);
  };

  const openEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setSubjectForm({ name: s.name, description: s.description || "", icon: s.icon || "" });
    setSubjectDialog(true);
  };

  const saveSubject = async () => {
    if (!subjectForm.name || !selectedGrade) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: subjectForm.name,
      description: subjectForm.description || null,
      icon: subjectForm.icon || null,
      grade_id: selectedGrade.id,
    };
    if (editingSubject) {
      const { error } = await supabase.from("subjects").update(payload).eq("id", editingSubject.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setSubjects((prev) => prev.map((s) => (s.id === editingSubject.id ? { ...s, ...payload } : s)));
    } else {
      const { data, error } = await supabase.from("subjects").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setSubjects((prev) => [...prev, data as Subject]);
    }
    toast({ title: editingSubject ? "Subject updated" : "Subject created" });
    setSubjectDialog(false);
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Subject deleted" });
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading content…</div>;

  // Subject content view
  if (selectedSubject && selectedGrade) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedSubject(null)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to {selectedGrade.name} Subjects
        </Button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-heading text-foreground">{selectedSubject.name}</h2>
          <Badge variant="secondary">{selectedGrade.name}</Badge>
        </div>
        <SubjectContentEditor subjectId={selectedSubject.id} />
      </div>
    );
  }

  // Subjects list for selected grade
  if (selectedGrade) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedGrade(null)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to All Grades
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading text-foreground">{selectedGrade.name}</h2>
            <p className="text-sm text-muted-foreground">{gradeSubjects.length} subjects</p>
          </div>
          <Button onClick={openNewSubject} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Subject
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gradeSubjects.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-lg p-5 shadow-card group hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditSubject(s)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this subject and all its content (notes, quizzes, slides, etc.)
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSubject(s.id)} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubject(s)}
                className="w-full text-left"
              >
                <h3 className="font-medium text-foreground">{s.name}</h3>
                {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
              </button>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 gap-1"
                onClick={() => setSelectedSubject(s)}
              >
                Manage Content <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {gradeSubjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No subjects yet. Add one to get started.
            </div>
          )}
        </div>

        {/* Subject Dialog */}
        <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? "Edit Subject" : "Add Subject"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={subjectForm.name} onChange={(e) => setSubjectForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={subjectForm.description} onChange={(e) => setSubjectForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Icon (emoji or text)</Label>
                <Input value={subjectForm.icon} onChange={(e) => setSubjectForm((p) => ({ ...p, icon: e.target.value }))} placeholder="📚" />
              </div>
              <Button onClick={saveSubject} className="w-full">
                <Save className="h-4 w-4 mr-1" /> {editingSubject ? "Update" : "Create"} Subject
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Grades grid
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading text-foreground">Content Management</h2>
      <p className="text-muted-foreground">Select a grade to manage its subjects and content.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {grades.map((g) => {
          const count = subjects.filter((s) => s.grade_id === g.id).length;
          return (
            <button
              key={g.id}
              onClick={() => setSelectedGrade(g)}
              className="bg-card border border-border rounded-lg p-6 shadow-card text-left hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-heading text-foreground">{g.name}</h3>
              {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary">{count} subjects</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============ Subject Content Editor (Notes, Slides, Quizzes, Exams, Examples) ============

const SubjectContentEditor = ({ subjectId }: { subjectId: string }) => {
  return (
    <Tabs defaultValue="notes" className="w-full">
      <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary p-1 rounded-lg">
        <TabsTrigger value="notes" className="flex items-center gap-1.5 text-sm"><FileText className="h-4 w-4" />Notes</TabsTrigger>
        <TabsTrigger value="slides" className="flex items-center gap-1.5 text-sm"><Presentation className="h-4 w-4" />Slides</TabsTrigger>
        <TabsTrigger value="examples" className="flex items-center gap-1.5 text-sm"><Lightbulb className="h-4 w-4" />Examples</TabsTrigger>
        <TabsTrigger value="quizzes" className="flex items-center gap-1.5 text-sm"><HelpCircle className="h-4 w-4" />Quizzes</TabsTrigger>
        <TabsTrigger value="exams" className="flex items-center gap-1.5 text-sm"><ClipboardList className="h-4 w-4" />Exams</TabsTrigger>
        <TabsTrigger value="exam-papers" className="flex items-center gap-1.5 text-sm"><Upload className="h-4 w-4" />Exam Papers</TabsTrigger>
      </TabsList>

      <TabsContent value="notes" className="mt-4">
        <NotesEditor subjectId={subjectId} />
      </TabsContent>
      <TabsContent value="slides" className="mt-4">
        <SlidesEditor subjectId={subjectId} />
      </TabsContent>
      <TabsContent value="examples" className="mt-4">
        <ExamplesEditor subjectId={subjectId} />
      </TabsContent>
      <TabsContent value="quizzes" className="mt-4">
        <QuizContentEditor subjectId={subjectId} type="quiz" />
      </TabsContent>
      <TabsContent value="exams" className="mt-4">
        <QuizContentEditor subjectId={subjectId} type="exam" />
      </TabsContent>
      <TabsContent value="exam-papers" className="mt-4">
        <ExamPapersEditor subjectId={subjectId} />
      </TabsContent>
    </Tabs>
  );
};

// ============ Notes Editor ============
const NotesEditor = ({ subjectId }: { subjectId: string }) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "" });

  useEffect(() => {
    supabase.from("notes").select("*").eq("subject_id", subjectId).order("sort_order")
      .then(({ data }) => { setNotes(data || []); setLoading(false); });
  }, [subjectId]);

  const save = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    const payload = { title: form.title, content: form.content || null, subject_id: subjectId, sort_order: editing?.sort_order ?? notes.length };
    if (editing) {
      const { error } = await supabase.from("notes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setNotes((p) => p.map((n) => (n.id === editing.id ? { ...n, ...payload } : n)));
    } else {
      const { data, error } = await supabase.from("notes").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setNotes((p) => [...p, data]);
    }
    toast({ title: editing ? "Note updated" : "Note created" });
    setDialog(false);
  };

  const remove = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((p) => p.filter((n) => n.id !== id));
    toast({ title: "Note deleted" });
  };

  if (loading) return <div className="p-4 text-muted-foreground">Loading notes…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{notes.length} notes</span>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ title: "", content: "" }); setDialog(true); }} className="gap-1">
          <Plus className="h-3 w-3" /> Add Note
        </Button>
      </div>
      {notes.map((n) => (
        <div key={n.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground">{n.title}</h4>
            {n.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content.slice(0, 150)}…</p>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(n); setForm({ title: n.title, content: n.content || "" }); setDialog(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(n.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Note" : "Add Note"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Content (Markdown supported)</Label><Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={12} className="font-mono text-sm" /></div>
            <Button onClick={save} className="w-full"><Save className="h-4 w-4 mr-1" /> {editing ? "Update" : "Create"} Note</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============ Slides Editor ============
const SlidesEditor = ({ subjectId }: { subjectId: string }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("slides").select("*").eq("subject_id", subjectId).order("sort_order")
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [subjectId]);

  const save = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    let fileUrl = editing?.file_url || null;

    if (file) {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `slides/${subjectId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("content-files").upload(path, file);
      if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("content-files").getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      setUploading(false);
    }

    const payload = { title: form.title, content: form.content || null, file_url: fileUrl, subject_id: subjectId, sort_order: editing?.sort_order ?? items.length };
    if (editing) {
      const { error } = await supabase.from("slides").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setItems((p) => p.map((n) => (n.id === editing.id ? { ...n, ...payload } : n)));
    } else {
      const { data, error } = await supabase.from("slides").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setItems((p) => [...p, data]);
    }
    toast({ title: editing ? "Slide updated" : "Slide created" });
    setDialog(false);
    setFile(null);
  };

  const remove = async (id: string) => {
    await supabase.from("slides").delete().eq("id", id);
    setItems((p) => p.filter((n) => n.id !== id));
    toast({ title: "Slide deleted" });
  };

  if (loading) return <div className="p-4 text-muted-foreground">Loading slides…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{items.length} slides</span>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ title: "", content: "" }); setFile(null); setDialog(true); }} className="gap-1">
          <Plus className="h-3 w-3" /> Add Slide
        </Button>
      </div>
      {items.map((n) => (
        <div key={n.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              {n.title}
              {n.file_url && <Badge variant="secondary" className="text-xs">File</Badge>}
            </h4>
            {n.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content.slice(0, 150)}…</p>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(n); setForm({ title: n.title, content: n.content || "" }); setFile(null); setDialog(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(n.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Slide" : "Add Slide"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Content (optional text)</Label><Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={6} /></div>
            <div className="space-y-2">
              <Label>Upload File (PDF/PPT)</Label>
              <Input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {editing?.file_url && <p className="text-xs text-muted-foreground">Current file: <a href={editing.file_url} target="_blank" className="text-primary hover:underline">View</a></p>}
            </div>
            <Button onClick={save} disabled={uploading} className="w-full">
              {uploading ? "Uploading…" : <><Save className="h-4 w-4 mr-1" /> {editing ? "Update" : "Create"} Slide</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============ Worked Examples Editor ============
const ExamplesEditor = ({ subjectId }: { subjectId: string }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("worked_examples").select("*").eq("subject_id", subjectId).order("sort_order")
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [subjectId]);

  const save = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    let fileUrl = editing?.file_url || null;

    if (file) {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `examples/${subjectId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("content-files").upload(path, file);
      if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("content-files").getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      setUploading(false);
    }

    const payload = { title: form.title, content: form.content || null, file_url: fileUrl, subject_id: subjectId, sort_order: editing?.sort_order ?? items.length };
    if (editing) {
      const { error } = await supabase.from("worked_examples").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setItems((p) => p.map((n) => (n.id === editing.id ? { ...n, ...payload } : n)));
    } else {
      const { data, error } = await supabase.from("worked_examples").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setItems((p) => [...p, data]);
    }
    toast({ title: editing ? "Example updated" : "Example created" });
    setDialog(false);
    setFile(null);
  };

  const remove = async (id: string) => {
    await supabase.from("worked_examples").delete().eq("id", id);
    setItems((p) => p.filter((n) => n.id !== id));
    toast({ title: "Example deleted" });
  };

  if (loading) return <div className="p-4 text-muted-foreground">Loading examples…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{items.length} worked examples</span>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ title: "", content: "" }); setFile(null); setDialog(true); }} className="gap-1">
          <Plus className="h-3 w-3" /> Add Example
        </Button>
      </div>
      {items.map((n) => (
        <div key={n.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              {n.title}
              {n.file_url && <Badge variant="secondary" className="text-xs">File</Badge>}
            </h4>
            {n.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content.slice(0, 150)}…</p>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(n); setForm({ title: n.title, content: n.content || "" }); setFile(null); setDialog(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(n.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Example" : "Add Worked Example"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Content (Markdown supported)</Label><Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={10} className="font-mono text-sm" /></div>
            <div className="space-y-2">
              <Label>Upload File (optional)</Label>
              <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {editing?.file_url && <p className="text-xs text-muted-foreground">Current file: <a href={editing.file_url} target="_blank" className="text-primary hover:underline">View</a></p>}
            </div>
            <Button onClick={save} disabled={uploading} className="w-full">
              {uploading ? "Uploading…" : <><Save className="h-4 w-4 mr-1" /> {editing ? "Update" : "Create"} Example</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============ Quiz/Exam Content Editor ============
const QuizContentEditor = ({ subjectId, type }: { subjectId: string; type: "quiz" | "exam" }) => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", time_limit_minutes: "" });

  // Questions
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [qDialog, setQDialog] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);
  const [qForm, setQForm] = useState({ question: "", options: ["", "", "", ""], correct_answer: "", explanation: "" });

  useEffect(() => {
    supabase.from("quizzes").select("*").eq("subject_id", subjectId).eq("type", type).order("created_at", { ascending: false })
      .then(({ data }) => { setQuizzes(data || []); setLoading(false); });
  }, [subjectId, type]);

  const saveQuiz = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    const payload = {
      title: form.title,
      description: form.description || null,
      subject_id: subjectId,
      time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes) : null,
      type,
    };
    if (editing) {
      const { error } = await supabase.from("quizzes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setQuizzes((p) => p.map((q) => (q.id === editing.id ? { ...q, ...payload } : q)));
    } else {
      const { data, error } = await supabase.from("quizzes").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setQuizzes((p) => [data, ...p]);
    }
    toast({ title: editing ? `${type === "exam" ? "Exam" : "Quiz"} updated` : `${type === "exam" ? "Exam" : "Quiz"} created` });
    setDialog(false);
  };

  const deleteQuiz = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("quiz_id", id);
    await supabase.from("quizzes").delete().eq("id", id);
    setQuizzes((p) => p.filter((q) => q.id !== id));
    if (expandedQuiz === id) setExpandedQuiz(null);
    toast({ title: `${type === "exam" ? "Exam" : "Quiz"} deleted` });
  };

  const toggleQuestions = async (quizId: string) => {
    if (expandedQuiz === quizId) { setExpandedQuiz(null); return; }
    setExpandedQuiz(quizId);
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");
    setQuestions((data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })));
  };

  const saveQuestion = async () => {
    if (!qForm.question || !qForm.correct_answer || !expandedQuiz) {
      toast({ title: "Question and answer required", variant: "destructive" }); return;
    }
    const validOpts = qForm.options.filter((o) => o.trim());
    if (validOpts.length < 2) { toast({ title: "At least 2 options", variant: "destructive" }); return; }
    const payload = {
      quiz_id: expandedQuiz,
      question: qForm.question,
      options: validOpts,
      correct_answer: qForm.correct_answer,
      explanation: qForm.explanation || null,
      sort_order: editingQ?.sort_order ?? questions.length,
    };
    if (editingQ) {
      await supabase.from("quiz_questions").update(payload).eq("id", editingQ.id);
    } else {
      await supabase.from("quiz_questions").insert(payload);
    }
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", expandedQuiz).order("sort_order");
    setQuestions((data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })));
    toast({ title: editingQ ? "Question updated" : "Question added" });
    setQDialog(false);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    setQuestions((p) => p.filter((q) => q.id !== id));
    toast({ title: "Question deleted" });
  };

  const label = type === "exam" ? "Exam" : "Quiz";
  if (loading) return <div className="p-4 text-muted-foreground">Loading {label.toLowerCase()}es…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{quizzes.length} {label.toLowerCase()}(es)</span>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ title: "", description: "", time_limit_minutes: "" }); setDialog(true); }} className="gap-1">
          <Plus className="h-3 w-3" /> Add {label}
        </Button>
      </div>

      <div className="space-y-2">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
              <button onClick={() => toggleQuestions(quiz.id)} className="text-muted-foreground hover:text-foreground">
                {expandedQuiz === quiz.id ? <ChevronLeft className="h-4 w-4 rotate-[-90deg]" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{quiz.title}</div>
                {quiz.time_limit_minutes && <span className="text-xs text-muted-foreground">⏱ {quiz.time_limit_minutes} min</span>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(quiz); setForm({ title: quiz.title, description: quiz.description || "", time_limit_minutes: quiz.time_limit_minutes?.toString() || "" }); setDialog(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteQuiz(quiz.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {expandedQuiz === quiz.id && (
              <div className="bg-muted/30 border-t border-border px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Questions ({questions.length})</span>
                  <Button size="sm" variant="outline" onClick={() => { setEditingQ(null); setQForm({ question: "", options: ["", "", "", ""], correct_answer: "", explanation: "" }); setQDialog(true); }} className="gap-1">
                    <Plus className="h-3 w-3" /> Add Question
                  </Button>
                </div>
                {questions.map((q, i) => (
                  <div key={q.id} className="bg-card border border-border rounded-md p-3 flex items-start gap-3">
                    <span className="text-xs text-muted-foreground font-mono mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{q.question}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(q.options as string[]).map((opt: string, j: number) => (
                          <Badge key={j} variant={opt === q.correct_answer ? "default" : "secondary"} className="text-xs">{opt}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                        setEditingQ(q);
                        const opts = [...(q.options as string[]), "", "", "", ""].slice(0, 4);
                        setQForm({ question: q.question, options: opts, correct_answer: q.correct_answer, explanation: q.explanation || "" });
                        setQDialog(true);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteQuestion(q.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quiz/Exam Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? `Edit ${label}` : `Create ${label}`}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Time Limit (minutes, optional)</Label><Input type="number" value={form.time_limit_minutes} onChange={(e) => setForm((p) => ({ ...p, time_limit_minutes: e.target.value }))} /></div>
            <Button onClick={saveQuiz} className="w-full"><Save className="h-4 w-4 mr-1" /> {editing ? "Update" : "Create"} {label}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={qDialog} onOpenChange={setQDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingQ ? "Edit Question" : "Add Question"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Question</Label><Textarea value={qForm.question} onChange={(e) => setQForm((p) => ({ ...p, question: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Options</Label>
              {qForm.options.map((opt, i) => (
                <Input key={i} placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => {
                  const newOpts = [...qForm.options]; newOpts[i] = e.target.value;
                  setQForm((p) => ({ ...p, options: newOpts }));
                }} />
              ))}
            </div>
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <select className="w-full border border-border rounded-md p-2 bg-background text-foreground" value={qForm.correct_answer} onChange={(e) => setQForm((p) => ({ ...p, correct_answer: e.target.value }))}>
                <option value="">Select…</option>
                {qForm.options.filter((o) => o.trim()).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Explanation (optional)</Label><Textarea value={qForm.explanation} onChange={(e) => setQForm((p) => ({ ...p, explanation: e.target.value }))} /></div>
            <Button onClick={saveQuestion} className="w-full"><Save className="h-4 w-4 mr-1" /> {editingQ ? "Update" : "Add"} Question</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============ Exam Papers Editor (PDF Upload) ============
const PROVINCES = [
  "Common Papers", "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];
const TERMS = ["Term 1", "Term 2", "Term 3", "Term 4"];
const YEARS = Array.from({ length: 8 }, (_, i) => 2025 - i);

const ExamPapersEditor = ({ subjectId }: { subjectId: string }) => {
  const { toast } = useToast();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", province: "", term: "", year: "2025" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("exam_papers").select("*").eq("subject_id", subjectId).order("year", { ascending: false }).order("term")
      .then(({ data }) => { setPapers(data || []); setLoading(false); });
  }, [subjectId]);

  const save = async () => {
    if (!form.title || !form.province || !form.term || !form.year) {
      toast({ title: "All fields are required", variant: "destructive" }); return;
    }
    let fileUrl = editing?.file_url || null;

    if (file) {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `exam-papers/${subjectId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("content-files").upload(path, file);
      if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("content-files").getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      setUploading(false);
    }

    const payload = {
      title: form.title,
      province: form.province,
      term: form.term,
      year: parseInt(form.year),
      file_url: fileUrl,
      subject_id: subjectId,
    };

    if (editing) {
      const { error } = await supabase.from("exam_papers").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setPapers((p) => p.map((ep) => (ep.id === editing.id ? { ...ep, ...payload } : ep)));
    } else {
      const { data, error } = await supabase.from("exam_papers").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setPapers((p) => [data, ...p]);
    }
    toast({ title: editing ? "Exam paper updated" : "Exam paper added" });
    setDialog(false);
    setFile(null);
  };

  const remove = async (id: string) => {
    await supabase.from("exam_papers").delete().eq("id", id);
    setPapers((p) => p.filter((ep) => ep.id !== id));
    toast({ title: "Exam paper deleted" });
  };

  if (loading) return <div className="p-4 text-muted-foreground">Loading exam papers…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{papers.length} exam papers</span>
        <Button size="sm" onClick={() => {
          setEditing(null);
          setForm({ title: "", province: "", term: "", year: "2025" });
          setFile(null);
          setDialog(true);
        }} className="gap-1">
          <Plus className="h-3 w-3" /> Add Exam Paper
        </Button>
      </div>

      {papers.map((paper) => (
        <div key={paper.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground">{paper.title}</h4>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <Badge variant="secondary" className="text-xs">{paper.province}</Badge>
              <Badge variant="outline" className="text-xs">{paper.term}</Badge>
              <Badge variant="outline" className="text-xs">{paper.year}</Badge>
              {paper.file_url ? (
                <Badge variant="default" className="text-xs gap-0.5"><Upload className="h-2.5 w-2.5" /> PDF</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">No file</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
              setEditing(paper);
              setForm({ title: paper.title, province: paper.province, term: paper.term, year: String(paper.year) });
              setFile(null);
              setDialog(true);
            }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(paper.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {papers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No exam papers uploaded yet.</p>
          <p className="text-xs mt-1">Upload past papers so learners can practice in lockdown mode.</p>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Exam Paper" : "Add Exam Paper"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Physical Sciences P1 June 2024" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Province</Label>
                <select
                  className="w-full border border-border rounded-md p-2 bg-background text-foreground text-sm"
                  value={form.province}
                  onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {PROVINCES.map((pr) => <option key={pr} value={pr}>{pr}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <select
                  className="w-full border border-border rounded-md p-2 bg-background text-foreground text-sm"
                  value={form.term}
                  onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <select
                  className="w-full border border-border rounded-md p-2 bg-background text-foreground text-sm"
                  value={form.year}
                  onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                >
                  {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Upload PDF</Label>
              <Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {editing?.file_url && <p className="text-xs text-muted-foreground">Current file: <a href={editing.file_url} target="_blank" className="text-primary hover:underline">View PDF</a></p>}
            </div>
            <Button onClick={save} disabled={uploading} className="w-full">
              {uploading ? "Uploading…" : <><Save className="h-4 w-4 mr-1" /> {editing ? "Update" : "Add"} Exam Paper</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManager;
