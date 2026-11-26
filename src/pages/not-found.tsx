import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <Card className="w-full">
        <EmptyState
          icon={<FileQuestion />}
          title="Page not found"
          description="The page you are looking for does not exist or has moved."
          action={
            <Button asChild size="sm">
              <Link to="/app">Back to dashboard</Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
