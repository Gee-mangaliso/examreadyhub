import { useState, useRef, useCallback } from "react";
import { Upload, Link as LinkIcon, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface FileDropZoneProps {
  accept?: string;
  label?: string;
  currentFileUrl?: string | null;
  onFileSelected: (file: File) => void;
  onUrlProvided?: (url: string) => void;
}

const FileDropZone = ({ accept = ".pdf,.ppt,.pptx,.doc,.docx", label = "Upload File", currentFileUrl, onFileSelected, onUrlProvided }: FileDropZoneProps) => {
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelected(file);
    }
  }, [onFileSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelected(file);
    }
  };

  const handleUrlSubmit = () => {
    if (!url.trim()) return;
    if (!url.startsWith("http")) {
      toast({ title: "Invalid URL", description: "Please enter a valid URL starting with http:// or https://", variant: "destructive" });
      return;
    }
    onUrlProvided?.(url.trim());
    setFileName(url.split("/").pop() || "Online file");
    setShowUrlInput(false);
    setUrl("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          <span className="text-primary font-medium">Click to browse</span> or drag & drop files here
        </p>
        <p className="text-xs text-muted-foreground mt-1">Accepts: {accept}</p>
      </div>

      {fileName && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm text-foreground truncate flex-1">{fileName}</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setFileName(null); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {currentFileUrl && !fileName && (
        <p className="text-xs text-muted-foreground">
          Current file: <a href={currentFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a>
        </p>
      )}

      {onUrlProvided && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t border-border" />
          </div>
          {showUrlInput ? (
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/file.pdf"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleUrlSubmit}>Fetch</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowUrlInput(false); setUrl(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={(e) => { e.stopPropagation(); setShowUrlInput(true); }}>
              <LinkIcon className="h-3.5 w-3.5" /> Fetch from URL
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default FileDropZone;
