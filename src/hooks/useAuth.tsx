import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface BanInfo {
  is_banned: boolean;
  reason?: string;
  ends_at?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { full_name: string; avatar_url: string | null; grade: string | null; phone_number: string | null } | null;
  isAdmin: boolean;
  isTeacher: boolean;
  userRole: string;
  loading: boolean;
  banInfo: BanInfo | null;
  restrictions: any[];
  signUp: (email: string, password: string, fullName: string, role?: string, phoneNumber?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [restrictions, setRestrictions] = useState<any[]>([]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, grade, phone_number")
      .eq("user_id", userId)
      .single();
    setProfile(data);

    // Check roles
    const { data: adminData } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: teacherData } = await supabase.rpc("has_role", { _user_id: userId, _role: "teacher" });
    setIsAdmin(adminData === true);
    setIsTeacher(teacherData === true);
    setUserRole(adminData === true ? "admin" : teacherData === true ? "teacher" : "user");

    // Check for active bans and restrictions
    const { data: restrictionsData } = await supabase
      .from("user_restrictions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const now = new Date();
    const active = (restrictionsData || []).filter((r: any) =>
      !r.ends_at || new Date(r.ends_at) > now
    );

    const activeBan = active.find((r: any) => r.restriction_type === "ban");
    if (activeBan) {
      setBanInfo({ is_banned: true, reason: activeBan.reason, ends_at: activeBan.ends_at });
    } else {
      setBanInfo(null);
    }
    setRestrictions(active.filter((r: any) => r.restriction_type === "content_restriction"));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: string = "user", phoneNumber?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role, phone_number: phoneNumber || null },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsTeacher(false);
    setUserRole("user");
    setBanInfo(null);
    setRestrictions([]);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isTeacher, userRole, loading, banInfo, restrictions, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
