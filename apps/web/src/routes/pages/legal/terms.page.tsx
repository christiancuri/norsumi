import {
  CONTACT_URL,
  ExternalLink,
  LegalPage,
  LegalSection,
} from 'src/components/legal/legal-page';
import { config } from 'src/config';

export function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Service"
      title={
        <>
          The <em>simple</em> terms.
        </>
      }
      intro="These terms apply when you use the hosted norsumi service on this website and in the Android app. By creating an account or using norsumi, you agree to them."
    >
      <LegalSection title="The service">
        <p>
          norsumi stores your screenshots, links and notes and organizes them
          with AI. It is run by an individual developer in Brazil and is
          provided <strong>“as is”</strong>, without warranties of any kind.
          AI-generated titles, summaries and categories can be wrong, so don't
          rely on them for anything important.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          Keep your sign-in details safe; you are responsible for activity on
          your account. You can delete your account at any time from Settings.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You own everything you save. You grant us only the limited license
          needed to operate the service for you: to store, encrypt, process with
          AI, and display your content back to you. We don't use it for anything
          else.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <ul>
          <li>Don't upload or share illegal content.</li>
          <li>
            Don't abuse the service, including using automation to exhaust AI
            processing or storage limits.
          </li>
          <li>Don't try to break, overload or get around its security.</li>
        </ul>
        <p>
          Rate limits and quotas apply. We may suspend or close accounts that
          abuse the service.
        </p>
      </LegalSection>

      <LegalSection title="Open source">
        <p>
          The norsumi code is licensed under the{' '}
          <ExternalLink href={`${config.githubUrl}/blob/main/LICENSE`}>
            GNU AGPL-3.0
          </ExternalLink>
          . That license covers the code; these terms cover your use of the
          hosted service. You are free to run your own instance under the AGPL.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, norsumi is not liable for any
          indirect or consequential damages, or for any loss of data, arising
          from your use of the service. Keep your own copies of anything you
          can't afford to lose.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>These terms are governed by the laws of Brazil.</p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update these terms; the date above shows the latest version,
          and we will tell you in the app about significant changes. Questions?
          Reach us through{' '}
          <ExternalLink href={CONTACT_URL}>GitHub issues</ExternalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
