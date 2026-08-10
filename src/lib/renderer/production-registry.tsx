/**
 * AWIE V2 — Production Section Registry.
 *
 * This is the ONLY place that maps a ThemeConfig section (type + content +
 * settings.variant) to a real, visible React component. It is the concrete
 * implementation of the Renderer pillar:
 *
 *   DESIGN DECISION → ThemeConfig → RENDER
 *
 * The Renderer NEVER judges. It consumes the ThemeConfig:
 *   - section.type            → which component to render.
 *   - section.content         → the AI-generated copy (title, body, items...).
 *   - section.settings.variant → the Design Intelligence variant (hero, gallery,
 *                                services, about, contact, booking, ...).
 *   - theme tokens            → colors, spacing, typography, radius.
 *
 * Every component has a fallback so no ThemeConfig can produce a white screen.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It renders
 * whatever the ThemeConfig describes. It never branches on industry, intent, or
 * business semantics.
 *
 * SERVER COMPONENTS: The section components in this module are pure
 * presentational components — they use no hooks and only consume `section` and
 * `theme` props. They are valid Server Components and are server-rendered for
 * the initial HTML (Edge runtime + SSR preserved). The server-safe registry
 * factory lives in production-registry.ts and references these components.
 */
import * as React from 'react';

import type { SectionComponent } from './types';
import type { SectionRegistry } from './registry';
import { DefaultSectionRegistry } from './registry';



/** A small helper to read a string from a section's content record. */
function str(value: unknown, fallback: unknown = ''): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback;
  }
  return '';
}


/** A small helper to read a string array from a section's content record. */
function strArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

/** A small helper to read an items array (objects with title/body) from content. */
function itemArray(value: unknown): { title: string; body: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      title: str(item.title),
      body: str(item.body),
    }))
    .filter((item) => item.title.length > 0 || item.body.length > 0);
}

/** The default hero variant when none is present. */
const DEFAULT_HERO_VARIANT = 'CENTERED';

/**
 * Hero section renderer.
 *
 * Consumes `section.settings.variant` (CENTERED / SPLIT / IMAGE_FOCUS /
 * TEXT_FOCUS / MINIMAL / CTA_FOCUS) and `section.content` (title, subtitle,
 * body, ctaLabel, ctaHref, imageUrl). Each variant produces a structurally
 * different hero so different businesses do not look identical.
 */
