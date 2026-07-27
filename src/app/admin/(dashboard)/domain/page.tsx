import { DomainManager } from '@/components/admin/domain/DomainManager';

export default function DomainPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Custom Domain
        </h1>
        <p className="mt-2 text-stone-600">
          Connect and manage your custom domain.
        </p>
      </div>
      <DomainManager />
    </div>
  );
}
