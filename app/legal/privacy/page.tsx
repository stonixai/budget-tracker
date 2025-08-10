import Link from 'next/link'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card variant="elevated">
          <CardHeader className="text-center bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-primary-100 mt-2">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          
          <CardBody className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
              <p className="text-gray-700 mb-4">
                We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Name and email address</li>
                <li>Account credentials (encrypted passwords)</li>
                <li>Financial data you choose to input (transactions, budgets, goals)</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Technical Information</h3>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Device information and browser type</li>
                <li>IP address and location data (for security purposes)</li>
                <li>Usage patterns and feature interactions</li>
                <li>Session data and timestamps</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">
                We use the information we collect to provide, maintain, and improve our services:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Provide and personalize the Budget Tracker service</li>
                <li>Process transactions and maintain account security</li>
                <li>Send important service updates and security notifications</li>
                <li>Analyze usage to improve our features and user experience</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We may share information with trusted third-party service providers who assist us in operating our service, conducting business, or serving users, provided they agree to keep this information confidential.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose information when required by law, regulation, legal process, or governmental request, or to protect our rights, property, or safety.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of the transaction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement robust security measures to protect your information:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>End-to-end encryption for sensitive financial data</li>
                <li>Secure HTTPS connections for all data transmission</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Limited access controls and employee training</li>
                <li>Secure data centers with physical access controls</li>
                <li>Regular backups with encryption at rest</li>
              </ul>
              <p className="text-gray-700 mb-4">
                While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Privacy Rights</h2>
              <p className="text-gray-700 mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a structured format</li>
                <li><strong>Objection:</strong> Object to certain processing of your data</li>
                <li><strong>Restriction:</strong> Request limitation of data processing</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise these rights, please contact us at privacy@budgettracker.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your information only as long as necessary to provide our services and comply with legal obligations:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Account information: Retained while your account is active</li>
                <li>Financial data: Retained for up to 7 years after account closure (for regulatory compliance)</li>
                <li>Technical logs: Retained for up to 12 months</li>
                <li>Support communications: Retained for up to 3 years</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies to enhance your experience:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Essential Cookies</h3>
              <p className="text-gray-700 mb-4">
                Required for basic functionality, including authentication and security features.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Analytics Cookies</h3>
              <p className="text-gray-700 mb-4">
                Help us understand how you use our service to improve user experience (with your consent).
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Preference Cookies</h3>
              <p className="text-gray-700 mb-4">
                Remember your settings and preferences for a personalized experience.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Budget Tracker is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the service after any changes constitutes acceptance of the new Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <ul className="list-none text-gray-700 mb-4 space-y-2">
                <li><strong>Email:</strong> privacy@budgettracker.com</li>
                <li><strong>Support:</strong> support@budgettracker.com</li>
                <li><strong>Data Protection Officer:</strong> dpo@budgettracker.com</li>
              </ul>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200 text-center">
              <Link 
                href="/auth/signup" 
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Back to Sign Up
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}