export const HeroSection: SectionComponent = ({ section, theme }) => {
  const variant = str(section.settings?.variant as string | undefined, DEFAULT_HERO_VARIANT);

  const title = str(section.content.title, '환영합니다');
  const subtitle = str(section.content.subtitle, section.content.body);
  const ctaLabel = str(section.content.ctaLabel, '문의하기');
  const ctaHref = str(section.content.ctaHref, '/contact');
  const imageUrl = str(section.content.imageUrl, '/banner.jpg');

  const base: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: theme.spacing.xl,
    boxSizing: 'border-box',
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: theme.typography.headingFont,
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    lineHeight: 1.15,
    margin: 0,
    fontWeight: 700,
  };

  const subStyle: React.CSSProperties = {
    fontFamily: theme.typography.font,
    fontSize: '1.125rem',
    lineHeight: 1.6,
    opacity: 0.85,
    maxWidth: '42rem',
    margin: '1rem 0 0',
  };

  const ctaStyle: React.CSSProperties = {
    display: 'inline-block',
    marginTop: '1.75rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: theme.colors.primary,
    color: '#ffffff',
    borderRadius: theme.radius.md,
    textDecoration: 'none',
    fontWeight: 600,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '560px',
    borderRadius: theme.radius.lg,
    objectFit: 'cover',
    aspectRatio: '4 / 3',
  };

  // CENTERED — text centered, image below.
  if (variant === 'CENTERED') {
    return (
      <section data-awie-hero={variant} style={{ ...base, textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={headingStyle}>{title}</h1>
          <p style={{ ...subStyle, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</p>
          <a href={ctaHref} style={ctaStyle}>{ctaLabel}</a>
          <div style={{ marginTop: '2.5rem' }}>
            <img src={imageUrl} alt="" style={imageStyle} />
          </div>
        </div>
      </section>
    );
  }

  // SPLIT — text left, image right.
  if (variant === 'SPLIT') {
    return (
      <section data-awie-hero={variant} style={base}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: theme.spacing.lg,
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={headingStyle}>{title}</h1>
            <p style={subStyle}>{subtitle}</p>
            <a href={ctaHref} style={ctaStyle}>{ctaLabel}</a>
          </div>
          <img src={imageUrl} alt="" style={imageStyle} />
        </div>
      </section>
    );
  }

  // IMAGE_FOCUS — image dominant, text overlaid.
  if (variant === 'IMAGE_FOCUS') {
    return (
      <section
        data-awie-hero={variant}
        style={{
          ...base,
          position: 'relative',
          padding: 0,
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <img
          src={imageUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'relative',
            padding: theme.spacing.xl,
            color: '#ffffff',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            width: '100%',
          }}
        >
          <h1 style={headingStyle}>{title}</h1>
          <p style={subStyle}>{subtitle}</p>
          <a href={ctaHref} style={ctaStyle}>{ctaLabel}</a>
        </div>
      </section>
    );
  }

  // TEXT_FOCUS — typography-led, no image.
  if (variant === 'TEXT_FOCUS') {
    return (
      <section data-awie-hero={variant} style={{ ...base, textAlign: 'center' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <h1 style={headingStyle}>{title}</h1>
          <p style={{ ...subStyle, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</p>
          <a href={ctaHref} style={ctaStyle}>{ctaLabel}</a>
        </div>
      </section>
    );
  }

  // MINIMAL — restrained, editorial.
  if (variant === 'MINIMAL') {
    return (
      <section data-awie-hero={variant} style={{ ...base, paddingTop: theme.spacing.xl }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{ ...headingStyle, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>{title}</h1>
          <p style={subStyle}>{subtitle}</p>
        </div>
      </section>
    );
  }

  // CTA_FOCUS — action-led hero.
  if (variant === 'CTA_FOCUS') {
    return (
      <section data-awie-hero={variant} style={{ ...base, textAlign: 'center' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <h1 style={headingStyle}>{title}</h1>
          <p style={{ ...subStyle, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</p>
          <a
            href={ctaHref}
            style={{
              ...ctaStyle,
              fontSize: '1.125rem',
              padding: '1rem 2.25rem',
              backgroundColor: theme.colors.primary,
            }}
          >
            {ctaLabel}
          </a>
        </div>
      </section>
    );
  }

  // Fallback — CENTERED.
  return (
    <section data-awie-hero="fallback" style={{ ...base, textAlign: 'center' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={headingStyle}>{title}</h1>
        <p style={{ ...subStyle, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</p>
      </div>
    </section>
  );
};

/**
 * Text section renderer.
 *
 * Renders a heading + body. Consumes `section.content` (title, body).
 */
export const TextSection: SectionComponent = ({ section, theme }) => {
  const title = str(section.content.title, '소개');
  const body = str(section.content.body, section.content.text);
  return (
    <section
      data-awie-section="text"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        padding: theme.spacing.xl,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: theme.typography.headingFont, fontSize: '1.75rem', margin: '0 0 1rem' }}>
          {title}
        </h2>
        <p style={{ fontFamily: theme.typography.font, lineHeight: 1.7, opacity: 0.9, margin: 0 }}>
          {body}
        </p>
      </div>
    </section>
  );
};

/**
 * Gallery section renderer.
 *
 * Consumes `section.settings.variant` (GRID / FEATURED / MASONRY / HORIZONTAL)
 * and `section.content` (title, items[]). Each variant lays out the images
 * differently.
 */
export const GallerySection: SectionComponent = ({ section, theme }) => {
  const variant = str(section.settings?.variant as string | undefined, 'GRID');

  const title = str(section.content.title, 'Gallery');
  const items = itemArray(section.content.items);
  const images = strArray(section.content.images);

  const cardStyle: React.CSSProperties = {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.secondary,
    color: theme.colors.text,
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  const renderItem = (item: { title: string; body: string }, index: number) => (
    <figure key={index} style={cardStyle}>
      <div style={{ aspectRatio: '4 / 3', overflow: 'hidden' }}>
        <img src={images[index] || '/banner.jpg'} alt={item.title} style={imgStyle} />
      </div>
      <figcaption style={{ padding: theme.spacing.md }}>
        <strong style={{ fontFamily: theme.typography.headingFont }}>{item.title}</strong>
        {item.body ? (
          <p style={{ margin: '0.5rem 0 0', opacity: 0.85, fontSize: '0.9rem' }}>{item.body}</p>
        ) : null}
      </figcaption>
    </figure>
  );

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: theme.spacing.md,
  };

  return (
    <section
      data-awie-gallery={variant}
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        padding: theme.spacing.xl,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: theme.typography.headingFont, fontSize: '1.75rem', margin: '0 0 1.5rem' }}>
          {title}
        </h2>
        {variant === 'HORIZONTAL' ? (
          <div style={{ display: 'flex', gap: theme.spacing.md, overflowX: 'auto' }}>
            {items.map((item, i) => (
              <div key={i} style={{ minWidth: '280px', flex: '0 0 auto' }}>
                {renderItem(item, i)}
              </div>
            ))}
          </div>
        ) : (
          <div style={gridStyle}>
            {items.map((item, i) => renderItem(item, i))}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Features / Services section renderer.
 *
 * Consumes `section.settings.variant` (CARD_GRID / LIST / FEATURED) and
 * `section.content` (title, items[]).
 */
export const FeaturesSection: SectionComponent = ({ section, theme }) => {
  const variant = str(section.settings?.variant, 'CARD_GRID');
  const title = str(section.content.title, 'Services');
  const items = itemArray(section.content.items);

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    boxSizing: 'border-box',
  };

  return (
    <section
      data-awie-features={variant}
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        padding: theme.spacing.xl,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: theme.typography.headingFont, fontSize: '1.75rem', margin: '0 0 1.5rem' }}>
          {title}
        </h2>
        {variant === 'LIST' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            {items.map((item, i) => (
              <div key={i} style={{ ...cardStyle, display: 'flex', gap: theme.spacing.md, alignItems: 'flex-start' }}>
                <strong style={{ fontFamily: theme.typography.headingFont, minWidth: '140px' }}>{item.title}</strong>
                <p style={{ margin: 0, opacity: 0.9 }}>{item.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: theme.spacing.md,
            }}
          >
            {items.map((item, i) => (
              <div key={i} style={cardStyle}>
                <strong style={{ fontFamily: theme.typography.headingFont, fontSize: '1.1rem' }}>{item.title}</strong>
                <p style={{ margin: '0.5rem 0 0', opacity: 0.9 }}>{item.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Testimonials section renderer.
 *
 * Consumes `section.content` (title, items[]).
 */
export const TestimonialsSection: SectionComponent = ({ section, theme }) => {
  const title = str(section.content.title, '고객 이야기');
  const items = itemArray(section.content.items);
  return (
    <section
      data-awie-section="testimonials"
      style={{
        backgroundColor: theme.colors.secondary,
        color: theme.colors.text,
        padding: theme.spacing.xl,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: theme.typography.headingFont, fontSize: '1.75rem', margin: '0 0 1.5rem' }}>
          {title}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: theme.spacing.md,
          }}
        >
          {items.map((item, i) => (
            <blockquote
              key={i}
              style={{
                margin: 0,
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.background,
                borderRadius: theme.radius.md,
                fontStyle: 'italic',
              }}
            >
              <p style={{ margin: 0 }}>“{item.body}”</p>
              <footer style={{ marginTop: '0.75rem', fontWeight: 600, fontStyle: 'normal' }}>
                — {item.title}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * CTA / Booking section renderer.
 *
 * Consumes `section.settings.variant` (CTA / BOOKING_CARD / PROMINENT_ACTION)
 * and `section.content` (title, body, ctaLabel, ctaHref).
 */
export const CtaSection: SectionComponent = ({ section, theme }) => {
  const variant = str(section.settings?.variant as string | undefined, 'CTA');

  const title = str(section.content.title, '지금 시작하세요');
  const body = str(section.content.body, section.content.subtitle);
  const ctaLabel = str(section.content.ctaLabel, '예약하기');
  const ctaHref = str(section.content.ctaHref, '/contact');

  const ctaStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '0.9rem 2rem',
    backgroundColor: theme.colors.primary,
    color: '#ffffff',
    borderRadius: theme.radius.md,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '1.05rem',
  };

  return (
    <section
      data-awie-cta={variant}
      style={{
        backgroundColor: theme.colors.primary,
        color: '#ffffff',
        padding: theme.spacing.xl,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: theme.typography.headingFont, fontSize: '2rem', margin: '0 0 0.75rem' }}>
          {title}
        </h2>
        {body ? <p style={{ opacity: 0.9, lineHeight: 1.6, margin: '0 0 1.5rem' }}>{body}</p> : null}
        <a
          href={ctaHref}
          style={{
            ...ctaStyle,
            backgroundColor: '#ffffff',
            color: theme.colors.primary,
          }}
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
};

/**
 * Contact section renderer.
 *
 * Consumes `section.settings.variant` (INFO / FORM / INFO_FORM) and
 * `section.content` (title, body, email, phone, address).
 */
export const ContactSection: SectionComponent = ({ section, theme }) => {
  const variant = str(section.settings?.variant as string | undefined, 'INFO_FORM');

  const title = str(section.content.title, 'Contact');
  const body = str(section.content.body, '문의는 아래로 부탁드립니다.');
  const email = str(section.content.email);
  const phone = str(section.content.phone);
  const address = str(section.content.address);

  const infoStyle: React.CSSProperties = {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
  };

  return (
    <section
      data-awie-contact={variant}
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        padding: theme.spacing.xl,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: theme.typography.headingFont, fontSize: '1.75rem', margin: '0 0 1rem' }}>
          {title}
        </h2>
        <p style={{ opacity: 0.9, margin: '0 0 1.5rem' }}>{body}</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: theme.spacing.md,
          }}
        >
          <div style={infoStyle}>
            {email ? (
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Email</strong>
                <br />
                {email}
              </p>
            ) : null}
            {phone ? (
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Phone</strong>
                <br />
                {phone}
              </p>
            ) : null}
            {address ? (
              <p style={{ margin: 0 }}>
                <strong>Address</strong>
                <br />
                {address}
              </p>
            ) : null}
          </div>
          {variant !== 'INFO' ? (
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="text"
                placeholder="이름"
                style={{ padding: '0.6rem 0.75rem', borderRadius: theme.radius.sm, border: '1px solid rgba(0,0,0,0.15)' }}
              />
              <input
                type="email"
                placeholder="이메일"
                style={{ padding: '0.6rem 0.75rem', borderRadius: theme.radius.sm, border: '1px solid rgba(0,0,0,0.15)' }}
              />
              <textarea
                placeholder="메시지"
                rows={4}
                style={{ padding: '0.6rem 0.75rem', borderRadius: theme.radius.sm, border: '1px solid rgba(0,0,0,0.15)' }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.7rem 1.25rem',
                  backgroundColor: theme.colors.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: theme.radius.md,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                보내기
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
};

/**
 * Footer section renderer.
 *
 * Consumes `section.content` (title, body).
 */
export const FooterSection: SectionComponent = ({ section, theme }) => {
  const title = str(section.content.title, 'Footer');
  const body = str(section.content.body, '');
  return (
    <footer
      data-awie-section="footer"
      style={{
        backgroundColor: theme.colors.secondary,
        color: theme.colors.text,
        padding: theme.spacing.lg,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <strong style={{ fontFamily: theme.typography.headingFont }}>{title}</strong>
        {body ? <p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>{body}</p> : null}
      </div>
    </footer>
  );
};

/**
 * The production section registry.
 *
 * Registers every section type the ThemeConfig can describe. Unknown types fall
 * back to GenericSection (which preserves layout spacing and never white-screens).
 *
 * This module is server-safe (no 'use client', no hooks), so this factory can be
 * invoked directly from Server Components (the public site pages).
 */
export function createProductionRegistry(): SectionRegistry {
  const registry = new DefaultSectionRegistry();
  registry.register('hero', HeroSection, { version: '1.0.0', capabilities: ['a11y'] });
  registry.register('text', TextSection, { version: '1.0.0', capabilities: ['a11y'] });
  registry.register('gallery', GallerySection, { version: '1.0.0', capabilities: ['a11y'] });
  registry.register('features', FeaturesSection, { version: '1.0.0', capabilities: ['a11y'] });
  registry.register('testimonials', TestimonialsSection, { version: '1.0.0', capabilities: ['a11y'] });
  registry.register('cta', CtaSection, { version: '1.0.0', capabilities: ['a11y'] });
  registry.register('contact', ContactSection, { version: '1.0.0', capabilities: ['a11y'] });
  registry.register('footer', FooterSection, { version: '1.0.0', capabilities: ['a11y'] });
  return registry;
}

