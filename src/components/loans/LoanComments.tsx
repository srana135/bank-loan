import { useState } from 'react';
import { LoanComment } from '@/types';
import { useLoanComments, useAddComment, useUpdateComment, useDeleteComment } from '@/hooks/useLoans';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Send, Pencil, Trash2, Calendar, X, Check } from 'lucide-react';

interface Props {
  loanId: string;
}

const LoanComments = ({ loanId }: Props) => {
  const { user, profile, userRole } = useAuth();
  const { data: comments, isLoading } = useLoanComments(loanId);
  const addComment = useAddComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const [text, setText] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const canManage = userRole === 'admin' || userRole === 'manager';

  const handleAdd = async () => {
    if (!text.trim() || !user) return;
    await addComment.mutateAsync({
      loan_id: loanId,
      comment_text: text.trim(),
      author_id: user.id,
      author_name: profile?.full_name || user.email || '',
      author_role: userRole || 'employee',
      proposed_repayment_date: proposedDate || null,
    });
    setText('');
    setProposedDate('');
  };

  const handleEdit = (c: LoanComment) => {
    setEditId(c.id);
    setEditText(c.comment_text);
    setEditDate(c.proposed_repayment_date || '');
  };

  const handleSaveEdit = async () => {
    if (!editId || !editText.trim()) return;
    await updateComment.mutateAsync({ id: editId, comment_text: editText.trim(), proposed_repayment_date: editDate || null });
    setEditId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteComment.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Comments</h4>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={text}
            onChange={e => setText(e.target.value)}
            className="text-sm min-h-[60px]"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
          />
          <Button size="icon" onClick={handleAdd} disabled={addComment.isPending || !text.trim()} className="shrink-0 self-end">
            {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="date"
            value={proposedDate}
            onChange={e => setProposedDate(e.target.value)}
            className="h-7 text-xs w-auto"
            placeholder="Proposed Repayment Date"
          />
          <span className="text-[10px] text-muted-foreground">Proposed Repayment Date (optional)</span>
        </div>
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Loading comments...</p>}
      {!isLoading && comments?.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No comments yet.</p>}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {comments?.map((c: LoanComment) => (
          <Card key={c.id} className="border">
            <CardContent className="p-3">
              {editId === c.id ? (
                <div className="space-y-2">
                  <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="text-sm min-h-[50px]" />
                  <div className="flex items-center gap-2">
                    <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-7 text-xs w-auto" />
                    <span className="text-[10px] text-muted-foreground">Proposed Date</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-xs gap-1" onClick={handleSaveEdit} disabled={updateComment.isPending}>
                      <Check className="h-3 w-3" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => setEditId(null)}>
                      <X className="h-3 w-3" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{c.author_name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize h-5">{c.author_role}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{c.comment_text}</p>
                  {c.proposed_repayment_date && (
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-primary font-medium">Proposed: {c.proposed_repayment_date}</span>
                    </div>
                  )}
                  {canManage && (
                    <div className="flex gap-1 mt-1.5 border-t border-border/30 pt-1">
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5 px-1.5" onClick={() => handleEdit(c)}>
                        <Pencil className="h-2.5 w-2.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5 px-1.5 text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-2.5 w-2.5" /> Delete
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this comment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoanComments;
