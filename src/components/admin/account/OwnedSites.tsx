'use client';

import { Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Site {
  id: string;
  name: string;
  domain: string;
  role: string;
}

const mockSites: Site[] = [
  {
    id: '1',
    name: 'Kim Gyung Hoon Studio',
    domain: 'example.com',
    role: 'Owner',
  },
];

export function OwnedSites() {
  return (
    <Card className="space-y-4">
      <h2 className="font-serif text-lg font-semibold text-stone-950">
        Owned Sites
      </h2>
      {mockSites.length === 0 ? (
        <p className="text-sm text-stone-500">No owned sites yet.</p>
      ) : (
        <ul className="divide-y divide-stone-200">
          {mockSites.map((site) => (
            <li
              key={site.id}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <Globe
                  className="size-5 text-stone-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium text-stone-950">{site.name}</p>
                  <p className="text-xs text-stone-500">{site.domain}</p>
                </div>
              </div>
              <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                {site.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
