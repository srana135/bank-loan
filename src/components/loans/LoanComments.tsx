import { useState } from 'react';
import { LoanComment } from '@/types';
import { useLoanComments, useAddComment } from '@/hooks/useLoans';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';

interface Props {
  loanId: string;
}

const LoanComments = ({ loanId }: Props) => {
  const { user, profile, userRole } = useAuth();
  const { data: comments, isLoading } = useLoanComments(loanId);
  const addComment = useAddComment();
  const [text, setText] = useState('');

  const handleAdd = async () => {
    if (!text.trim() || !user) return;
    await addComment.mutateAsync({
      loan_id: loanId,
      comment_text: text.trim(),
      author_id: user.id,
      author_name: profile?.full_name || user.email || '',
      author_role: userRole || 'employee',
    });
    setText('');
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Comments</h4>
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
      {isLoading && <p className="text-xs text-muted-foreground">Loading comments...</p>}
      {!isLoading && comments?.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No comments yet.</p>}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {comments?.map((c: LoanComment) => (
          <Card key={c.id} className="border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">{c.author_name}</span>
                <Badge variant="outline" className="text-[10px] capitalize h-5">{c.author_role}</Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm">{c.comment_text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LoanComments;
