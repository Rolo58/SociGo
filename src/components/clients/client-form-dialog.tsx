import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/form-field';
import { useStore } from '@/lib/store';
import type { Client, ClientInput } from '@/lib/types';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved?: (client: Client) => void;
}

const EMPTY: ClientInput = {
  client_name: '',
  business_name: '',
  email: '',
  profile_image_url: null,
};

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: ClientFormDialogProps) {
  const { createClient, updateClient, notify } = useStore();
  const [form, setForm] = React.useState<ClientInput>(EMPTY);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      client
        ? {
            client_name: client.client_name,
            business_name: client.business_name,
            email: client.email,
            profile_image_url: client.profile_image_url,
          }
        : EMPTY,
    );
  }, [open, client]);

  const update = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.client_name.trim().length < 2) next.client_name = 'Enter the contact name.';
    if (form.business_name.trim().length < 2) next.business_name = 'Enter the business name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    const result = client ? await updateClient(client.id, form) : await createClient(form);
    setBusy(false);

    if (!result.ok) {
      notify({ tone: 'error', title: 'Could not save the client', description: result.error });
      return;
    }

    notify({
      tone: 'success',
      title: client ? 'Client updated' : 'Client added',
      description: `${result.data.business_name} is ready for posts.`,
    });
    onSaved?.(result.data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{client ? 'Edit client' : 'Add new client'}</DialogTitle>
            <DialogDescription>
              {client
                ? 'Update the contact details for this client workspace.'
                : 'Create a client workspace to group their content and review links.'}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <FormField label="Client name" htmlFor="client-name" required error={errors.client_name}>
              <Input
                id="client-name"
                value={form.client_name}
                onChange={(e) => update('client_name', e.target.value)}
                placeholder="e.g. Daniel Okafor"
                autoComplete="off"
                maxLength={80}
              />
            </FormField>

            <FormField label="Business name" htmlFor="client-business" required error={errors.business_name}>
              <Input
                id="client-business"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                placeholder="e.g. Fernwood Coffee"
                autoComplete="off"
                maxLength={120}
              />
            </FormField>

            <FormField
              label="Email address"
              htmlFor="client-email"
              required
              error={errors.email}
              hint="Used to send review links. Only you can see this address."
            >
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="name@business.com"
                autoComplete="off"
              />
            </FormField>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {client ? 'Save changes' : 'Add client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
