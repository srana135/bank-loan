import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Save, KeyRound, User, Mail, Phone, Building2, Shield, Hash, Camera } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const UserProfile = () => {
  const { user, profile, userRole, refreshProfile } = useAuth();
  const { data: branches } = useBranches();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [mobile, setMobile] = useState(profile?.mobile || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const branchName = branches?.find(b => b.id === profile?.branch_id)?.branch_name;

  // Try to get avatar URL from storage
  const getAvatarUrl = () => {
    if (avatarUrl) return avatarUrl;
    if (!user) return null;
    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(`${user.id}/avatar`);
      return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
    } catch {
      return null;
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File must be under 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const filePath = `${user.id}/avatar`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
      toast.success('Profile picture updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar. Please ensure the "avatars" storage bucket exists in Supabase.');
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim(),
        mobile: mobile.trim() || null,
      }).eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    }
    setChangingPassword(false);
  };

  if (!user || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (profile.full_name || user.email || 'U').slice(0, 2).toUpperCase();
  const currentAvatarUrl = getAvatarUrl();

  return (
    <div className="container max-w-2xl py-6 px-4 space-y-6">
      <h1 className="font-heading text-2xl font-bold">My Profile</h1>

      {/* Profile Overview Card */}
      <Card className="card-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={currentAvatarUrl || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="text-center sm:text-left space-y-1 flex-1">
              <h2 className="text-xl font-heading font-bold">{profile.full_name || 'User'}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start pt-1">
                <Badge variant="secondary" className="capitalize text-xs">{userRole || 'user'}</Badge>
                {branchName && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Building2 className="h-3 w-3" />{branchName}
                  </Badge>
                )}
                <Badge variant={profile.is_active ? 'default' : 'destructive'} className="text-xs">
                  {profile.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">Click photo to change • JPG/PNG/WebP, max 2MB</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono font-medium">{profile.user_id || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Mobile:</span>
              <span className="font-medium">{profile.mobile || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium capitalize">{userRole}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Card */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" /> Edit Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="space-y-2">
            <Label>Mobile Number</Label>
            <Input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-primary" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" />
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" className="gap-2 w-full sm:w-auto">
            {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;