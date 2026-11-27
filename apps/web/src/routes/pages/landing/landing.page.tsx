import { Sparkles } from 'lucide-react';
import { CategoryMarquee } from 'src/components/landing/category-marquee';
import { FeatureAi } from 'src/components/landing/feature-ai';
import { FeatureCapture } from 'src/components/landing/feature-capture';
import { FeatureOpenSource } from 'src/components/landing/feature-open-source';
import { FeaturePrivacy } from 'src/components/landing/feature-privacy';
import { FeatureSearch } from 'src/components/landing/feature-search';
import { FinalCta } from 'src/components/landing/final-cta';
import { Hero } from 'src/components/landing/hero';
import { LandingFooter } from 'src/components/landing/landing-footer';
import { LandingNav } from 'src/components/landing/landing-nav';
import { Accent, SectionHeading } from 'src/components/landing/primitives';

export function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
      <LandingNav />
      <main>
        <Hero />
        <CategoryMarquee />

        <section
          id="features"
          className="mx-auto max-w-6xl scroll-mt-24 px-3 pt-20 pb-6 sm:px-6 sm:pt-28"
        >
          <SectionHeading
            eyebrow="How it works"
            icon={<Sparkles />}
            title={
              <>
                Your camera roll, <Accent>finally</Accent> organized.
              </>
            }
            className="mb-14 sm:mb-20"
          >
            Capture without thinking. norsumi reads, names and files every
            screenshot, link and note, so the library builds itself.
          </SectionHeading>

          <div className="flex flex-col gap-5">
            <FeatureCapture />
            <FeatureAi />
            <FeatureSearch />
          </div>
        </section>

        <section
          id="privacy"
          className="mx-auto max-w-6xl scroll-mt-24 px-3 pt-20 sm:px-6 sm:pt-28"
        >
          <FeaturePrivacy />
        </section>

        <section
          id="open-source"
          className="mx-auto max-w-6xl scroll-mt-24 px-3 pt-5 sm:px-6"
        >
          <FeatureOpenSource />
        </section>

        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
