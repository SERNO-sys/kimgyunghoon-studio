import Image from 'next/image';

interface HeroProps {
  id?: string;
  siteName: string;
  description: string;
  imageUrl?: string;
  themeColors?: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
}

export function Hero({
  id,
  siteName,
  description,
  imageUrl,
  themeColors,
}: HeroProps) {
  return (
    <section
      id={id}
      className="border-b border-stone-200"
      style={
        themeColors ? { backgroundColor: themeColors.background } : undefined
      }
    >

      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:gap-16 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
            {siteName}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
            {description}
          </p>
        </div>
        {imageUrl ? (
          <div className="overflow-hidden rounded-sm border border-stone-300 bg-stone-950 shadow-sm">
            <Image
              alt={`${siteName} hero image`}
              className="aspect-[16/9] w-full object-cover"
              height={1024}
              priority
              src={imageUrl}
              width={1024}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
