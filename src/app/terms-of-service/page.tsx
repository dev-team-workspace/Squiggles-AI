// src/app/terms-of-service/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Squiggles',
  description: 'Read the Squiggles Terms of Service.',
};

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8 text-center">Terms of Service</h1>
      
      <section className="space-y-6 text-muted-foreground">
        <p className="italic">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <h2 className="text-2xl font-semibold text-foreground pt-4">1. Acceptance of Terms</h2>
        <p>By accessing and using Squiggles (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using this Service, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this Service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this Service.</p>

        <h2 className="text-2xl font-semibold text-foreground pt-4">2. Description of Service</h2>
        <p>Squiggles provides users with tools to create digital drawings ("Original Drawings") and then uses Artificial Intelligence (AI) to transform these drawings into new artistic interpretations ("Transformed Images"). The Service also allows users to save their creations, manage a personal gallery, and optionally publish their Transformed Images to a public gallery.</p>

        <h2 className="text-2xl font-semibold text-foreground pt-4">3. User Accounts</h2>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>
            <strong>Eligibility:</strong> To create an account and purchase credits, you must be at least 18 years old or the age of majority in your jurisdiction. If users are children, a parent or legal guardian must create and manage the account and any purchases.
          </li>
          <li>
            <strong>Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password.
          </li>
          <li>
            <strong>Accuracy of Information:</strong> You agree to provide true, accurate, current, and complete information about yourself as prompted by the Service's registration form.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground pt-4">4. User-Generated Content</h2>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>
            <strong>Ownership:</strong> You retain all ownership rights to the Original Drawings you create and upload to the Service.
          </li>
          <li>
            <strong>License to Squiggles:</strong> By submitting content (Original Drawings) to the Service for transformation, you grant Squiggles a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of (such as the Transformed Images), display, and perform the content in connection with the Service and Squiggles' (and its successors' and affiliates') business, including for promoting and redistributing part or all of the Service. If you publish content to the Public Gallery, you grant Squiggles the right to display this content publicly.
          </li>
          <li>
            <strong>Content Restrictions:</strong> You agree not to upload or create content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable.
          </li>
          <li>
            <strong>Content Moderation:</strong> We reserve the right, but not the obligation, to monitor and review content submitted to the Service, especially content intended for the Public Gallery. We may remove or refuse to publish any content for any or no reason, including content that we believe violates these Terms or our policies.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground pt-4">5. Use of AI Services</h2>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>You acknowledge that the transformation of drawings is performed by AI models. The quality, accuracy, and nature of the Transformed Images are dependent on the AI and the input provided.</li>
          <li>Squiggles makes no guarantees regarding the output of the AI services. Results may vary and may not always meet expectations.</li>
          <li>You agree to use the AI features responsibly and in accordance with any applicable AI service provider terms.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground pt-4">6. Credits and Payments</h2>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>The Service operates on a "credit" system. Users may receive a certain number of free credits upon registration. Additional credits must be purchased.</li>
          <li>Each AI transformation consumes one credit.</li>
          <li>All payments for credit packs are processed through our third-party payment processor (Stripe). Squiggles does not store your full payment card information.</li>
          <li>Credit purchases are non-refundable unless otherwise stated or required by law.</li>
          <li>Prices for credit packs are subject to change without notice.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground pt-4">7. Prohibited Conduct</h2>
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Violate any local, state, national, or international law.</li>
          <li>Infringe upon or violate our intellectual property rights or the intellectual property rights of others.</li>
          <li>Engage in any activity that interferes with or disrupts the Service.</li>
          <li>Attempt to gain unauthorized access to any part of the Service or its related systems or networks.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground pt-4">8. Intellectual Property of Squiggles</h2>
        <p>The Service and its original content (excluding User-Generated Content), features, and functionality are and will remain the exclusive property of Squiggles and its licensors. The Service is protected by copyright, trademark, and other laws of both the [Your Country/Jurisdiction] and foreign countries.</p>

        <h2 className="text-2xl font-semibold text-foreground pt-4">9. Disclaimers and Limitation of Liability</h2>
        <p>THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. SQUIGGLES MAKES NO WARRANTIES, EXPRESSED OR IMPLIED, AND HEREBY DISCLAIMS AND NEGATES ALL OTHER WARRANTIES INCLUDING, WITHOUT LIMITATION, IMPLIED WARRANTIES OR CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT OF INTELLECTUAL PROPERTY OR OTHER VIOLATION OF RIGHTS.</p>
        <p>IN NO EVENT SHALL SQUIGGLES OR ITS SUPPLIERS BE LIABLE FOR ANY DAMAGES (INCLUDING, WITHOUT LIMITATION, DAMAGES FOR LOSS OF DATA OR PROFIT, OR DUE TO BUSINESS INTERRUPTION) ARISING OUT OF THE USE OR INABILITY TO USE THE MATERIALS ON SQUIGGLES' WEBSITE, EVEN IF SQUIGGLES OR A SQUIGGLES AUTHORIZED REPRESENTATIVE HAS BEEN NOTIFIED ORALLY OR IN WRITING OF THE POSSIBILITY OF SUCH DAMAGE.</p>

        <h2 className="text-2xl font-semibold text-foreground pt-4">10. Indemnification</h2>
        <p>You agree to indemnify, defend, and hold harmless Squiggles, its officers, directors, employees, agents, and third parties, for any losses, costs, liabilities, and expenses (including reasonable attorney's fees) relating to or arising out of your use of or inability to use the Service, any user postings made by you, your violation of any terms of this Agreement or your violation of any rights of a third party, or your violation of any applicable laws, rules or regulations.</p>

        <h2 className="text-2xl font-semibold text-foreground pt-4">11. Termination</h2>
        <p>We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>

        <h2 className="text-2xl font-semibold text-foreground pt-4">12. Governing Law</h2>
        <p>These Terms shall be governed and construed in accordance with the laws of [Your State/Country, e.g., "the State of California, United States"], without regard to its conflict of law provisions.</p>

        <h2 className="text-2xl font-semibold text-foreground pt-4">13. Changes to Terms</h2>
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.</p>
        
        <h2 className="text-2xl font-semibold text-foreground pt-4">14. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact Mr. Squiggles at:</p>
        <p>squiggles.ai@gmail.com</p>
      </section>
    </div>
  );
}
