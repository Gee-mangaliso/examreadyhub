import { useEffect, useState } from "react";
import { User, Camera, Save } from "lucide-react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Grade { id: string; name: string }

const ProfileSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setGrade(profile.grade || "");
      setAvatarUrl(profile.avatar_url);
    }
    supabase.from("grades").select("id, name").order("sort_order")
      .then(({ data }) => setGrades(data || []));
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(publicUrl);

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    toast({ title: "Avatar updated!" });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, grade: grade || null })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
    }
    setSaving(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-lg mx-auto">
            <h1 className="text-3xl font-heading text-foreground text-center mb-8">Profile Settings</h1>

            <div className="bg-card border border-border rounded-lg p-6 shadow-card space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-primary" />
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </div>
                {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
              </div>

              {/* Full name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="opacity-60" />
              </div>

              {/* Preferred grade */}
              <div className="space-y-2">
                <Label>Preferred Grade</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(g => (
                      <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default ProfileSettings;
