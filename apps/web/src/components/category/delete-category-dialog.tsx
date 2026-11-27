import type { Category } from '@norsumi/common';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'src/components/ui/alert-dialog';
import { errorMessage } from 'src/lib/axios';
import { useDeleteCategory } from 'src/queries/categories.queries';

export function DeleteCategoryDialog({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const remove = useDeleteCategory();
  const navigate = useNavigate();
  const { categoryId } = useParams();

  const confirm = () => {
    if (!category) return;
    remove.mutate(category.id, {
      onSuccess: () => toast.success(`${category.name} deleted`),
      onError: (err) => toast.error(errorMessage(err)),
    });
    if (categoryId === category.id) navigate('/library', { replace: true });
    onClose();
  };

  return (
    <AlertDialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display font-normal text-3xl">
            Delete {category?.emoji} {category?.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {category?.parentId
              ? 'Items inside it stay in your library, just uncategorized.'
              : 'Its topics are deleted too. Items inside stay in your library, just uncategorized.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} variant="destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
