import { Link } from 'react-router';
import {
  CONTACT_URL,
  ExternalLink,
  LegalPage,
  LegalSection,
} from 'src/components/legal/legal-page';
import { config } from 'src/config';

export function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title={
        <>
          Your library is <em>yours</em>.
        </>
      }
      intro="norsumi turns your screenshots, links and notes into an organized library. This policy explains, in plain English, what we collect, how it is processed and how you can delete it."
    >
      <LegalSection title="Who we are">
        <p>
          norsumi is run by an individual developer based in Brazil. The code is
          open source and available on{' '}
          <ExternalLink href={config.githubUrl}>GitHub</ExternalLink>. For any
          privacy question or request, contact us through{' '}
          <ExternalLink href={CONTACT_URL}>GitHub issues</ExternalLink>.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <ul>
          <li>
            <strong>Account details:</strong> your name and email address. If
            you sign in with Google, we also receive your Google profile
            picture.
          </li>
          <li>
            <strong>Content you save:</strong> screenshots and images you
            upload, links you share, and notes you write.
          </li>
          <li>
            <strong>Data derived from your content:</strong> titles, summaries,
            categories, tags, text read from images, things mentioned in them
            (such as places or accounts), and search embeddings that let you
            search by meaning.
          </li>
          <li>
            <strong>Minimal technical data:</strong> your IP address, used for
            rate limiting and security.
          </li>
        </ul>
        <p>
          The Android app only uploads images from your Screenshots folder when
          you turn on auto-capture, plus anything you explicitly share to
          norsumi. It does not read the rest of your photos.
        </p>
      </LegalSection>

      <LegalSection title="How your data is processed">
        <ul>
          <li>
            Your account and library data are stored in a MongoDB database.
          </li>
          <li>
            Files are encrypted with <strong>AES-256-GCM</strong>, using a key
            unique to your account, before they are stored in S3-compatible
            object storage (Backblaze B2). The storage only ever holds encrypted
            data.
          </li>
          <li>
            To title, summarize and categorize your items, their content is sent
            to AI models through <strong>OpenRouter</strong>, with{' '}
            <strong>
              Zero Data Retention enforced and data collection denied
            </strong>
            . The model providers do not keep your content or train on it.
          </li>
          <li>
            Google Sign-In only requests your basic profile: openid, email and
            profile.
          </li>
          <li>All traffic is encrypted in transit with HTTPS.</li>
        </ul>
        <p>
          To be clear: this is{' '}
          <strong>server-side encryption, not end-to-end</strong>. Our server
          must decrypt an image to show it to you and to let the AI read it. If
          you need the keys to be yours alone, you can host norsumi yourself.
        </p>
      </LegalSection>

      <LegalSection title="What we don't do">
        <ul>
          <li>No ads.</li>
          <li>No tracking or analytics cookies.</li>
          <li>We never sell your data or share it for marketing.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Service providers">
        <p>
          We rely on a small number of providers to run norsumi. They process
          data only on our behalf:
        </p>
        <ul>
          <li>
            <strong>Cloudflare</strong>: network delivery and protection
          </li>
          <li>
            <strong>Backblaze</strong>: encrypted file storage
          </li>
          <li>
            <strong>MongoDB Atlas</strong>: database
          </li>
          <li>
            <strong>OpenRouter</strong>: AI routing, with Zero Data Retention
          </li>
          <li>
            <strong>Google</strong>: sign-in, if you choose it
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Retention and deletion">
        <p>
          We keep your data until you delete it. Deleting an item removes it and
          its files. In <Link to="/settings">Settings → Delete account</Link>{' '}
          you can delete your account at any time: all items, files, categories
          and sessions are removed immediately. Residual database backups expire
          within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          You can access, correct and delete your data directly in the app. For
          anything else, including questions under data protection laws such as
          Brazil's LGPD or the GDPR, contact us through{' '}
          <ExternalLink href={CONTACT_URL}>GitHub issues</ExternalLink>.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>norsumi is not intended for children under 13.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If we change this policy, we will update the date above. For
          significant changes, we will let you know in the app.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
