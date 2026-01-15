import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, company: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const checkRateLimit = async (identifier: string, attemptType: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('check_auth_rate_limit', {
    p_identifier: identifier,
    p_attempt_type: attemptType,
    p_max_attempts: 5,
    p_window_minutes: 15
  });
  if (error) {
    console.error('Rate limit check error:', error);
    return false; // Fail open to not block legitimate users
  }
  return data === true;
};

const recordAuthAttempt = async (identifier: string, attemptType: string, success: boolean): Promise<void> => {
  await supabase.rpc('record_auth_attempt', {
    p_identifier: identifier,
    p_attempt_type: attemptType,
    p_success: success
  });
};

const clearRateLimit = async (identifier: string, attemptType: string): Promise<void> => {
  await supabase.rpc('clear_auth_rate_limit', {
    p_identifier: identifier,
    p_attempt_type: attemptType
  });
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, company: string) => {
    // Check rate limit before attempting signup
    const isRateLimited = await checkRateLimit(email, 'signup');
    if (isRateLimited) {
      return { error: new Error('Too many signup attempts. Please try again in 15 minutes.') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          company_name: company,
        },
      },
    });

    // Record the attempt
    await recordAuthAttempt(email, 'signup', !error);
    
    if (!error) {
      await clearRateLimit(email, 'signup');
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Check rate limit before attempting login
    const isRateLimited = await checkRateLimit(email, 'login');
    if (isRateLimited) {
      return { error: new Error('Too many login attempts. Please try again in 15 minutes.') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Record the attempt
    await recordAuthAttempt(email, 'login', !error);
    
    if (!error) {
      await clearRateLimit(email, 'login');
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
