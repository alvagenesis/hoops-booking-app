import { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Auto-create profile if it doesn't exist (user created before trigger was set up)
    if (!data) {
      const meta = (await supabase.auth.getUser())?.data?.user?.user_metadata || {};
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: meta.first_name || '',
          last_name: meta.last_name || '',
          phone: meta.phone || '',
          address: meta.address || '',
        })
        .select()
        .maybeSingle();
      data = newProfile;
    }
    setProfile(data);
  }

  useEffect(() => {
    if (!supabase) {
      // Supabase not configured — skip auth
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signUp({ email, password, firstName, lastName, phone, address }) {
    if (!supabase) {
      // Demo mode fallback
      const demoUser = { id: 'demo', email };
      setUser(demoUser);
      setProfile({ id: 'demo', first_name: firstName, last_name: lastName, phone, address, role: 'admin' });
      return { needsConfirmation: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName }
      }
    });
    if (error) throw error;

    // If Supabase requires email confirmation, session will be null
    const needsConfirmation = !data.session;

    if (data.user && data.session) {
      await supabase.from('profiles').update({ phone, address }).eq('id', data.user.id);
    }
    return { needsConfirmation, data };
  }

  async function signIn({ email, password }) {
    if (!supabase) {
      // Demo mode fallback
      const demoUser = { id: 'demo', email };
      setUser(demoUser);
      setProfile({ id: 'demo', first_name: 'John', last_name: 'Doe', role: 'admin' });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    if (!supabase) {
      const demoUser = { id: 'demo', email: 'demo@hoopshq.com' };
      setUser(demoUser);
      setProfile({ id: 'demo', first_name: 'John', last_name: 'Doe', role: 'admin' });
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    });
    if (error) throw error;
    return data;
  }

  async function signInWithFacebook() {
    if (!supabase) {
      const demoUser = { id: 'demo', email: 'demo@hoopshq.com' };
      setUser(demoUser);
      setProfile({ id: 'demo', first_name: 'John', last_name: 'Doe', role: 'admin' });
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin + '/dashboard' }
    });
    if (error) throw error;
    return data;
  }

  async function resetPassword(email) {
    if (!supabase) {
      // Demo mode: just pretend it worked
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/profile',
    });
    if (error) throw error;
  }

  async function updateProfile(updates) {
    if (!supabase) {
      setProfile(prev => ({ ...prev, ...updates }));
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) throw error;
    setProfile(prev => ({ ...prev, ...updates }));
  }

  async function uploadAvatar(file) {
    if (!supabase) {
      // Demo mode: create a local object URL
      const url = URL.createObjectURL(file);
      setProfile(prev => ({ ...prev, avatar_url: url }));
      return url;
    }
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    // Bust cache with timestamp
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;
    await updateProfile({ avatar_url: avatarUrl });
    return avatarUrl;
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  }

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email || 'User'
    : user?.email || 'User';

  const role = profile?.role || 'user';

  return (
    <AuthContext.Provider value={{ user, profile, loading, displayName, role, signUp, signIn, signInWithGoogle, signInWithFacebook, resetPassword, updateProfile, uploadAvatar, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

