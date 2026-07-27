'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function ExportAccountData() {
  const handleExport = () => {
    const data = {
      account: {
        displayName: 'Current User',
        email: 'user@example.com',
        newsletter: true,
      },
      sites: [
        {
          id: '1',
          name: 'Kim Gyung Hoon Studio',
          domain: 'example.com',
        },
      ],
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `account-data-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="space-y-4">
      <h2 className="font-serif text-lg font-semibold text-stone-950">
        Export Account Data
      </h2>
      <p className="text-sm text-stone-600">
        Download a copy of your account information.
      </p>
      <Button variant="secondary" onClick={handleExport}>
        Export Data
      </Button>
    </Card>
  );
}
