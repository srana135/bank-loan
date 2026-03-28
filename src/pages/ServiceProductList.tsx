import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileText, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceFile } from '@/types';

const ServiceProductList = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [visibleTo, setVisibleTo] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const canUpload = userRole === 'admin' || userRole === 'manager';

  const { data: files, isLoading, error } = useQuery({
    queryKey: ['service-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_files')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ServiceFile[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sf: ServiceFile) => {
      if (sf.file_path) {
        await supabase.storage.from('documents').remove([sf.file_path]);
      }
      const { error } = await supabase.from('service_files').delete().eq('id', sf.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-files'] });
      toast.success('File deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error('Please provide a title and file');
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `service-files/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('service_files').insert({
        title: title.trim(),
        description: description.trim() || null,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || fileExt,
        uploaded_by: user?.id,
        visible_to: visibleTo,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['service-files'] });
      toast.success('File uploaded successfully');
      setTitle(''); setDescription(''); setFile(null); setVisibleTo('all');
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Service / Product List</h1>
          <p className="text-muted-foreground mt-1">Browse uploaded service and product documents</p>
        </div>
        {canUpload && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Upload className="h-4 w-4" /> Upload File</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={visibleTo} onValueChange={setVisibleTo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admin">Admin Only</SelectItem>
                      <SelectItem value="manager">Manager & Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>File *</Label>
                  <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
                </div>
                <Button onClick={handleUpload} disabled={uploading} className="w-full">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {error && <Card><CardContent className="py-8 text-center text-destructive">Failed to load documents.</CardContent></Card>}
      {!isLoading && !error && files?.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
          No documents uploaded yet.
        </CardContent></Card>
      )}
      {files && files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(f => (
            <Card key={f.id} className="card-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start gap-2">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  {f.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {f.description && <p className="text-sm text-muted-foreground mb-3">{f.description}</p>}
                <p className="text-xs text-muted-foreground mb-3">{f.file_name}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={f.file_path ? getPublicUrl(f.file_path) : '#'} target="_blank" rel="noopener noreferrer" className="gap-1">
                      <Download className="h-3 w-3" /> View
                    </a>
                  </Button>
                  {canUpload && (
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(f)} className="gap-1">
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceProductList;
