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
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, Download, Trash2, Eye, FileImage, File } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceFile } from '@/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const fileTypeIcon = (type: string | null) => {
  if (!type) return <File className="h-5 w-5 text-muted-foreground" />;
  if (type.startsWith('image/')) return <FileImage className="h-5 w-5 text-primary" />;
  if (type.includes('pdf')) return <FileText className="h-5 w-5 text-destructive" />;
  return <FileText className="h-5 w-5 text-accent" />;
};

const fileTypeBadge = (type: string | null) => {
  if (!type) return 'File';
  if (type.startsWith('image/')) return 'Image';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || type.includes('document')) return 'DOC';
  return 'File';
};

const ServiceProductList = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');

  const canUpload = userRole === 'admin' || userRole === 'manager';

  const { data: files, isLoading, error } = useQuery({
    queryKey: ['service-files'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_files').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ServiceFile[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sf: ServiceFile) => {
      if (sf.file_path) await supabase.storage.from('documents').remove([sf.file_path]);
      const { error } = await supabase.from('service_files').delete().eq('id', sf.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['service-files'] }); toast.success('File deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpload = async () => {
    if (!file || !title.trim()) { toast.error('Title and file are required'); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Only images, PDFs, and DOC/DOCX files are allowed'); return; }
    if (file.size > MAX_SIZE) { toast.error('File size must be under 20MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `service-files/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from('service_files').insert({
        title: title.trim(),
        description: description.trim() || null,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        uploaded_by: user?.id,
        visible_to: 'all',
      });
      if (insertErr) throw insertErr;

      queryClient.invalidateQueries({ queryKey: ['service-files'] });
      toast.success('File uploaded');
      setTitle(''); setDescription(''); setFile(null); setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const openPreview = (sf: ServiceFile) => {
    if (!sf.file_path) return;
    const url = getPublicUrl(sf.file_path);
    setPreviewUrl(url);
    setPreviewType(sf.file_type || '');
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Service / Product List</h1>
          <p className="text-sm text-muted-foreground">Browse and manage service documents</p>
        </div>
        {canUpload && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Upload className="h-4 w-4" /> Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" /></div>
                <div className="space-y-2">
                  <Label>File * (Image, PDF, DOC/DOCX — max 20MB)</Label>
                  <Input type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} />
                  {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
                </div>
                <Button onClick={handleUpload} disabled={uploading} className="w-full">
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</> : 'Upload'}
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
            <Card key={f.id} className="card-shadow hover:elevated-shadow transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start gap-2">
                  {fileTypeIcon(f.file_type)}
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{f.title}</span>
                    <Badge variant="outline" className="text-[10px] mt-1">{fileTypeBadge(f.file_type)}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {f.description && <p className="text-sm text-muted-foreground mb-3">{f.description}</p>}
                <p className="text-xs text-muted-foreground mb-3 truncate">{f.file_name}</p>
                <div className="flex gap-2">
                  {f.file_path && (f.file_type?.startsWith('image/') || f.file_type?.includes('pdf')) && (
                    <Button size="sm" variant="outline" onClick={() => openPreview(f)} className="gap-1">
                      <Eye className="h-3 w-3" /> Preview
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <a href={f.file_path ? getPublicUrl(f.file_path) : '#'} target="_blank" rel="noopener noreferrer" download className="gap-1">
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </Button>
                  {canUpload && (
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm('Delete this file?')) deleteMutation.mutate(f); }} className="gap-1">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => { setPreviewUrl(null); setPreviewType(''); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
          {previewUrl && previewType.startsWith('image/') && (
            <img src={previewUrl} alt="Preview" className="w-full max-h-[70vh] object-contain rounded" />
          )}
          {previewUrl && previewType.includes('pdf') && (
            <iframe src={previewUrl} className="w-full h-[70vh] rounded border" title="PDF Preview" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceProductList;
