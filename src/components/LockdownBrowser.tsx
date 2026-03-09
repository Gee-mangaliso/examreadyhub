import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Camera, CameraOff, Maximize, Shield } from "lucide-react";

interface LockdownBrowserProps {
  quizId: string;
  activityId?: string;
  onReady: () => void;
  onViolation: (type: string) => void;
  children: React.ReactNode;
}

const LockdownBrowser = ({ quizId, activityId, onReady, onViolation, children }: LockdownBrowserProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLocked, setIsLocked] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addViolation = useCallback(async (type: string) => {
    const v = { type, timestamp: new Date().toISOString() };
    setViolations((prev) => [...prev, v]);
    onViolation(type);
    toast({ title: "⚠️ Violation Detected", description: `${type} — this has been recorded.`, variant: "destructive" });
    if (sessionId) {
      const allViolations = [...violations, v];
      await supabase.from("lockdown_sessions").update({ violations: allViolations }).eq("id", sessionId);
    }
  }, [sessionId, violations, onViolation, toast]);

  useEffect(() => {
    if (!isLocked) return;

    const handleVisibilityChange = () => {
      if (document.hidden) addViolation("Tab switch detected");
    };
    const handleBlur = () => addViolation("Window lost focus");
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common escape keys
      if (e.key === "Escape" || (e.altKey && e.key === "Tab") || (e.ctrlKey && e.key === "w")) {
        e.preventDefault();
        addViolation(`Blocked key: ${e.key}`);
      }
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isLocked) {
        addViolation("Exited fullscreen");
        // Re-enter fullscreen
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isLocked, addViolation]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStream(stream);
      setWebcamEnabled(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast({ title: "Webcam access denied", description: "Webcam monitoring is required for this exam.", variant: "destructive" });
    }
  };

  const startLockdown = async () => {
    // Request fullscreen
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      toast({ title: "Fullscreen required", description: "Please allow fullscreen mode.", variant: "destructive" });
      return;
    }

    // Start webcam
    await startWebcam();

    // Create lockdown session
    if (user) {
      const { data } = await supabase.from("lockdown_sessions").insert({
        user_id: user.id,
        quiz_id: quizId,
        activity_id: activityId || null,
        webcam_enabled: true,
        status: "active",
      }).select("id").single();
      if (data) setSessionId(data.id);
    }

    setIsLocked(true);
    onReady();
  };

  const endLockdown = async () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      setWebcamStream(null);
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (sessionId) {
      await supabase.from("lockdown_sessions").update({ ended_at: new Date().toISOString(), status: "completed" }).eq("id", sessionId);
    }
    setIsLocked(false);
    setWebcamEnabled(false);
  };

  if (!isLocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-card text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-heading text-foreground">Lockdown Browser Required</h2>
          <p className="text-sm text-muted-foreground">This exam requires secure browser mode. The following restrictions will apply:</p>
          <ul className="text-sm text-muted-foreground text-left space-y-2">
            <li className="flex items-center gap-2"><Maximize className="h-4 w-4 text-primary shrink-0" /> Fullscreen mode (cannot exit)</li>
            <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary shrink-0" /> Tab switching is monitored</li>
            <li className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary shrink-0" /> Webcam monitoring enabled</li>
          </ul>
          <Button onClick={startLockdown} className="w-full" size="lg">
            Start Secure Exam
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Webcam feed - small overlay */}
      {webcamEnabled && (
        <div className="fixed top-4 right-4 z-50 w-32 h-24 rounded-lg overflow-hidden border-2 border-primary shadow-lg">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}
      {/* Violation counter */}
      {violations.length > 0 && (
        <div className="fixed top-4 left-4 z-50 bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-full text-xs font-medium">
          {violations.length} violation{violations.length !== 1 ? "s" : ""}
        </div>
      )}
      {children}
    </div>
  );
};

export { LockdownBrowser };
export type { LockdownBrowserProps };
