'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';

export function DeleteAccount() {
  const toast = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const handleDelete = () => {
    if (confirmation !== 'DELETE') {
      return;
    }
    toast.addToast('Account deletion requested. (Mock)', 'success');
    setIsConfirming(false);
    setConfirmation('');
  };

  return (
    <Card className="space-y-4 border-red-100">
      <h2 className="font-serif text-lg font-semibold text-red-900">
        Danger Zone
      </h2>
      <p className="text-sm text-stone-600">
        Deleting your account is irreversible. Please proceed with caution.
      </p>
      {!isConfirming ? (
        <Button
          variant="secondary"
          className="border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => setIsConfirming(true)}
        >
          Delete Account
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-red-700">
            Type DELETE to confirm account deletion.
          </p>
          <Label htmlFor="delete-confirm">Confirmation</Label>
          <Input
            id="delete-confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE"
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsConfirming(false);
                setConfirmation('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-700 hover:bg-red-800"
              disabled={confirmation !== 'DELETE'}
              onClick={handleDelete}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
